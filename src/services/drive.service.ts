/**
 * drive.service.ts
 *
 * Single Responsibility: Google Drive file operations.
 *
 * Handles:
 *   - Searching the user's Drive for "Track Wise Data" spreadsheets
 *   - Creating a new blank spreadsheet document
 *
 * Does NOT handle:
 *   - Tab creation, headers, or seed data  (→ spreadsheet-initializer.ts)
 *   - OAuth or token management            (→ google-auth.service.ts)
 *   - Reading or writing cell data         (→ http-client.ts)
 *
 * WHY we use Drive API for search:
 *   Google Sheets API cannot list files. Only the Drive API can query the file
 *   index. This is the correct separation of concerns per Google's own docs.
 */

import { useAuthStore } from '../stores/authStore';

// ── Constants ────────────────────────────────────────────────────────────────

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const IS_DEV = import.meta.env.DEV;

/** The canonical name used for every user's personal workspace spreadsheet. */
export const SPREADSHEET_NAME = 'Track Wise Data';

// ── Internal Drive HTTP helper ────────────────────────────────────────────────

async function driveRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const { accessToken, isAuthenticated, logout } = useAuthStore.getState();

  if (!isAuthenticated()) {
    throw new Error('Not authenticated. Please sign in with Google.');
  }

  const headers = new Headers(options.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Content-Type', 'application/json');

  const method = (options.method ?? 'GET').toUpperCase();
  const res = await fetch(url, { ...options, headers });

  if (IS_DEV) {
    console.debug(`[DriveAPI] ${method} ${res.status} — ${url.split('?')[0].split('/').pop()}`);
  }

  if (res.status === 401) {
    logout();
    throw new Error('Your Google session has expired. Please sign in again.');
  }

  if (!res.ok) {
    const text = await res.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    const message = parsed?.error?.message ?? `Google Drive API error ${res.status}`;
    if (IS_DEV) console.error('[DriveAPI] Error:', parsed);
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Drive File Result types ───────────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

interface DriveFilesListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const driveService = {
  /**
   * Search the signed-in user's Google Drive for spreadsheets named
   * "Track Wise Data" that are not trashed.
   *
   * Uses the `drive.file` scope — only sees files created/opened by this app.
   *
   * Strategy:
   *   - If multiple files match (e.g. user duplicated the file), use the NEWEST one
   *     per the spec: "always use the newest one, never create duplicates"
   *   - Returns null if no matching file is found
   *
   * @returns The spreadsheetId of the matching file, or null
   */
  async findTrackWiseSpreadsheet(): Promise<string | null> {
    const query = [
      `name='${SPREADSHEET_NAME}'`,
      `mimeType='application/vnd.google-apps.spreadsheet'`,
      `trashed=false`,
    ].join(' and ');

    const fields = encodeURIComponent('files(id,name,createdTime)');
    // orderBy createdTime desc → first result is the newest
    const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${fields}&orderBy=createdTime+desc`;

    const data = await driveRequest<DriveFilesListResponse>(url);

    if (!data.files || data.files.length === 0) {
      if (IS_DEV) console.log('[Drive] No "Track Wise Data" spreadsheet found.');
      return null;
    }

    if (IS_DEV) {
      console.log(`[Drive] Found ${data.files.length} matching file(s). Using newest:`, data.files[0]);
    }

    // Return the newest file (first result due to desc ordering)
    return data.files[0].id;
  },

  /**
   * Create a new blank Google Spreadsheet document via the Sheets API.
   * Only creates the document — does NOT set up tabs, headers, or data.
   * Tab setup is the responsibility of spreadsheet-initializer.ts.
   *
   * @param title — The title to give the new spreadsheet
   * @returns The spreadsheetId of the newly created spreadsheet
   */
  async createSpreadsheet(title: string): Promise<string> {
    const { accessToken, isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated()) {
      throw new Error('Not authenticated. Please sign in with Google.');
    }

    const res = await fetch(SHEETS_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties: { title } }),
    });

    if (!res.ok) {
      const text = await res.text();
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { /* ignore */ }
      const message = parsed?.error?.message ?? `Failed to create spreadsheet: HTTP ${res.status}`;
      throw new Error(message);
    }

    const data = await res.json();
    const spreadsheetId: string = data.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error('Spreadsheet created but no ID was returned by the API.');
    }

    if (IS_DEV) console.log('[Drive] Created spreadsheet:', spreadsheetId);
    return spreadsheetId;
  },
};

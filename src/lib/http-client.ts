/**
 * http-client.ts
 *
 * Single Responsibility: Generic HTTP client wrapper for Google Sheets API v4.
 * Handles exponential backoff retries on rate limits (429) or transient server errors (5xx).
 */

import { useAuthStore } from '../stores/authStore';
import { SHEET_HEADERS } from '../constants/headers';
import { logger } from '../utils/logger';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// ── Column letter helper ─────────────────────────────────────────────────────

export function getColumnLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// ── Request helper with Exponential Backoff ──────────────────────────────────

interface SheetsResponse {
  values?: any[][];
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sheetsRequest<T>(
  url: string,
  options: RequestInit = {},
  retries = 3,
  delay = 1000
): Promise<T> {
  const { accessToken, logout, isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated()) {
    throw new Error('Not authenticated. Please sign in with Google.');
  }

  const headers = new Headers(options.headers ?? {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Content-Type', 'application/json');

  const method = (options.method ?? 'GET').toUpperCase();

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (netErr) {
    if (retries > 0) {
      logger.warn(`Network failure to ${url}. Retrying in ${delay}ms...`, netErr);
      await wait(delay);
      return sheetsRequest<T>(url, options, retries - 1, delay * 2);
    }
    throw netErr;
  }

  logger.debug(`[SheetsAPI] ${method} ${res.status} — ${url.split('?')[0].split('/').slice(-2).join('/')}`);

  if (res.status === 401) {
    logout();
    throw new Error('Your Google session has expired. Please sign in again.');
  }

  // Handle transient errors (rate limit or server issues) with retry
  if ((res.status === 429 || res.status >= 500) && retries > 0) {
    logger.warn(`Transient HTTP ${res.status} from ${url}. Retrying in ${delay}ms...`);
    await wait(delay);
    return sheetsRequest<T>(url, options, retries - 1, delay * 2);
  }

  if (!res.ok) {
    const text = await res.text();
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }

    const googleMsg = parsed?.error?.message ?? '';
    const googleStatus = parsed?.error?.status ?? '';

    let message: string;
    if (res.status === 403 && (googleStatus === 'PERMISSION_DENIED' || googleMsg.toLowerCase().includes('permission'))) {
      message =
        `Permission denied (403). Your Google account does not have write access to this spreadsheet. ` +
        `[${googleMsg || 'PERMISSION_DENIED'}]`;
    } else if (res.status === 429) {
      message = 'Google Sheets API rate limit exceeded. Please try again in a few moments.';
    } else {
      message = googleMsg || `Google Sheets API error ${res.status}`;
    }

    logger.error('[SheetsAPI] Error response:', parsed);
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ── Public client ────────────────────────────────────────────────────────────

export const sheetsClient = {
  /**
   * Read all rows from a range and map them to typed objects.
   * Row 1 is treated as the header row.
   */
  async getRows<T>(spreadsheetId: string, range: string): Promise<T[]> {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const data = await sheetsRequest<SheetsResponse>(url);
    const values = data.values;
    if (!values || values.length < 2) return [];

    const headers = values[0];
    return values.slice(1).map((row, i) => {
      const obj: any = { _rowIdx: i + 2 }; // 1-indexed sheet row (skipping headers row)
      headers.forEach((h, j) => {
        obj[h] = row[j] ?? '';
      });
      return obj as T;
    });
  },

  /** Read raw 2D cell values from a range (no header mapping). */
  async getRawValues(spreadsheetId: string, range: string): Promise<any[][]> {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const data = await sheetsRequest<SheetsResponse>(url);
    return data.values ?? [];
  },

  /** Append a single object as a new row, using SHEET_HEADERS for column order. */
  async appendRow(spreadsheetId: string, tabName: string, data: Record<string, any>): Promise<void> {
    const headers = SHEET_HEADERS[tabName];
    if (!headers) throw new Error(`Tab "${tabName}" is not registered in SHEET_HEADERS.`);

    const values = [headers.map(h => (data[h] !== undefined ? String(data[h]) : ''))];
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED`;
    await sheetsRequest(url, { method: 'POST', body: JSON.stringify({ values }) });
  },

  /** Overwrite a single row at a specific 1-indexed row index. */
  async updateRow(
    spreadsheetId: string,
    tabName: string,
    rowIdx: number,
    data: Record<string, any>
  ): Promise<void> {
    const headers = SHEET_HEADERS[tabName];
    if (!headers) throw new Error(`Tab "${tabName}" is not registered in SHEET_HEADERS.`);

    const values = [headers.map(h => (data[h] !== undefined ? String(data[h]) : ''))];
    const lastCol = getColumnLetter(headers.length - 1);
    const range = `${tabName}!A${rowIdx}:${lastCol}${rowIdx}`;
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    await sheetsRequest(url, { method: 'PUT', body: JSON.stringify({ values }) });
  },

  /** Clear all cells in a range. */
  async clearRange(spreadsheetId: string, range: string): Promise<void> {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
    await sheetsRequest(url, { method: 'POST' });
  },

  /** Write a 2D array of values into a range, starting from the top-left cell. */
  async updateRange(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    await sheetsRequest(url, { method: 'PUT', body: JSON.stringify({ values }) });
  },

  /** Execute a batchUpdate request (add sheets, rename, etc.). */
  async batchUpdate(spreadsheetId: string, requests: any[]): Promise<void> {
    const url = `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`;
    await sheetsRequest(url, { method: 'POST', body: JSON.stringify({ requests }) });
  },

  /** Fetch spreadsheet metadata (sheet list, properties). */
  async getMetadata(spreadsheetId: string): Promise<any> {
    const url = `${SHEETS_BASE}/${spreadsheetId}`;
    return sheetsRequest<any>(url);
  },
};

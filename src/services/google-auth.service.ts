/**
 * google-auth.service.ts
 *
 * Single Responsibility: Google OAuth 2.0 via Google Identity Services (GIS).
 *
 * Handles:
 *   - Loading the GIS script
 *   - Initiating the OAuth implicit grant flow
 *   - Fetching the user's Google profile (name, email, picture)
 *
 * Does NOT handle:
 *   - Drive search or spreadsheet creation
 *   - Zustand store mutations (caller's responsibility)
 *   - Navigation
 */

declare global {
  interface Window {
    google: any;
  }
}

/** Required OAuth scopes for Track Wise */
const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',  // read/write user's own sheets
  'https://www.googleapis.com/auth/drive.file',    // search/create files created by this app
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OAuthTokenResult {
  accessToken: string;
  expiresAt: number;
}

export interface GoogleUserProfile {
  googleUserId: string;
  email: string;
  name: string;
  picture: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const googleAuthService = {
  /**
   * Dynamically inject and load the Google Identity Services script.
   * Resolves immediately if the script is already loaded.
   */
  loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }

      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${GIS_SCRIPT_URL}"]`
      );

      if (existing) {
        // Script injected but not loaded yet — poll for readiness
        let attempts = 0;
        const interval = setInterval(() => {
          if (window.google?.accounts?.oauth2) {
            clearInterval(interval);
            resolve();
          } else if (++attempts > 50) {
            clearInterval(interval);
            reject(new Error('Timeout: Google Identity Services script did not load.'));
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.oauth2) {
          resolve();
        } else {
          reject(new Error('GIS script loaded but google.accounts.oauth2 is unavailable.'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
      document.body.appendChild(script);
    });
  },

  /**
   * Open the Google OAuth popup and acquire an access token.
   * Uses the implicit grant (token) flow via GIS.
   *
   * @returns Promise that resolves with { accessToken, expiresAt }
   * @throws If the user cancels, denies, or if GIS is not loaded
   */
  requestToken(clientId: string): Promise<OAuthTokenResult> {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services is not loaded. Call loadScript() first.'));
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: OAUTH_SCOPES,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description ?? response.error ?? 'OAuth flow failed.'));
            return;
          }
          if (response.access_token) {
            resolve({
              accessToken: response.access_token,
              expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
            });
          } else {
            reject(new Error('OAuth response did not contain an access token.'));
          }
        },
      });

      client.requestAccessToken();
    });
  },

  /**
   * Fetch the signed-in user's Google profile using the userinfo endpoint.
   *
   * @param accessToken — A valid Google OAuth access token
   */
  async fetchProfile(accessToken: string): Promise<GoogleUserProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Google profile: HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      googleUserId: data.id ?? data.sub ?? '',
      email: data.email ?? '',
      name: data.name ?? 'Google User',
      picture: data.picture ?? '',
    };
  },
};

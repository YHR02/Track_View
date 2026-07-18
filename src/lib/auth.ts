declare global {
  interface Window {
    google: any;
  }
}

export function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    // Check if script already injected
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      // Just wait for it to load
      let checkCount = 0;
      const interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          resolve();
        } else if (checkCount > 50) {
          clearInterval(interval);
          reject(new Error('Timeout loading Google Identity Services'));
        }
        checkCount++;
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error('Google Identity Services script loaded but oauth2 namespace not found.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'));
    document.body.appendChild(script);
  });
}

export function initiateOAuthFlow(
  clientId: string,
  onTokenReceived: (token: string, expiresAt: number) => void,
  onError?: (err: any) => void
): void {
  try {
    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Identity Services not loaded yet');
    }
    
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.profile',
      callback: (response: any) => {
        if (response.error) {
          if (onError) onError(response);
          return;
        }
        if (response.access_token) {
          const expiresAt = Date.now() + (response.expires_in || 3600) * 1000;
          onTokenReceived(response.access_token, expiresAt);
        }
      },
    });

    client.requestAccessToken();
  } catch (err) {
    if (onError) onError(err);
  }
}

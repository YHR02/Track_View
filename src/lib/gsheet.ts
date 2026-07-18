import { useAuthStore } from '../stores/authStore';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

interface SheetsResponse {
  values?: any[][];
}

// Fetch helper that injects OAuth Bearer Token
async function gsheetsRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, logout, isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated()) {
    throw new Error('User is not authenticated with Google');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
  headers.set('Content-Type', 'application/json');

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    logout();
    throw new Error('Google OAuth token expired or revoked. Please sign in again.');
  }

  if (!res.ok) {
    const errorText = await res.text();
    let parsedError;
    try {
      parsedError = JSON.parse(errorText);
    } catch {
      // Ignore
    }
    const message = parsedError?.error?.message || `Google Sheets API error: ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// Helper to convert index to letter (0 -> A, 1 -> B, etc.)
function getColumnLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

const TAB_HEADERS: Record<string, string[]> = {
  Categories: ['categoryId', 'name', 'color', 'icon', 'createdAt'],
  Trackers: [
    'trackerId',
    'name',
    'type',
    'categoryId',
    'target',
    'unit',
    'color',
    'icon',
    'frequency',
    'archived',
    'createdAt',
  ],
  Entries: ['entryId', 'trackerId', 'date', 'value', 'note', 'createdAt'],
  Metadata: ['key', 'value'],
  Users: [
    'GoogleUserId',
    'Email',
    'Name',
    'SpreadsheetId',
    'SpreadsheetUrl',
    'CreatedAt',
    'LastLogin',
    'Status',
  ],
};

export const gsheetClient = {
  // Fetch values from a range and map them to objects
  async getRows<T>(spreadsheetId: string, range: string): Promise<T[]> {
    const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const data = await gsheetsRequest<SheetsResponse>(url);
    
    const values = data.values;
    if (!values || values.length === 0) return [];

    const headers = values[0];
    const rows: T[] = [];

    for (let i = 1; i < values.length; i++) {
      const row: any = {};
      // Fill columns matching headers
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j] !== undefined ? values[i][j] : '';
      }
      row._rowIdx = i + 1; // 1-indexed row number in spreadsheet
      rows.push(row as T);
    }

    return rows;
  },

  // Fetch raw cell values array without mapping
  async getRawValues(spreadsheetId: string, range: string): Promise<any[][]> {
    const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const data = await gsheetsRequest<SheetsResponse>(url);
    return data.values || [];
  },

  // Append a single row of data matching headers
  async appendRow(
    spreadsheetId: string,
    tabName: string,
    data: Record<string, any>
  ): Promise<void> {
    const headers = TAB_HEADERS[tabName];
    if (!headers) {
      throw new Error(`Sheet tab "${tabName}" headers are not configured.`);
    }

    const rowValues = headers.map((h) => (data[h] !== undefined ? String(data[h]) : ''));

    // Append row values
    const appendUrl = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(tabName)}:append?valueInputOption=USER_ENTERED`;
    await gsheetsRequest(appendUrl, {
      method: 'POST',
      body: JSON.stringify({
        values: [rowValues],
      }),
    });
  },

  // Update a single row by index
  async updateRow(
    spreadsheetId: string,
    tabName: string,
    rowIdx: number,
    data: Record<string, any>
  ): Promise<void> {
    const headers = TAB_HEADERS[tabName];
    if (!headers) {
      throw new Error(`Sheet tab "${tabName}" headers are not configured.`);
    }

    const rowValues = headers.map((h) => (data[h] !== undefined ? String(data[h]) : ''));
    const lastColLetter = getColumnLetter(headers.length - 1);

    // PUT values into target row index
    const updateUrl = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(
      `${tabName}!A${rowIdx}:${lastColLetter}${rowIdx}`
    )}?valueInputOption=USER_ENTERED`;

    await gsheetsRequest(updateUrl, {
      method: 'PUT',
      body: JSON.stringify({
        values: [rowValues],
      }),
    });
  },

  // Clear specific cells range
  async clearRange(spreadsheetId: string, range: string): Promise<void> {
    const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
    await gsheetsRequest(url, {
      method: 'POST',
    });
  },

  // Update specific range with 2D array of values
  async updateRange(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    const url = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    await gsheetsRequest(url, {
      method: 'PUT',
      body: JSON.stringify({
        values,
      }),
    });
  },

  // Perform multiple batch updates (creates, reorders, metadata updates)
  async batchUpdate(spreadsheetId: string, requests: any[]): Promise<void> {
    const url = `${BASE_URL}/${spreadsheetId}:batchUpdate`;
    await gsheetsRequest(url, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  },

  // Create a brand new Spreadsheet with folders
  async createSpreadsheet(title: string): Promise<string> {
    const createUrl = BASE_URL;
    const res: any = await gsheetsRequest(createUrl, {
      method: 'POST',
      body: JSON.stringify({
        properties: { title },
      }),
    });

    const spreadsheetId = res.spreadsheetId;
    if (!spreadsheetId) {
      throw new Error('Failed to retrieve Spreadsheet ID of newly created spreadsheet.');
    }

    // Set up tabs and write column headers
    // Tab 1: Categories
    // Tab 2: Trackers
    // Tab 3: Entries
    // Tab 4: Metadata
    const requests = [
      // Add sheet tabs (excluding the default first sheet, we will rename it to Categories later or add tabs)
      { addSheet: { properties: { title: 'Trackers' } } },
      { addSheet: { properties: { title: 'Entries' } } },
      { addSheet: { properties: { title: 'Metadata' } } },
    ];

    await this.batchUpdate(spreadsheetId, requests);

    // Rename the default sheet (normally "Sheet1") to "Categories"
    const getSheetUrl = `${BASE_URL}/${spreadsheetId}`;
    const ssData: any = await gsheetsRequest(getSheetUrl);
    const sheet1Id = ssData.sheets?.[0]?.properties?.sheetId;
    
    if (sheet1Id !== undefined) {
      await this.batchUpdate(spreadsheetId, [
        {
          updateSheetProperties: {
            properties: { sheetId: sheet1Id, title: 'Categories' },
            fields: 'title',
          },
        },
      ]);
    }

    // Initialize headers in all tabs
    const headers = {
      'Categories': ['categoryId', 'name', 'color', 'icon', 'createdAt'],
      'Trackers': [
        'trackerId',
        'name',
        'type',
        'categoryId',
        'target',
        'unit',
        'color',
        'icon',
        'frequency',
        'archived',
        'createdAt',
      ],
      'Entries': ['entryId', 'trackerId', 'date', 'value', 'note', 'createdAt'],
      'Metadata': ['key', 'value'],
    };

    // Write all headers in parallel
    await Promise.all(
      Object.entries(headers).map(([tabName, cols]) => {
        const updateUrl = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(
          `${tabName}!A1:${getColumnLetter(cols.length - 1)}1`
        )}?valueInputOption=USER_ENTERED`;
        
        return gsheetsRequest(updateUrl, {
          method: 'PUT',
          body: JSON.stringify({
            values: [cols],
          }),
        });
      })
    );

    // Seed default Categories
    const defaultCats = [
      ['1', 'Health', '#22c55e', '💪', new Date().toISOString()],
      ['2', 'Mind', '#8b5cf6', '🧠', new Date().toISOString()],
      ['3', 'Finance', '#f59e0b', '💰', new Date().toISOString()],
    ];
    const seedCatsUrl = `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(
      'Categories!A2:E4'
    )}?valueInputOption=USER_ENTERED`;
    
    await gsheetsRequest(seedCatsUrl, {
      method: 'PUT',
      body: JSON.stringify({
        values: defaultCats,
      }),
    });

    return spreadsheetId;
  },

  // Validate spreadsheet contains required sheets
  async validateSpreadsheet(spreadsheetId: string): Promise<boolean> {
    const url = `${BASE_URL}/${spreadsheetId}`;
    const data: any = await gsheetsRequest(url);
    const sheets = data.sheets || [];
    const titles = sheets.map((s: any) => s.properties?.title);

    const required = ['Categories', 'Trackers', 'Entries', 'Metadata'];
    return required.every((r) => titles.includes(r));
  },
};

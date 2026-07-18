import { sheetsClient, getColumnLetter } from '../lib/http-client';
import { SHEET_NAMES } from '../constants/sheetNames';
import { SHEET_HEADERS } from '../constants/headers';
import { SCHEMA_VERSION, APP_VERSION, WORKSPACE_VERSION } from '../constants/schema';
import { logger } from '../utils/logger';

const DEFAULT_CATEGORIES: string[][] = [
  ['1', 'Health',  '#22c55e', '💪', new Date().toISOString()],
  ['2', 'Mind',    '#8b5cf6', '🧠', new Date().toISOString()],
  ['3', 'Finance', '#f59e0b', '💰', new Date().toISOString()],
];

export const spreadsheetInitializer = {
  /**
   * Initializes a brand-new blank spreadsheet with the correct schema and seed data.
   */
  async initializeWorkspace(
    spreadsheetId: string,
    userProfile?: { email: string; name: string }
  ): Promise<void> {
    logger.info('[Initializer] Initializing new workspace:', spreadsheetId);

    // Step 1: Query spreadsheet details to get "Sheet1" properties
    const metadata = await sheetsClient.getMetadata(spreadsheetId);
    const sheets = metadata.sheets ?? [];
    const sheet1 = sheets[0];
    const sheet1Id: number | undefined = sheet1?.properties?.sheetId;

    // Step 2: Rename "Sheet1" -> "Categories"
    const renameRequests: any[] = [];
    if (sheet1Id !== undefined) {
      renameRequests.push({
        updateSheetProperties: {
          properties: { sheetId: sheet1Id, title: SHEET_NAMES.Categories },
          fields: 'title',
        },
      });
    }

    // Step 3: Create other tabs
    const otherTabs = [
      SHEET_NAMES.Metadata,
      SHEET_NAMES.Trackers,
      SHEET_NAMES.Entries,
      SHEET_NAMES.Settings,
    ];
    const addRequests = otherTabs.map(title => ({
      addSheet: { properties: { title } },
    }));

    const allRequests = [...renameRequests, ...addRequests];
    if (allRequests.length > 0) {
      await sheetsClient.batchUpdate(spreadsheetId, allRequests);
      logger.debug('[Initializer] Tabs created in sheet.');
    }

    // Step 4: Write headers to all tabs
    const requiredTabs = Object.values(SHEET_NAMES);
    await Promise.all(
      requiredTabs.map(tabName => {
        const cols = SHEET_HEADERS[tabName];
        const lastCol = getColumnLetter(cols.length - 1);
        const range = `${tabName}!A1:${lastCol}1`;
        return sheetsClient.updateRange(spreadsheetId, range, [cols]);
      })
    );
    logger.debug('[Initializer] Headers written to all tabs.');

    // Step 5: Seed default categories
    await sheetsClient.updateRange(
      spreadsheetId,
      `${SHEET_NAMES.Categories}!A2:E${DEFAULT_CATEGORIES.length + 1}`,
      DEFAULT_CATEGORIES
    );
    logger.debug('[Initializer] Default categories seeded.');

    // Step 6: Seed initial metadata
    const now = new Date().toISOString();
    const initialMetadata = [
      ['schemaVersion', SCHEMA_VERSION],
      ['appVersion', APP_VERSION],
      ['workspaceVersion', WORKSPACE_VERSION],
      ['createdAt', now],
      ['lastUpdated', now],
      ['ownerEmail', userProfile?.email || ''],
      ['ownerName', userProfile?.name || ''],
      ['timezone', Intl.DateTimeFormat().resolvedOptions().timeZone],
      ['currency', 'USD'], // default
    ];

    await sheetsClient.updateRange(
      spreadsheetId,
      `${SHEET_NAMES.Metadata}!A2:B${initialMetadata.length + 1}`,
      initialMetadata
    );
    logger.info('[Initializer] Initialization complete.');
  },
};

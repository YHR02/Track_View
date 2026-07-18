import { sheetsClient, getColumnLetter } from '../lib/http-client';
import { SHEET_NAMES } from '../constants/sheetNames';
import { SHEET_HEADERS } from '../constants/headers';
import { SCHEMA_VERSION, APP_VERSION, WORKSPACE_VERSION } from '../constants/schema';
import { logger } from '../utils/logger';

export const spreadsheetRepair = {
  /**
   * Safely repairs the spreadsheet workspace structure.
   * Only recreates missing tabs and restores row 1 headers. Existing rows are untouched.
   */
  async repairWorkspace(spreadsheetId: string, userProfile?: { email: string; name: string }): Promise<void> {
    logger.info('[Repair] Starting repair for spreadsheet:', spreadsheetId);

    // Step 1: Re-fetch metadata to see existing sheets
    const metadata = await sheetsClient.getMetadata(spreadsheetId);
    const existingTitles: string[] = (metadata.sheets ?? []).map(
      (s: any) => s.properties?.title as string
    );

    const requiredTabs = Object.values(SHEET_NAMES);
    const missingTabs = requiredTabs.filter(tab => !existingTitles.includes(tab));

    // Step 2: Add missing sheets
    if (missingTabs.length > 0) {
      logger.info('[Repair] Adding missing tabs:', missingTabs);
      const addRequests = missingTabs.map(title => ({
        addSheet: { properties: { title } },
      }));
      await sheetsClient.batchUpdate(spreadsheetId, addRequests);
    }

    // Step 3: Repair headers of all tabs (or missing headers)
    for (const [tabName, expectedHeaders] of Object.entries(SHEET_HEADERS)) {
      const rawValues = await sheetsClient.getRawValues(spreadsheetId, `${tabName}!1:1`);
      let needsHeaderWrite = false;

      if (rawValues.length === 0 || rawValues[0].length === 0) {
        needsHeaderWrite = true;
      } else {
        const actualHeaders = rawValues[0].map(h => String(h).trim().toLowerCase());
        const expectedNormalized = expectedHeaders.map(h => h.trim().toLowerCase());
        const matches = expectedNormalized.every((eh, i) => actualHeaders[i] === eh);
        if (!matches) {
          needsHeaderWrite = true;
        }
      }

      if (needsHeaderWrite) {
        logger.warn(`[Repair] Overwriting invalid or missing headers in tab "${tabName}"`);
        const lastCol = getColumnLetter(expectedHeaders.length - 1);
        const range = `${tabName}!A1:${lastCol}1`;
        await sheetsClient.updateRange(spreadsheetId, range, [expectedHeaders]);
      }
    }

    // Step 4: Validate or create required metadata fields
    try {
      const metadataRows = await sheetsClient.getRows<{ key: string; value: string; _rowIdx?: number }>(
        spreadsheetId,
        `${SHEET_NAMES.Metadata}!A:B`
      );

      const metadataMap = new Map(metadataRows.map(r => [r.key, r]));

      const setMetadataValue = async (key: string, value: string) => {
        const existing = metadataMap.get(key);
        if (existing && existing._rowIdx) {
          await sheetsClient.updateRow(spreadsheetId, SHEET_NAMES.Metadata, existing._rowIdx, {
            key,
            value,
          });
        } else {
          await sheetsClient.appendRow(spreadsheetId, SHEET_NAMES.Metadata, { key, value });
        }
      };

      await setMetadataValue('schemaVersion', SCHEMA_VERSION);
      await setMetadataValue('appVersion', APP_VERSION);
      await setMetadataValue('workspaceVersion', WORKSPACE_VERSION);
      await setMetadataValue('lastUpdated', new Date().toISOString());

      if (userProfile) {
        if (userProfile.email) await setMetadataValue('ownerEmail', userProfile.email);
        if (userProfile.name) await setMetadataValue('ownerName', userProfile.name);
      }

      // Check if createdAt exists, write if not
      if (!metadataMap.has('createdAt')) {
        await sheetsClient.appendRow(spreadsheetId, SHEET_NAMES.Metadata, {
          key: 'createdAt',
          value: new Date().toISOString(),
        });
      }
    } catch (metaErr) {
      logger.error('[Repair] Error repairing workspace metadata:', metaErr);
    }

    logger.info('[Repair] Repair complete.');
  },
};

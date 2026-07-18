import { sheetsClient } from '../lib/http-client';
import { SHEET_NAMES } from '../constants/sheetNames';
import { SHEET_HEADERS } from '../constants/headers';
import { SCHEMA_VERSION } from '../constants/schema';
import { logger } from '../utils/logger';

export const spreadsheetValidator = {
  /**
   * Validate that all required tabs exist in the spreadsheet.
   */
  async validateTabs(spreadsheetId: string): Promise<boolean> {
    try {
      const metadata = await sheetsClient.getMetadata(spreadsheetId);
      const existingTitles: string[] = (metadata.sheets ?? []).map(
        (s: any) => s.properties?.title as string
      );
      const required = Object.values(SHEET_NAMES);
      const isValid = required.every(tab => existingTitles.includes(tab));
      logger.debug('[Validator] Tab validation status:', isValid, existingTitles);
      return isValid;
    } catch (err) {
      logger.error('[Validator] Tab validation error:', err);
      return false;
    }
  },

  /**
   * Validate that headers of all required tabs are correct.
   */
  async validateHeaders(spreadsheetId: string): Promise<boolean> {
    try {
      for (const [tabName, expectedHeaders] of Object.entries(SHEET_HEADERS)) {
        const rawValues = await sheetsClient.getRawValues(spreadsheetId, `${tabName}!1:1`);
        if (rawValues.length === 0 || rawValues[0].length === 0) {
          logger.warn(`[Validator] Headers missing in tab "${tabName}"`);
          return false;
        }
        const actualHeaders = rawValues[0].map(h => String(h).trim().toLowerCase());
        const expectedNormalized = expectedHeaders.map(h => h.trim().toLowerCase());

        const hasAll = expectedNormalized.every(eh => actualHeaders.includes(eh));
        if (!hasAll) {
          logger.warn(
            `[Validator] Header mismatch in tab "${tabName}". Expected:`,
            expectedNormalized,
            'Actual:',
            actualHeaders
          );
          return false;
        }
      }
      return true;
    } catch (err) {
      logger.error('[Validator] Header validation error:', err);
      return false;
    }
  },

  /**
   * Validate that the schema version matches SCHEMA_VERSION.
   */
  async validateSchemaVersion(spreadsheetId: string): Promise<boolean> {
    try {
      const rows = await sheetsClient.getRows<{ key: string; value: string }>(
        spreadsheetId,
        `${SHEET_NAMES.Metadata}!A:B`
      );
      const versionRow = rows.find(r => r.key === 'schemaVersion');
      const version = versionRow ? versionRow.value : null;
      logger.debug('[Validator] Schema version in sheet:', version, 'Expected:', SCHEMA_VERSION);
      return version === SCHEMA_VERSION;
    } catch (err) {
      logger.error('[Validator] Schema version validation error:', err);
      return false;
    }
  },

  /**
   * Complete validation check.
   */
  async validateWorkspace(spreadsheetId: string): Promise<boolean> {
    const tabsOk = await this.validateTabs(spreadsheetId);
    if (!tabsOk) return false;

    const headersOk = await this.validateHeaders(spreadsheetId);
    if (!headersOk) return false;

    const schemaOk = await this.validateSchemaVersion(spreadsheetId);
    if (!schemaOk) return false;

    return true;
  }
};

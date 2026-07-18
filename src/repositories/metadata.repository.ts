import { sheetsClient } from '../lib/http-client';
import { useAuthStore } from '../stores/authStore';
import { SHEET_NAMES } from '../constants/sheetNames';

const TAB_NAME = SHEET_NAMES.Metadata;

interface GSheetMetadataRow {
  key: string;
  value: string;
  _rowIdx?: number;
}

export class MetadataRepository {
  private getSpreadsheetId(): string {
    const { spreadsheetId } = useAuthStore.getState();
    if (!spreadsheetId) throw new Error('No spreadsheet connected. Please sign in again.');
    return spreadsheetId;
  }

  async get(key: string): Promise<string | null> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetMetadataRow>(id, `${TAB_NAME}!A:B`);
    const found = rows.find(r => r.key === key);
    return found ? found.value : null;
  }

  async set(key: string, value: string): Promise<void> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetMetadataRow>(id, `${TAB_NAME}!A:B`);
    const existing = rows.find(r => r.key === key);

    if (existing && existing._rowIdx) {
      await sheetsClient.updateRow(id, TAB_NAME, existing._rowIdx, { key, value });
    } else {
      await sheetsClient.appendRow(id, TAB_NAME, { key, value });
    }
  }

  async getAll(): Promise<Record<string, string>> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetMetadataRow>(id, `${TAB_NAME}!A:B`);
    const result: Record<string, string> = {};
    rows.forEach(r => {
      if (r.key) {
        result[r.key] = r.value;
      }
    });
    return result;
  }
}

export const metadataRepository = new MetadataRepository();

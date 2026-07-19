import { Entry } from '../types/entry';
import { sheetsClient } from '../lib/http-client';
import { useAuthStore } from '../stores/authStore';
import { SHEET_NAMES } from '../constants/sheetNames';

const TAB_NAME = SHEET_NAMES.Entries;

interface GSheetEntryRow {
  entryId: string;
  trackerId: string;
  date: string;
  value: string;
  note: string;
  createdAt: string;
  _rowIdx?: number;
}

export class EntryRepository {
  private getSpreadsheetId(): string {
    const { spreadsheetId } = useAuthStore.getState();
    if (!spreadsheetId) throw new Error('No spreadsheet connected. Please sign in again.');
    return spreadsheetId;
  }

  private mapRowToEntry(row: GSheetEntryRow): Entry {
    // Google Sheets stores boolean values as TRUE/FALSE (uppercase) when using
    // USER_ENTERED valueInputOption. Normalize here so all layers above receive
    // consistent lowercase 'true'/'false' strings.
    const rawValue = String(row.value ?? '').trim();
    const normalizedValue =
      rawValue.toLowerCase() === 'true' ? 'true' :
      rawValue.toLowerCase() === 'false' ? 'false' :
      rawValue;

    return {
      entryId: row.entryId,
      trackerId: row.trackerId,
      date: row.date,
      value: normalizedValue,
      note: row.note || null,
      createdAt: row.createdAt,
    };
  }

  async getByDate(date: string): Promise<Entry[]> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    return rows.map(r => this.mapRowToEntry(r)).filter(e => e.date === date);
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Entry[]> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    return rows
      .map(r => this.mapRowToEntry(r))
      .filter(e => e.date >= startDate && e.date <= endDate);
  }

  async getByTrackerAndDate(trackerId: string, date: string): Promise<Entry | null> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    const found = rows.find(r => r.trackerId === trackerId && r.date === date);
    return found ? this.mapRowToEntry(found) : null;
  }

  async upsert(trackerId: string, date: string, value: string, note?: string | null): Promise<Entry> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    const existing = rows.find(r => r.trackerId === trackerId && r.date === date);

    if (existing) {
      const updatedEntry: Entry = {
        entryId: existing.entryId,
        trackerId,
        date,
        value,
        note: note !== undefined ? note : existing.note,
        createdAt: existing.createdAt,
      };

      await sheetsClient.updateRow(id, TAB_NAME, existing._rowIdx!, {
        entryId: updatedEntry.entryId,
        trackerId: updatedEntry.trackerId,
        date: updatedEntry.date,
        value: updatedEntry.value,
        note: updatedEntry.note || '',
        createdAt: updatedEntry.createdAt,
      });

      return updatedEntry;
    } else {
      const newEntry: Entry = {
        entryId: crypto.randomUUID(),
        trackerId,
        date,
        value,
        note: note || null,
        createdAt: new Date().toISOString(),
      };

      await sheetsClient.appendRow(id, TAB_NAME, {
        entryId: newEntry.entryId,
        trackerId: newEntry.trackerId,
        date: newEntry.date,
        value: newEntry.value,
        note: newEntry.note || '',
        createdAt: newEntry.createdAt,
      });

      return newEntry;
    }
  }

  async getMonth(year: number, month: number): Promise<Entry[]> {
    const id = this.getSpreadsheetId();
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const rows = await sheetsClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    return rows
      .map(r => this.mapRowToEntry(r))
      .filter(e => e.date.startsWith(prefix));
  }
}

export const entryRepository = new EntryRepository();

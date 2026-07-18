import { ILogRepository } from '../interfaces/i-log.repository';
import { Log } from '../../types/log';
import { gsheetClient } from '../../lib/gsheet';
import { useAuthStore } from '../../stores/authStore';

const TAB_NAME = 'Entries';

interface GSheetEntryRow {
  entryId: string;
  trackerId: string;
  date: string;
  value: string;
  note: string;
  createdAt: string;
  _rowIdx?: number;
}

export class GSheetLogRepository implements ILogRepository {
  private getSpreadsheetId(): string {
    const { spreadsheetId } = useAuthStore.getState();
    if (!spreadsheetId) throw new Error('Spreadsheet ID is not connection-configured');
    return spreadsheetId;
  }

  private mapRowToLog(row: GSheetEntryRow): Log {
    return {
      entryId: row.entryId,
      trackerId: row.trackerId,
      date: row.date,
      value: row.value,
      note: row.note || null,
      createdAt: row.createdAt,
    };
  }

  async getByDate(date: string): Promise<Log[]> {
    const id = this.getSpreadsheetId();
    const rows = await gsheetClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    return rows
      .map((r) => this.mapRowToLog(r))
      .filter((l) => l.date === date);
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Log[]> {
    const id = this.getSpreadsheetId();
    const rows = await gsheetClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    return rows
      .map((r) => this.mapRowToLog(r))
      .filter((l) => l.date >= startDate && l.date <= endDate);
  }

  async getByTrackerAndDate(trackerId: string, date: string): Promise<Log | null> {
    const id = this.getSpreadsheetId();
    const rows = await gsheetClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    const found = rows.find((r) => r.trackerId === trackerId && r.date === date);
    return found ? this.mapRowToLog(found) : null;
  }

  async upsert(trackerId: string, date: string, value: string, note?: string | null): Promise<Log> {
    const id = this.getSpreadsheetId();
    const rows = await gsheetClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    const existing = rows.find((r) => r.trackerId === trackerId && r.date === date);

    if (existing) {
      // Update existing row
      const updatedLog: Log = {
        entryId: existing.entryId,
        trackerId,
        date,
        value,
        note: note !== undefined ? note : existing.note,
        createdAt: existing.createdAt,
      };

      await gsheetClient.updateRow(id, TAB_NAME, existing._rowIdx!, {
        entryId: updatedLog.entryId,
        trackerId: updatedLog.trackerId,
        date: updatedLog.date,
        value: updatedLog.value,
        note: updatedLog.note || '',
        createdAt: updatedLog.createdAt,
      });

      return updatedLog;
    } else {
      // Append a new row
      const newLog: Log = {
        entryId: crypto.randomUUID(),
        trackerId,
        date,
        value,
        note: note || null,
        createdAt: new Date().toISOString(),
      };

      await gsheetClient.appendRow(id, TAB_NAME, {
        entryId: newLog.entryId,
        trackerId: newLog.trackerId,
        date: newLog.date,
        value: newLog.value,
        note: newLog.note || '',
        createdAt: newLog.createdAt,
      });

      return newLog;
    }
  }

  async getMonth(year: number, month: number): Promise<Log[]> {
    const id = this.getSpreadsheetId();
    const monthStr = month.toString().padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const rows = await gsheetClient.getRows<GSheetEntryRow>(id, `${TAB_NAME}!A:F`);
    return rows
      .map((r) => this.mapRowToLog(r))
      .filter((l) => l.date.startsWith(prefix));
  }
}

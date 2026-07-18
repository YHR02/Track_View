import { Tracker, CreateTrackerInput, UpdateTrackerInput } from '../types/tracker';
import { sheetsClient } from '../lib/http-client';
import { useAuthStore } from '../stores/authStore';
import { SHEET_NAMES } from '../constants/sheetNames';

const TAB_NAME = SHEET_NAMES.Trackers;

interface GSheetRow {
  trackerId: string;
  name: string;
  type: string;
  categoryId: string;
  target: string;
  unit: string;
  color: string;
  icon: string;
  frequency: string;
  archived: string;
  createdAt: string;
  _rowIdx?: number;
}

export class TrackerRepository {
  private getSpreadsheetId(): string {
    const { spreadsheetId } = useAuthStore.getState();
    if (!spreadsheetId) throw new Error('No spreadsheet connected. Please sign in again.');
    return spreadsheetId;
  }

  private mapRowToTracker(row: GSheetRow): Tracker {
    return {
      trackerId: row.trackerId,
      name: row.name,
      type: row.type as any,
      categoryId: row.categoryId,
      target: row.target !== '' ? parseFloat(row.target) : null,
      unit: row.unit || null,
      color: row.color,
      icon: row.icon,
      frequency: row.frequency as any,
      archived: row.archived === 'TRUE' || row.archived === 'true',
      createdAt: row.createdAt,
    };
  }

  async list(): Promise<Tracker[]> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetRow>(id, `${TAB_NAME}!A:K`);
    return rows
      .map(r => this.mapRowToTracker(r))
      .filter(t => !t.archived);
  }

  async getById(trackerId: string): Promise<Tracker | null> {
    const list = await this.list();
    return list.find(t => t.trackerId === trackerId) ?? null;
  }

  async create(data: CreateTrackerInput): Promise<Tracker> {
    const id = this.getSpreadsheetId();
    const trackerId = data.trackerId || crypto.randomUUID();
    const createdAt = data.createdAt || new Date().toISOString();

    const newTracker: Tracker = {
      ...data,
      trackerId,
      archived: data.archived ?? false,
      createdAt,
      target: data.target ?? null,
      unit: data.unit ?? null,
    };

    await sheetsClient.appendRow(id, TAB_NAME, {
      trackerId: newTracker.trackerId,
      name: newTracker.name,
      type: newTracker.type,
      categoryId: newTracker.categoryId,
      target: newTracker.target !== null ? String(newTracker.target) : '',
      unit: newTracker.unit || '',
      color: newTracker.color,
      icon: newTracker.icon,
      frequency: newTracker.frequency,
      archived: String(newTracker.archived).toUpperCase(),
      createdAt: newTracker.createdAt,
    });

    return newTracker;
  }

  async update(trackerId: string, data: UpdateTrackerInput): Promise<Tracker> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetRow>(id, `${TAB_NAME}!A:K`);
    const rowIndex = rows.findIndex(r => r.trackerId === trackerId);

    if (rowIndex === -1) {
      throw new Error(`Tracker not found: ${trackerId}`);
    }

    const row = rows[rowIndex];
    const updatedTracker: Tracker = {
      ...this.mapRowToTracker(row),
      ...data,
    } as Tracker;

    await sheetsClient.updateRow(id, TAB_NAME, row._rowIdx!, {
      trackerId: updatedTracker.trackerId,
      name: updatedTracker.name,
      type: updatedTracker.type,
      categoryId: updatedTracker.categoryId,
      target: updatedTracker.target !== null ? String(updatedTracker.target) : '',
      unit: updatedTracker.unit || '',
      color: updatedTracker.color,
      icon: updatedTracker.icon,
      frequency: updatedTracker.frequency,
      archived: String(updatedTracker.archived).toUpperCase(),
      createdAt: updatedTracker.createdAt,
    });

    return updatedTracker;
  }

  async archive(trackerId: string): Promise<void> {
    await this.update(trackerId, { archived: true });
  }

  async reorder(orderedIds: string[]): Promise<void> {
    const id = this.getSpreadsheetId();
    const rows = await sheetsClient.getRows<GSheetRow>(id, `${TAB_NAME}!A:K`);

    const activeRows = rows.filter(r => r.archived !== 'TRUE' && r.archived !== 'true');
    const archivedRows = rows.filter(r => r.archived === 'TRUE' || r.archived === 'true');

    const rowMap = new Map(activeRows.map(r => [r.trackerId, r]));
    const nextActiveRows: GSheetRow[] = [];

    orderedIds.forEach(tid => {
      const r = rowMap.get(tid);
      if (r) {
        nextActiveRows.push(r);
        rowMap.delete(tid);
      }
    });

    rowMap.forEach(r => nextActiveRows.push(r));

    const finalRows = [...nextActiveRows, ...archivedRows];
    const headers = [
      'trackerId', 'name', 'type', 'categoryId', 'target', 'unit',
      'color', 'icon', 'frequency', 'archived', 'createdAt',
    ];
    const values = finalRows.map(r =>
      headers.map(h => (r[h as keyof GSheetRow] !== undefined ? String(r[h as keyof GSheetRow]) : ''))
    );

    await sheetsClient.clearRange(id, `${TAB_NAME}!A2:K${rows.length + 10}`);
    await sheetsClient.updateRange(id, `${TAB_NAME}!A2`, values);
  }
}

export const trackerRepository = new TrackerRepository();

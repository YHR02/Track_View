import { SHEET_NAMES } from './sheetNames';

export const SHEET_HEADERS: Record<string, string[]> = {
  [SHEET_NAMES.Metadata]: ['key', 'value'],
  [SHEET_NAMES.Categories]: ['categoryId', 'name', 'color', 'icon', 'createdAt'],
  [SHEET_NAMES.Trackers]: [
    'trackerId', 'name', 'type', 'categoryId',
    'target', 'unit', 'color', 'icon', 'frequency', 'archived', 'createdAt',
  ],
  [SHEET_NAMES.Entries]: ['entryId', 'trackerId', 'date', 'value', 'note', 'createdAt'],
  [SHEET_NAMES.Settings]: ['key', 'value'],
};

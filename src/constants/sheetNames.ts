export const SHEET_NAMES = {
  Metadata: 'Metadata',
  Categories: 'Categories',
  Trackers: 'Trackers',
  Entries: 'Entries',
  Settings: 'Settings',
} as const;

export type SheetName = typeof SHEET_NAMES[keyof typeof SHEET_NAMES];

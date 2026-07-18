import { gsheetClient } from '../lib/gsheet';
import { UserProfile } from '../stores/authStore';

export class RegistryAccessError extends Error {
  constructor(message?: string) {
    super(message || 'Unable to access Track Wise registry. Please try again later.');
    this.name = 'RegistryAccessError';
  }
}

export class SpreadsheetNotFoundError extends Error {
  constructor(public spreadsheetId: string, public rowIdx: number) {
    super('Personal spreadsheet not found or inaccessible.');
    this.name = 'SpreadsheetNotFoundError';
  }
}

export class SpreadsheetCreationError extends Error {
  constructor(message?: string) {
    super(message || 'Unable to create your personal workspace. Please try again.');
    this.name = 'SpreadsheetCreationError';
  }
}

interface RegistryRow {
  GoogleUserId: string;
  Email: string;
  Name: string;
  SpreadsheetId: string;
  SpreadsheetUrl: string;
  CreatedAt: string;
  LastLogin: string;
  Status: string;
  _rowIdx?: number;
}

export const UserProvisioningService = {
  // Read Master Registry spreadsheet ID from environment variables
  getMasterSpreadsheetId(): string {
    const id = import.meta.env.VITE_MASTER_REGISTRY_SPREADSHEET_ID;
    if (!id || id.trim() === '') {
      // Fallback placeholder to prevent compilation issues, but warn developer
      console.warn('VITE_MASTER_REGISTRY_SPREADSHEET_ID environment variable is missing.');
    }
    return id || '';
  },

  // Main provisioning entry point
  async provisionUser(profile: UserProfile): Promise<string> {
    const masterId = this.getMasterSpreadsheetId();
    if (!masterId) {
      throw new RegistryAccessError('Master Registry Spreadsheet ID is not configured.');
    }

    const expectedHeaders = [
      'GoogleUserId',
      'Email',
      'Name',
      'SpreadsheetId',
      'SpreadsheetUrl',
      'CreatedAt',
      'LastLogin',
      'Status',
    ];
    let actualHeaders: string[] = [];
    try {
      const rawValues = await gsheetClient.getRawValues(masterId, 'Users!1:1');
      if (rawValues && rawValues.length > 0) {
        actualHeaders = rawValues[0];
      }
    } catch (err: any) {
      console.error('Failed to read Users headers from sheet:', err);
      throw new RegistryAccessError('Unable to access Track Wise registry sheet headers.');
    }

    // Temporarily add console.log before validation check as requested
    console.log("Expected headers:", expectedHeaders);
    console.log("Actual headers:", actualHeaders);

    // Validate headers: trim whitespace, ignore capitalization
    const normExpected = expectedHeaders.map((h) => h.trim().toLowerCase());
    const normActual = actualHeaders.map((h) => h.trim().toLowerCase());

    const missing = expectedHeaders.filter((h) => !normActual.includes(h.trim().toLowerCase()));
    const unexpected = actualHeaders.filter((h) => !normExpected.includes(h.trim().toLowerCase()));

    const isMatch = normExpected.every((h) => normActual.includes(h));

    if (!isMatch) {
      console.error('Master Registry Users tab header validation failed:');
      console.log('Expected:', expectedHeaders);
      console.log('Actual:', actualHeaders);
      console.log('Missing:', missing);
      console.log('Unexpected:', unexpected);
      throw new RegistryAccessError('Sheet tab "Users" headers are not configured.');
    }

    let rows: RegistryRow[] = [];
    try {
      // Read all rows from the Users tab
      rows = await gsheetClient.getRows<RegistryRow>(masterId, 'Users');
    } catch (err: any) {
      console.error('Failed to read registry:', err);
      throw new RegistryAccessError(err.message);
    }

    // Find if user already registered by GoogleUserId
    const existingUser = rows.find(
      (r) => String(r.GoogleUserId).trim() === String(profile.googleUserId).trim()
    );

    if (existingUser) {
      const sheetId = existingUser.SpreadsheetId;
      
      // Verify spreadsheet exists and is accessible
      let isValid = false;
      try {
        isValid = await gsheetClient.validateSpreadsheet(sheetId);
      } catch (err) {
        console.warn(`Spreadsheet validation failed for ${sheetId}:`, err);
      }

      if (isValid) {
        // Update registry user LastLogin timestamp
        try {
          const updatedUser = {
            ...existingUser,
            LastLogin: new Date().toISOString(),
          };
          await gsheetClient.updateRow(masterId, 'Users', existingUser._rowIdx!, updatedUser);
        } catch (err) {
          console.warn('Failed to update LastLogin in registry:', err);
        }
        return sheetId;
      } else {
        // Spreadsheet exists in database register but is deleted or not shared
        throw new SpreadsheetNotFoundError(sheetId, existingUser._rowIdx!);
      }
    } else {
      // First login: Provision a new spreadsheet database automatically
      return this.registerNewUser(profile, masterId);
    }
  },

  // Automatically create personal spreadsheet database and append to registry
  async registerNewUser(profile: UserProfile, masterId: string): Promise<string> {
    let newId = '';
    try {
      newId = await gsheetClient.createSpreadsheet('Track Wise Data');
    } catch (err: any) {
      console.error('Failed to create personal sheet:', err);
      throw new SpreadsheetCreationError(err.message);
    }

    try {
      const newUser: RegistryRow = {
        GoogleUserId: profile.googleUserId,
        Email: profile.email,
        Name: profile.name,
        SpreadsheetId: newId,
        SpreadsheetUrl: `https://docs.google.com/spreadsheets/d/${newId}`,
        CreatedAt: new Date().toISOString(),
        LastLogin: new Date().toISOString(),
        Status: 'Active',
      };
      await gsheetClient.appendRow(masterId, 'Users', newUser);
    } catch (err: any) {
      console.error('Failed to append user profile to registry:', err);
      throw new RegistryAccessError(err.message);
    }

    return newId;
  },

  // Recreate spreadsheet database for existing user who lost access to their old sheet
  async recreateUserSpreadsheet(profile: UserProfile, oldRowIdx: number): Promise<string> {
    const masterId = this.getMasterSpreadsheetId();
    if (!masterId) {
      throw new RegistryAccessError('Master Registry Spreadsheet ID is not configured.');
    }

    let newId = '';
    try {
      newId = await gsheetClient.createSpreadsheet('Track Wise Data');
    } catch (err: any) {
      console.error('Failed to recreate personal sheet:', err);
      throw new SpreadsheetCreationError(err.message);
    }

    try {
      // Overwrite the existing row in registry with new Spreadsheet ID
      const updatedUser: RegistryRow = {
        GoogleUserId: profile.googleUserId,
        Email: profile.email,
        Name: profile.name,
        SpreadsheetId: newId,
        SpreadsheetUrl: `https://docs.google.com/spreadsheets/d/${newId}`,
        CreatedAt: new Date().toISOString(), // Preserve original or update
        LastLogin: new Date().toISOString(),
        Status: 'Active',
      };
      await gsheetClient.updateRow(masterId, 'Users', oldRowIdx, updatedUser);
    } catch (err: any) {
      console.error('Failed to update registry with recreated sheet:', err);
      throw new RegistryAccessError(err.message);
    }

    return newId;
  },
};

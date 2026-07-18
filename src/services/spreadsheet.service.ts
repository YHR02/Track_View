import { driveService } from './drive.service';
import { spreadsheetInitializer } from './spreadsheet-initializer';
import { spreadsheetValidator } from './spreadsheet-validator';
import { spreadsheetRepair } from './spreadsheet-repair';
import { useAuthStore } from '../stores/authStore';
import { logger } from '../utils/logger';

export const spreadsheetService = {
  /**
   * Resolves the spreadsheet workspace ID for the logged-in user.
   * Performs discovery, validation, automatic repair, and falls back to
   * creation if not found.
   */
  async resolveWorkspace(): Promise<string> {
    const { profile } = useAuthStore.getState();
    const userProfile = profile ? { email: profile.email, name: profile.name } : undefined;

    let existingId: string | null = null;
    try {
      existingId = await driveService.findTrackWiseSpreadsheet();
    } catch (err: any) {
      logger.error('[SpreadsheetService] Drive discovery search failed:', err);
      throw new Error('Unable to locate workspace.');
    }

    if (!existingId) {
      logger.info('[SpreadsheetService] Spreadsheet not found in Drive. Creating new one...');
      return await this.createNewWorkspace(userProfile);
    }

    logger.info('[SpreadsheetService] Spreadsheet found in Drive:', existingId);

    // Check validation
    const isValid = await spreadsheetValidator.validateWorkspace(existingId);
    if (isValid) {
      logger.info('[SpreadsheetService] Workspace validated successfully.');
      return existingId;
    }

    // Try automatic repair
    logger.warn('[SpreadsheetService] Workspace validation failed. Attempting repair...');
    try {
      await spreadsheetRepair.repairWorkspace(existingId, userProfile);

      // Re-validate after repair
      const postRepairValid = await spreadsheetValidator.validateWorkspace(existingId);
      if (postRepairValid) {
        logger.info('[SpreadsheetService] Workspace successfully repaired and validated.');
        return existingId;
      } else {
        throw new Error('Post-repair validation failed.');
      }
    } catch (repairErr) {
      logger.error('[SpreadsheetService] Workspace repair failed:', repairErr);
      throw new Error('REPAIR_FAILED');
    }
  },

  /**
   * High-level action to create a brand new workspace.
   */
  async createNewWorkspace(userProfile?: { email: string; name: string }): Promise<string> {
    const title = 'Track Wise Data';
    logger.info('[SpreadsheetService] Creating new spreadsheet document...');
    const newId = await driveService.createSpreadsheet(title);

    logger.info('[SpreadsheetService] Initializing sheets on new document...');
    await spreadsheetInitializer.initializeWorkspace(newId, userProfile);

    return newId;
  },

  /**
   * High-level action to force-repair the current workspace (triggered from Settings).
   */
  async forceRepairWorkspace(): Promise<void> {
    const { spreadsheetId, profile } = useAuthStore.getState();
    if (!spreadsheetId) {
      throw new Error('No spreadsheet is connected to perform repair.');
    }
    const userProfile = profile ? { email: profile.email, name: profile.name } : undefined;
    await spreadsheetRepair.repairWorkspace(spreadsheetId, userProfile);
  }
};

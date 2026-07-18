import { ITrackerRepository } from './interfaces/i-tracker.repository';
import { ILogRepository } from './interfaces/i-log.repository';
import { GSheetTrackerRepository } from './gsheet/tracker.repository';
import { GSheetLogRepository } from './gsheet/log.repository';

export const trackerRepository: ITrackerRepository = new GSheetTrackerRepository();
export const logRepository: ILogRepository = new GSheetLogRepository();
export { GSheetTrackerRepository, GSheetLogRepository };

import { Log } from '../../types/log';

export interface ILogRepository {
  getByDate(date: string): Promise<Log[]>;
  getByDateRange(startDate: string, endDate: string): Promise<Log[]>;
  getByTrackerAndDate(trackerId: string, date: string): Promise<Log | null>;
  upsert(trackerId: string, date: string, value: string, note?: string | null): Promise<Log>;
  getMonth(year: number, month: number): Promise<Log[]>;
}

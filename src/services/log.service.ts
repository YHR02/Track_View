import { Log } from '../types/entry';

export const logService = {
  // Utility to group flat entries by date
  groupLogsByDate(logs: Log[]): { [date: string]: Log[] } {
    return logs.reduce((acc, log) => {
      if (!acc[log.date]) acc[log.date] = [];
      acc[log.date].push(log);
      return acc;
    }, {} as { [date: string]: Log[] });
  },

  // Utility to group flat entries by trackerId
  groupLogsByTracker(logs: Log[]): { [trackerId: string]: Log[] } {
    return logs.reduce((acc, log) => {
      if (!acc[log.trackerId]) acc[log.trackerId] = [];
      acc[log.trackerId].push(log);
      return acc;
    }, {} as { [trackerId: string]: Log[] });
  },
};

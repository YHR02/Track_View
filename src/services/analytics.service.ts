import { Tracker } from '../types/tracker';
import { Log } from '../types/entry';
import { Category } from '../types/category';

export function isTrackerCompleted(tracker: Tracker, value: string): boolean {
  if (!value) return false;
  if (tracker.type === 'boolean') {
    return value === 'true';
  } else if (tracker.type === 'numeric') {
    const val = parseFloat(value) || 0;
    return typeof tracker.target === 'number' && val >= tracker.target;
  } else if (tracker.type === 'duration') {
    const parts = value.split(':');
    const val = (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
    return typeof tracker.target === 'number' && val >= tracker.target;
  }
  return false;
}

export function isTrackerCompletedOnDate(tracker: Tracker, date: string, dayLogs: Log[]): boolean {
  const log = dayLogs.find((l) => l.trackerId === tracker.trackerId && l.date === date);
  return log ? isTrackerCompleted(tracker, log.value) : false;
}

export function calculateTrackerStats(
  t: Tracker,
  trackerLogs: Log[],
  logsByDate: { [date: string]: Log[] }
) {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Calculate streaks across 30 days
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Sort dates descending for current streak calculation
  const dateList: string[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dateList.push(d.toISOString().split('T')[0]);
  }

  // Current streak: start today or yesterday, go backwards
  let checkDateIdx = 0;
  const todayLogs = logsByDate[todayStr] || [];
  const isCompletedToday = isTrackerCompletedOnDate(t, todayStr, todayLogs);

  if (!isCompletedToday) {
    const yesterdayLogs = logsByDate[yesterdayStr] || [];
    const isCompletedYesterday = isTrackerCompletedOnDate(t, yesterdayStr, yesterdayLogs);
    if (isCompletedYesterday) {
      checkDateIdx = 1; // start from yesterday
    } else {
      checkDateIdx = -1; // streak broken
    }
  }

  if (checkDateIdx !== -1) {
    for (let i = checkDateIdx; i < dateList.length; i++) {
      const dStr = dateList[i];
      const dLogs = logsByDate[dStr] || [];
      if (isTrackerCompletedOnDate(t, dStr, dLogs)) {
        currentStreak++;
      } else {
        break; // broken
      }
    }
  }

  // Longest streak across 30 days (ascending order)
  const sortedDatesAsc = [...dateList].reverse();
  sortedDatesAsc.forEach((dStr) => {
    const dLogs = logsByDate[dStr] || [];
    if (isTrackerCompletedOnDate(t, dStr, dLogs)) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  });

  const completedDaysCount = trackerLogs.filter((log) => isTrackerCompleted(t, log.value)).length;
  const completionRate = trackerLogs.length > 0 ? Math.round((completedDaysCount / 30) * 100) : 0;

  return {
    currentStreak,
    longestStreak,
    completionRate,
    completedDaysCount,
  };
}

export function getDayCompletionRate(dateStr: string, trackers: Tracker[], dayLogs: Log[]): number {
  if (trackers.length === 0) return 0;
  let completed = 0;
  trackers.forEach((t) => {
    if (isTrackerCompletedOnDate(t, dateStr, dayLogs)) completed++;
  });
  return Math.round((completed / trackers.length) * 100);
}

export function getCategoryPieChartData(
  trackers: Tracker[],
  logs: Log[],
  categories: Category[]
): Array<{ name: string; value: number }> {
  const categoryMap = new Map(categories.map((c) => [c.categoryId, c]));
  const map: { [catName: string]: { completed: number } } = {};

  logs.forEach((log) => {
    const tracker = trackers.find((t) => t.trackerId === log.trackerId);
    if (!tracker) return;

    const catObj = categoryMap.get(tracker.categoryId);
    const catName = catObj ? catObj.name : 'General';
    if (!map[catName]) map[catName] = { completed: 0 };

    if (isTrackerCompleted(tracker, log.value)) {
      map[catName].completed++;
    }
  });

  return Object.keys(map)
    .map((catName) => ({
      name: catName,
      value: map[catName].completed,
    }))
    .filter((c) => c.value > 0);
}

export function getDailyBarChartData(
  trackers: Tracker[],
  logsByDate: { [date: string]: Log[] }
): Array<{ name: string; Completed: number }> {
  const data = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logsByDate[dateStr] || [];

    let completed = 0;
    trackers.forEach((t) => {
      if (isTrackerCompletedOnDate(t, dateStr, dayLogs)) completed++;
    });

    const label = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    data.push({ name: label, Completed: completed });
  }
  return data;
}

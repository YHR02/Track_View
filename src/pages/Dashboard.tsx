import { useMemo, useState, useEffect } from 'react';
import { useTrackers } from '../hooks/use-trackers';
import { useLogsByDate, useUpsertLog, useLogsByRange } from '../hooks/use-logs';
import { Tracker } from '../types/tracker';
import { Log } from '../types/entry';
import { TimerControl } from '../components/dashboard/TimerControl';
import { isTrackerCompleted } from '../services/analytics.service';
import { spreadsheetService } from '../services/spreadsheet.service';
import { useToastStore } from '../stores/toast.store';
import { Modal } from '../components/ui/Modal';
import { Logo } from '../components/ui/Logo';
import { 
  Check, 
  Plus, 
  Minus, 
  Command,
  Search,
  RefreshCw,
  Database,
  Flame
} from 'lucide-react';

export function Dashboard() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const addToast = useToastStore((s) => s.addToast);

  const { data: trackers = [], isLoading: loadingTrackers } = useTrackers();
  const { data: logs = [], isLoading: loadingLogs } = useLogsByDate(todayStr);
  const upsertLogMut = useUpsertLog();

  const [repairing, setRepairing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Command Palette / Search Menu State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Logging modal details
  const [activeLogEdit, setActiveLogEdit] = useState<{ tracker: Tracker; dateStr: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNote, setEditNote] = useState('');

  // 1. Calculate past 365 days range
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 364);
    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    };
  }, []);

  const { data: yearlyLogs = [], isLoading: loadingYearly } = useLogsByRange(
    dateRange.startStr,
    dateRange.endStr
  );

  const logsByDate = useMemo(() => {
    const map: Record<string, Log[]> = {};
    yearlyLogs.forEach((log) => {
      if (!map[log.date]) map[log.date] = [];
      map[log.date].push(log);
    });
    return map;
  }, [yearlyLogs]);

  // Today's logs map
  const getLogForTracker = (trackerId: string): Log | undefined => {
    return logs.find((l) => l.trackerId === trackerId);
  };

  const getLogForTrackerAndDate = (trackerId: string, dateStr: string): Log | undefined => {
    const dayLogs = logsByDate[dateStr] || [];
    return dayLogs.find((l) => l.trackerId === trackerId);
  };

  // Calculate current week dates (Mon to Sun)
  const currentWeekDates = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(today.setDate(diff));

    const dates: Array<{ dateStr: string; label: string; isToday: boolean }> = [];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      dates.push({
        dateStr: dStr,
        label: dayLabels[i],
        isToday: dStr === todayStr,
      });
    }
    return dates;
  }, [todayStr]);

  // 2. Generate Heatmap Grid (Exactly 53 columns * 7 days = 371 days)
  const heatmapDays = useMemo(() => {
    if (trackers.length === 0) return [];
    const days: Array<{ dateStr: string; date: Date; level: number; completed: number; total: number }> = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const totalGridDays = 53 * 7;
    const startOffset = totalGridDays - 1 - dayOfWeek;

    const startDate = new Date();
    startDate.setDate(today.getDate() - startOffset);

    for (let i = 0; i < totalGridDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dStr = d.toISOString().split('T')[0];

      const dayLogs = logsByDate[dStr] || [];
      const total = trackers.length;
      let completed = 0;

      trackers.forEach((t) => {
        const log = dayLogs.find((l) => l.trackerId === t.trackerId);
        if (log && isTrackerCompleted(t, log.value)) {
          completed++;
        }
      });

      const score = total > 0 ? completed / total : 0;
      let level = 0;
      if (completed > 0) {
        if (score <= 0.33) level = 1;
        else if (score <= 0.66) level = 2;
        else level = 3;
      }

      days.push({
        dateStr: dStr,
        date: d,
        level,
        completed,
        total,
      });
    }
    return days;
  }, [trackers, logsByDate]);

  const weeks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < heatmapDays.length; i += 7) {
      chunks.push(heatmapDays.slice(i, i + 7));
    }
    return chunks;
  }, [heatmapDays]);

  // 3. Calculate Streaks & Consistency Scores
  const stats = useMemo(() => {
    let currentStreak = 0;
    let longestStreak = 0;
    let perfectDays = 0;
    let activeDays = 0;

    const datesDesc: string[] = [];
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      datesDesc.push(d.toISOString().split('T')[0]);
    }

    let checkStreak = true;
    for (const dStr of datesDesc) {
      const dayLogs = logsByDate[dStr] || [];
      const total = trackers.length;
      const completed = trackers.filter((t) => {
        const log = dayLogs.find((l) => l.trackerId === t.trackerId);
        return log ? isTrackerCompleted(t, log.value) : false;
      }).length;

      if (total > 0 && completed > 0) {
        if (checkStreak) currentStreak++;
        activeDays++;
        if (completed === total) perfectDays++;
      } else {
        if (dStr !== todayStr) {
          checkStreak = false;
        } else {
          // Check yesterday to maintain streak if today has no logs yet
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = yesterday.toISOString().split('T')[0];
          const yLogs = logsByDate[yStr] || [];
          const yCompleted = trackers.filter((t) => {
            const log = yLogs.find((l) => l.trackerId === t.trackerId);
            return log ? isTrackerCompleted(t, log.value) : false;
          }).length;
          if (yCompleted === 0) {
            checkStreak = false;
          }
        }
      }
    }

    // Longest streak
    let tempStreak = 0;
    const datesAsc = [...datesDesc].reverse();
    for (const dStr of datesAsc) {
      const dayLogs = logsByDate[dStr] || [];
      const total = trackers.length;
      const completed = trackers.filter((t) => {
        const log = dayLogs.find((l) => l.trackerId === t.trackerId);
        return log ? isTrackerCompleted(t, log.value) : false;
      }).length;

      if (total > 0 && completed > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    const consistency = trackers.length > 0 ? Math.round((activeDays / 365) * 100) : 0;

    // Average completion score
    let totalScoreSum = 0;
    let scoredDays = 0;
    for (const dStr of datesDesc) {
      const dayLogs = logsByDate[dStr] || [];
      if (dayLogs.length > 0) {
        const completed = trackers.filter((t) => {
          const log = dayLogs.find((l) => l.trackerId === t.trackerId);
          return log ? isTrackerCompleted(t, log.value) : false;
        }).length;
        totalScoreSum += trackers.length > 0 ? (completed / trackers.length) * 100 : 0;
        scoredDays++;
      }
    }
    const avgScore = scoredDays > 0 ? Math.round(totalScoreSum / scoredDays) : 0;

    // Weekly Score (Completions this week / total possible completions this week)
    let weeklyCompletions = 0;
    currentWeekDates.forEach((day) => {
      const dayLogs = logsByDate[day.dateStr] || [];
      trackers.forEach((t) => {
        const log = dayLogs.find((l) => l.trackerId === t.trackerId);
        if (log && isTrackerCompleted(t, log.value)) {
          weeklyCompletions++;
        }
      });
    });
    const weeklyScore = trackers.length > 0 ? Math.round((weeklyCompletions / (trackers.length * 7)) * 100) : 0;

    // Monthly Score (Completions this month / total possible completions this month)
    const currentMonthIndex = today.getMonth();
    const currentYearVal = today.getFullYear();
    const daysInMonth = new Date(currentYearVal, currentMonthIndex + 1, 0).getDate();
    let monthlyCompletions = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYearVal}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayLogs = logsByDate[dateStr] || [];
      trackers.forEach((t) => {
        const log = dayLogs.find((l) => l.trackerId === t.trackerId);
        if (log && isTrackerCompleted(t, log.value)) {
          monthlyCompletions++;
        }
      });
    }
    const monthlyScore = trackers.length > 0 ? Math.round((monthlyCompletions / (trackers.length * daysInMonth)) * 100) : 0;

    return {
      currentStreak,
      longestStreak,
      perfectDays,
      consistency,
      avgScore,
      weeklyScore,
      monthlyScore,
    };
  }, [trackers, logsByDate, todayStr, currentWeekDates]);

  // Recent Activity timeline
  const recentTimeline = useMemo(() => {
    return [...yearlyLogs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4);
  }, [yearlyLogs]);

  // Click handler for matrix cell
  const handleCellClick = (tracker: Tracker, dateStr: string) => {
    const log = getLogForTrackerAndDate(tracker.trackerId, dateStr);
    if (tracker.type === 'boolean') {
      const newValue = log?.value === 'true' ? 'false' : 'true';
      upsertLogMut.mutate({
        trackerId: tracker.trackerId,
        date: dateStr,
        value: newValue,
        note: log?.note || null,
      });
      addToast(`${tracker.name} toggled.`, 'success');
    } else {
      setActiveLogEdit({ tracker, dateStr });
      setEditValue(log ? log.value : '');
      setEditNote(log?.note || '');
    }
  };

  const handleSaveLog = () => {
    if (!activeLogEdit) return;
    upsertLogMut.mutate({
      trackerId: activeLogEdit.tracker.trackerId,
      date: activeLogEdit.dateStr,
      value: editValue || (activeLogEdit.tracker.type === 'boolean' ? 'true' : '0'),
      note: editNote || null,
    });
    setActiveLogEdit(null);
    addToast('Log successfully updated.', 'success');
  };

  const handleForceRepair = async () => {
    setRepairing(true);
    try {
      addToast('Repairing workspace structure...', 'info');
      await spreadsheetService.forceRepairWorkspace();
      addToast('Workspace successfully verified & repaired.', 'success');
    } catch (err: any) {
      addToast(err.message || 'Repair failed.', 'error');
    } finally {
      setRepairing(false);
    }
  };

  // Keyboard shortcut listener for Command Menu (⌘K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTrackers = useMemo(() => {
    if (!searchQuery) return trackers;
    return trackers.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [trackers, searchQuery]);

  return (
    <div className="space-y-6 select-none font-sans text-zinc-100 bg-[#09090b]">
      
      {/* 1. Brand Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Logo size={28} />
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-100">Personal Operating System</h2>
            <span className="text-[10px] text-zinc-500 font-mono">
              {today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-zinc-800 bg-zinc-900/40 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search console</span>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-mono">⌘K</kbd>
          </button>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-zinc-800 bg-zinc-900/30 text-[10px] text-zinc-400 font-mono">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>STREAK: {stats.currentStreak} DAYS</span>
          </div>
        </div>
      </div>

      {loadingTrackers || loadingLogs || loadingYearly ? (
        <div className="space-y-6">
          <div className="h-28 rounded border border-zinc-800 bg-zinc-900/20 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            {Array(7).fill(0).map((_, i) => (
              <div key={i} className="h-16 rounded border border-zinc-800 bg-zinc-900/20 animate-pulse" />
            ))}
          </div>
        </div>
      ) : trackers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-800 bg-zinc-900/10 rounded-lg max-w-xl mx-auto space-y-4">
          <h3 className="text-xs font-bold text-zinc-200">No active trackers found</h3>
          <p className="text-xs text-zinc-500 max-w-sm">Create habit trackers in the configuration tab to spin up your weekly matrix dashboard.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Console Section - 9 Columns */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* 2. Yearly Contribution Heatmap */}
            <div className="brutalist-card p-4 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                <span>Yearly Habit Heatmap</span>
                <span>365 DAYS RECORD</span>
              </div>
              
              <div className="flex flex-col overflow-x-auto">
                <div className="flex gap-[3px] py-1 select-none">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px] shrink-0">
                      {week.map((day) => (
                        <div
                          key={day.dateStr}
                          className={`w-[10px] h-[10px] rounded-[1px] transition-colors duration-100 tooltip-trigger relative cursor-pointer ${
                            day.level === 0 ? 'bg-zinc-900 border border-zinc-800/40' :
                            day.level === 1 ? 'bg-emerald-950 border border-emerald-900/40' :
                            day.level === 2 ? 'bg-emerald-800/80 border border-emerald-700/50' :
                            'bg-emerald-500'
                          }`}
                        >
                          <div className="tooltip-content pointer-events-none opacity-0 invisible absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-zinc-900 border border-zinc-850 text-[9px] font-mono text-zinc-100 rounded shadow-md whitespace-nowrap z-50 transition-all duration-100">
                            <span className="font-semibold block">{day.completed} / {day.total} targets met</span>
                            <span className="text-zinc-500">{day.dateStr}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Weekly Habit Matrix */}
            <div className="brutalist-card p-4 space-y-3">
              <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono pb-2 border-b border-zinc-900">
                <span>Weekly Habit Matrix</span>
                <span>CLICK CELL TO EDIT LOG</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="text-[10px] font-bold text-zinc-500 font-mono uppercase">
                      <th className="pb-3 pr-4 font-semibold">HABIT TARGETS</th>
                      {currentWeekDates.map((day) => (
                        <th key={day.dateStr} className={`pb-3 px-2 text-center w-14 font-semibold ${day.isToday ? 'text-zinc-200' : ''}`}>
                          <div>{day.label}</div>
                          <div className="text-[8px] text-zinc-650 font-normal mt-0.5">{day.dateStr.slice(5)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 font-medium">
                    {trackers.map((t) => (
                      <tr key={t.trackerId} className="hover:bg-zinc-900/10">
                        <td className="py-2.5 pr-4 flex items-center gap-2">
                          <span className="text-base select-none shrink-0">{t.icon}</span>
                          <div>
                            <span className="font-semibold text-zinc-200 block text-xs">{t.name}</span>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block mt-0.5">
                              {t.type} · {t.frequency}
                            </span>
                          </div>
                        </td>

                        {currentWeekDates.map((day) => {
                          const log = getLogForTrackerAndDate(t.trackerId, day.dateStr);
                          const isDone = log ? isTrackerCompleted(t, log.value) : false;

                          return (
                            <td key={day.dateStr} className="py-2.5 px-2 text-center">
                              <button
                                onClick={() => handleCellClick(t, day.dateStr)}
                                className={`w-8 h-8 rounded border transition-all inline-flex items-center justify-center relative tooltip-trigger cursor-pointer ${
                                  isDone 
                                    ? 'bg-emerald-950/20 border-emerald-800 text-emerald-450 hover:bg-emerald-950/40' 
                                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 text-zinc-600'
                                }`}
                              >
                                {isDone ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3.5] animate-check-pop" />
                                ) : (
                                  <span className="text-[9px] opacity-40 uppercase font-mono">{day.label.slice(0,2)}</span>
                                )}

                                {/* Hover tooltip displaying details */}
                                <div className="tooltip-content pointer-events-none opacity-0 invisible absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-200 rounded shadow-lg whitespace-nowrap z-50 transition-all duration-100">
                                  <span className="font-semibold block text-zinc-100">{t.name} ({day.label})</span>
                                  <span className="text-zinc-400 block mt-0.5">LOG: {log ? log.value : 'No entry'}</span>
                                  {log?.note && <span className="text-zinc-500 block max-w-xs truncate italic">"{log.note}"</span>}
                                  <span className="text-zinc-600 block text-[9px] mt-1">{day.dateStr}</span>
                                </div>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Statistics Metrics Panels */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">Discipline Performance Analytics</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                <div className="brutalist-card p-3 text-left">
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase font-mono block">Current Streak</span>
                  <span className="text-lg font-bold text-zinc-100 block mt-1">{stats.currentStreak}d</span>
                </div>
                <div className="brutalist-card p-3 text-left">
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase font-mono block">Longest Streak</span>
                  <span className="text-lg font-bold text-zinc-100 block mt-1">{stats.longestStreak}d</span>
                </div>
                <div className="brutalist-card p-3 text-left">
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase font-mono block">Perfect Days</span>
                  <span className="text-lg font-bold text-zinc-100 block mt-1">{stats.perfectDays}d</span>
                </div>
                <div className="brutalist-card p-3 text-left">
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase font-mono block">Consistency</span>
                  <span className="text-lg font-bold text-zinc-100 block mt-1">{stats.consistency}%</span>
                </div>
                <div className="brutalist-card p-3 text-left">
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase font-mono block">Average Score</span>
                  <span className="text-lg font-bold text-zinc-100 block mt-1">{stats.avgScore}%</span>
                </div>
                <div className="brutalist-card p-3 text-left">
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase font-mono block">Weekly Score</span>
                  <span className="text-lg font-bold text-zinc-100 block mt-1">{stats.weeklyScore}%</span>
                </div>
                <div className="brutalist-card p-3 text-left">
                  <span className="text-[9px] font-semibold text-zinc-500 uppercase font-mono block">Monthly Score</span>
                  <span className="text-lg font-bold text-zinc-100 block mt-1">{stats.monthlyScore}%</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Sidebar Panel - 3 Columns */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Quick Actions Panel */}
            <div className="brutalist-card p-4 space-y-3">
              <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="w-full text-left py-2 px-3 rounded text-xs font-medium border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 text-zinc-300 hover:text-white transition-all flex items-center justify-between cursor-pointer"
                >
                  <span>Search habits</span>
                  <Command className="w-3.5 h-3.5 text-zinc-500" />
                </button>

                <button
                  onClick={() => {
                    setSyncing(true);
                    addToast('Synchronising database...', 'info');
                    setTimeout(() => {
                      setSyncing(false);
                      addToast('Database successfully synced.', 'success');
                    }, 500);
                  }}
                  disabled={syncing}
                  className="w-full text-left py-2 px-3 rounded text-xs font-medium border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 text-zinc-300 hover:text-white transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                >
                  <span>Sync GSheet</span>
                  <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${syncing ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handleForceRepair}
                  disabled={repairing}
                  className="w-full text-left py-2 px-3 rounded text-xs font-medium border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 text-zinc-300 hover:text-white transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                >
                  <span>Verify Database</span>
                  <Database className="w-3.5 h-3.5 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Upcoming Goals Panel */}
            <div className="brutalist-card p-4 space-y-3">
              <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2">
                Upcoming Goals
              </h3>
              
              {trackers.length === 0 ? (
                <p className="text-[10px] text-zinc-500">No targets configured</p>
              ) : (
                <div className="space-y-2.5">
                  {trackers.slice(0, 4).map((t) => (
                    <div key={t.trackerId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{t.icon}</span>
                        <span className="font-semibold text-zinc-350 truncate">
                          {t.name}
                        </span>
                      </div>
                      
                      {t.target ? (
                        <span className="font-mono text-[10px] text-zinc-500">
                          {t.target} {t.unit || ''}
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] text-zinc-600">COMPLETION</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Timeline Trace */}
            <div className="brutalist-card p-4 space-y-3">
              <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-900 pb-2">
                Recent Activity Trace
              </h3>

              {recentTimeline.length === 0 ? (
                <p className="text-[10px] text-zinc-500 font-mono">No entries recorded</p>
              ) : (
                <div className="space-y-3 font-mono">
                  {recentTimeline.map((item) => {
                    const matchTracker = trackers.find((t) => t.trackerId === item.trackerId);
                    if (!matchTracker) return null;
                    return (
                      <div key={item.entryId} className="text-[9px] text-zinc-400 flex flex-col space-y-0.5 leading-relaxed">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-350 truncate max-w-[120px]">
                            {matchTracker.icon} {matchTracker.name}
                          </span>
                          <span className="text-zinc-600 text-[8px]">
                            {item.date}
                          </span>
                        </div>
                        <p className="text-zinc-500">
                          Logged: <strong className="text-zinc-350">{item.value}</strong> {item.note ? `("${item.note}")` : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 5. Raycast-inspired Command Menu Modal */}
      {searchOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs select-none"
          onClick={() => setSearchOpen(false)}
        >
          <div 
            className="w-full max-w-lg border border-zinc-800 bg-zinc-950 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[400px] animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
              <Search className="w-4 h-4 text-zinc-500 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search habits or trigger syncs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 text-sm outline-none text-zinc-100 placeholder-zinc-500 font-medium"
              />
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-500 uppercase">ESC</kbd>
            </div>

            {/* List Results */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredTrackers.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No matching habits or targets found
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Habits and Targets
                  </div>
                  {filteredTrackers.map((t) => {
                    const log = getLogForTracker(t.trackerId);
                    const isCompleted = t.type === 'boolean' 
                      ? log?.value === 'true'
                      : t.type === 'numeric'
                      ? (log ? parseFloat(log.value) || 0 : 0) >= (t.target ?? 0)
                      : false;

                    return (
                      <button
                        key={t.trackerId}
                        onClick={() => {
                          handleCellClick(t, todayStr);
                          setSearchOpen(false);
                        }}
                        className="w-full text-left p-2 rounded flex items-center justify-between text-xs hover:bg-zinc-900/60 transition-colors text-zinc-300 hover:text-zinc-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span>{t.icon}</span>
                          <span className="font-medium">{t.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500 font-mono capitalize">{t.type}</span>
                          {isCompleted ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-zinc-800" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-zinc-900/40 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
              <span>Select habit to view details or log entry</span>
              <span>⌘K to toggle</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. High-Density Interactive Logging Modal */}
      <Modal
        isOpen={activeLogEdit !== null}
        onClose={() => setActiveLogEdit(null)}
        title={activeLogEdit ? `Log Entry — ${activeLogEdit.tracker.name}` : 'Log Entry'}
      >
        {activeLogEdit && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase pb-2 border-b border-zinc-900">
              <span>Date: {activeLogEdit.dateStr}</span>
              <span>Type: {activeLogEdit.tracker.type}</span>
            </div>

            {/* Logging value configure */}
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Completed Value
              </label>

              {activeLogEdit.tracker.type === 'boolean' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditValue('true')}
                    className={`flex-1 py-2 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                      editValue === 'true'
                        ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditValue('false')}
                    className={`flex-1 py-2 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                      editValue === 'false' || !editValue
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-450'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              )}

              {activeLogEdit.tracker.type === 'numeric' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditValue(prev => Math.max(0, (parseInt(prev) || 0) - 1).toString())}
                      className="w-9 h-9 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="brutalist-input flex-1 px-3 py-2 text-center text-xs"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setEditValue(prev => ((parseInt(prev) || 0) + 1).toString())}
                      className="w-9 h-9 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {activeLogEdit.tracker.target && (
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Target: {activeLogEdit.tracker.target} {activeLogEdit.tracker.unit}
                    </div>
                  )}
                </div>
              )}

              {activeLogEdit.tracker.type === 'duration' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="brutalist-input w-full px-3 py-2 text-xs font-mono"
                    placeholder="e.g. 30:00 (MM:SS)"
                  />
                  <div className="p-3.5 rounded border border-zinc-800/80 bg-zinc-900/10">
                    <TimerControl
                      tracker={activeLogEdit.tracker}
                      logValue={editValue}
                      onLogChange={(val) => setEditValue(val)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Note text field */}
            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Log Notes
              </label>
              <textarea
                placeholder="Add optional notes (e.g. breakfast details, workout focus)..."
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="brutalist-input w-full px-3 py-2 text-xs h-16 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-900">
              <button
                type="button"
                onClick={handleSaveLog}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 flex-1 py-2 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                Save Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveLogEdit(null)}
                className="bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 px-3 py-2 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

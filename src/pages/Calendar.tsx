import { useState, useMemo } from 'react';
import { useTrackers } from '../hooks/use-trackers';
import { useLogsByMonth, useUpsertLog } from '../hooks/use-logs';
import { logService } from '../services/log.service';
import { getDayCompletionRate, isTrackerCompleted } from '../services/analytics.service';
import { Tracker } from '../types/tracker';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  CheckCircle,
  Plus,
  Minus
} from 'lucide-react';

export function Calendar() {
  const today = new Date();
  
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString().split('T')[0]);

  const { data: trackers = [] } = useTrackers();
  
  const { data: monthLogs = [], isLoading: loadingLogs } = useLogsByMonth(currentYear, currentMonth + 1);
  const upsertLogMut = useUpsertLog();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const logsByDate = useMemo(() => {
    return logService.groupLogsByDate(monthLogs);
  }, [monthLogs]);

  const getDayCompletionRateLocal = (dateStr: string): number => {
    const dayLogs = logsByDate[dateStr] || [];
    return getDayCompletionRate(dateStr, trackers, dayLogs);
  };

  const getCellColorClass = (rate: number): string => {
    if (rate === 0) return 'bg-zinc-900 border border-zinc-800/80 text-zinc-400';
    if (rate < 30) return 'bg-emerald-950/20 border border-emerald-900/40 text-emerald-450';
    if (rate < 70) return 'bg-emerald-900/40 border border-emerald-800/60 text-emerald-350';
    return 'bg-emerald-500 text-zinc-950 border border-emerald-450 font-bold';
  };

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  for (let i = 0; i < firstDayIndex; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth, day);
    currentWeek.push(dateObj);
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const selectedLogs = monthLogs.filter((l) => l.date === selectedDate);
  const getSelectedLog = (trackerId: string) => selectedLogs.find((l) => l.trackerId === trackerId);

  const toggleSelectedBoolean = (tracker: Tracker) => {
    const existing = getSelectedLog(tracker.trackerId);
    const newValue = existing?.value === 'true' ? 'false' : 'true';
    upsertLogMut.mutate({
      trackerId: tracker.trackerId,
      date: selectedDate,
      value: newValue,
    });
  };

  const adjustSelectedNumeric = (tracker: Tracker, delta: number) => {
    const existing = getSelectedLog(tracker.trackerId);
    const currentVal = existing ? parseInt(existing.value) || 0 : 0;
    const nextVal = Math.max(0, currentVal + delta);
    upsertLogMut.mutate({
      trackerId: tracker.trackerId,
      date: selectedDate,
      value: nextVal.toString(),
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-8 animate-pop-in text-zinc-100 font-sans">
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
        <CalendarIcon className="w-6 h-6 text-zinc-400 stroke-[2]" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Calendar Log</h2>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">View history and manage habit entries chronologically</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid Card */}
        <div className="lg:col-span-2 brutalist-card p-6">
          
          {/* Calendar Header Controls */}
          <div className="flex items-center justify-between mb-6 pb-2 border-b border-zinc-900">
            <h3 className="font-semibold text-sm text-zinc-150">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 mb-4">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {loadingLogs ? (
            <div className="grid grid-cols-7 gap-2.5">
              {Array(35).fill(0).map((_, i) => (
                <div key={i} className="aspect-square rounded border border-zinc-800 bg-zinc-900/20 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-7 gap-2.5">
                  {week.map((day, dIdx) => {
                    if (!day) return <div key={dIdx} className="aspect-square" />;
                    
                    const dateStr = day.toISOString().split('T')[0];
                    const rate = getDayCompletionRateLocal(dateStr);
                    const colorClass = getCellColorClass(rate);
                    const isSelected = selectedDate === dateStr;

                    return (
                      <button
                        key={dIdx}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`aspect-square rounded flex flex-col items-center justify-center relative font-mono text-[10px] transition-all hover:border-zinc-650 cursor-pointer ${colorClass} ${
                          isSelected ? 'border-zinc-100 ring-1 ring-zinc-100' : ''
                        }`}
                      >
                        <span className="font-semibold text-xs">{day.getDate()}</span>
                        {rate > 0 && (
                          <span className={`text-[8px] mt-0.5 leading-none ${rate === 100 ? 'text-zinc-950 font-bold' : 'text-zinc-500'}`}>
                            {rate}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Day Logs Panel */}
        <div className="space-y-6">
          <div className="brutalist-card p-6 flex flex-col">
            <h3 className="font-semibold text-sm text-zinc-150 mb-4 pb-2 border-b border-zinc-900">
              {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>

            {trackers.length === 0 ? (
              <p className="text-xs text-zinc-500">No trackers active to display.</p>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                {trackers.map((t) => {
                  const log = getSelectedLog(t.trackerId);
                  const isDone = log ? isTrackerCompleted(t, log.value) : false;

                  return (
                    <div 
                      key={t.trackerId}
                      className="p-3 rounded border border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{t.icon}</span>
                        <div>
                          <div className="font-semibold text-zinc-200">{t.name}</div>
                          {t.type !== 'boolean' && (
                            <div className="text-[9px] font-mono text-zinc-500 mt-0.5">
                              Logged: {log ? log.value : '—'} / {t.target ?? 0} {t.unit}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Log Action in history */}
                      <div>
                        {t.type === 'boolean' ? (
                          <button
                            onClick={() => toggleSelectedBoolean(t)}
                            className={`p-1 rounded border transition-colors cursor-pointer active:scale-95 ${
                              isDone
                                ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : t.type === 'numeric' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => adjustSelectedNumeric(t, -1)}
                              className="w-6 h-6 border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-250 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs w-6 text-center font-semibold text-zinc-300">
                              {log ? log.value : 0}
                            </span>
                            <button
                              onClick={() => adjustSelectedNumeric(t, 1)}
                              className="w-6 h-6 border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-250 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          // Duration read-only status tag
                          <div className={`px-2 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider ${
                            isDone ? 'bg-emerald-950/20 border-emerald-800 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-550'
                          }`}>
                            {isDone ? 'Goal met' : 'Pending'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // Helper arrays for calendar rendering
  const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number): number => {
    return new Date(year, month, 1).getDay();
  };

  // Build grid data structure
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  // Group logs by date (memoized to avoid recalculating on selectedDate changes)
  const logsByDate = useMemo(() => {
    return logService.groupLogsByDate(monthLogs);
  }, [monthLogs]);

  // Calculate day completion rate using domain helper
  const getDayCompletionRateLocal = (dateStr: string): number => {
    const dayLogs = logsByDate[dateStr] || [];
    return getDayCompletionRate(dateStr, trackers, dayLogs);
  };

  const getCellColorClass = (rate: number): string => {
    if (rate === 0) return 'bg-white text-black border-2 border-black';
    if (rate < 30) return 'bg-[#E3DFF2] text-black border-2 border-black';
    if (rate < 70) return 'bg-[#7FBC8C] text-black border-2 border-black font-bold';
    return 'bg-[#90EE90] text-black border-2 border-black font-black';
  };

  // Generate weeks grid
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Pad the first week
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

  // Pad final week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  // Selected date logs
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
    <div className="space-y-8 animate-pop-in">
      <div className="flex items-center gap-3">
        <CalendarIcon className="w-8 h-8 text-black stroke-[2.5]" />
        <div>
          <h2 className="text-3xl font-display font-black text-black">Calendar</h2>
          <p className="text-sm opacity-65 font-bold">View history and manage habit entries chronologically</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Calendar Grid Card */}
        <div className="lg:col-span-2 p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000]">
          
          {/* Calendar Header Controls */}
          <div className="flex items-center justify-between mb-6 pb-2 border-b-3 border-black">
            <h3 className="font-display font-black text-xl text-black">
              {monthNames[currentMonth]} {currentYear}
            </h3>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="w-9 h-9 border-2 border-black bg-white rounded-lg shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none flex items-center justify-center cursor-pointer font-black"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="w-9 h-9 border-2 border-black bg-white rounded-lg shadow-[2px_2px_0px_#000000] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#000000] active:translate-y-[2px] active:shadow-none flex items-center justify-center cursor-pointer font-black"
              >
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-7 gap-2.5 text-center text-xs font-black uppercase opacity-75 mb-4 font-display">
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
                <div key={i} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 animate-pulse bg-slate-50" />
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
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center relative font-mono text-xs transition-all hover:scale-105 cursor-pointer ${colorClass} ${
                          isSelected ? 'ring-3 ring-black scale-102 shadow-[2px_2px_0px_#000000]' : ''
                        }`}
                      >
                        <span className="font-extrabold text-sm">{day.getDate()}</span>
                        {rate > 0 && (
                          <span className="text-[9px] font-black opacity-80 mt-0.5 leading-none">
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
          <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] flex flex-col">
            <h3 className="font-display font-black text-lg mb-4 pb-2 border-b-3 border-black text-black">
              {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>

            {trackers.length === 0 ? (
              <p className="text-xs font-bold opacity-60">No trackers active to display.</p>
            ) : (
              <div className="space-y-4 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                {trackers.map((t) => {
                  const log = getSelectedLog(t.trackerId);
                  const isDone = log ? isTrackerCompleted(t, log.value) : false;

                  return (
                    <div 
                      key={t.trackerId}
                      className="p-3.5 rounded-xl border-3 border-black bg-white flex items-center justify-between gap-3 text-sm font-bold shadow-[3px_3px_0px_#000000]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{t.icon}</span>
                        <div>
                          <div className="font-display font-black text-xs md:text-sm text-black">{t.name}</div>
                          {t.type !== 'boolean' && (
                            <div className="text-[10px] font-mono opacity-65 mt-0.5">
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
                            className={`p-1.5 rounded-lg border-2 border-black transition cursor-pointer active:scale-90 ${
                              isDone
                                ? 'bg-[#90EE90] text-black shadow-[1px_1px_0px_#000000]'
                                : 'bg-white text-black'
                            }`}
                          >
                            <CheckCircle className="w-5 h-5 stroke-[2.5]" />
                          </button>
                        ) : t.type === 'numeric' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => adjustSelectedNumeric(t, -1)}
                              className="w-7 h-7 border-2 border-black bg-white rounded-lg flex items-center justify-center font-black active:translate-y-[1px]"
                            >
                              <Minus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <span className="font-mono text-xs w-6 text-center font-black">
                              {log ? log.value : 0}
                            </span>
                            <button
                              onClick={() => adjustSelectedNumeric(t, 1)}
                              className="w-7 h-7 border-2 border-black bg-white rounded-lg flex items-center justify-center font-black active:translate-y-[1px]"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          // Duration read-only status tag
                          <div className={`px-2 py-1 rounded-lg border-2 border-black text-[9px] font-black tracking-wider uppercase ${
                            isDone ? 'bg-[#90EE90] text-black' : 'bg-slate-100 opacity-60 text-black'
                          }`}>
                            {isDone ? 'Goal met' : 'Unfinished'}
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

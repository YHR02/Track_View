import { useMemo } from 'react';
import { useTrackers } from '../hooks/use-trackers';
import { useLogsByDate, useUpsertLog } from '../hooks/use-logs';
import { useCategories } from '../hooks/use-categories';
import { Tracker } from '../types/tracker';
import { Log } from '../types/entry';
import { TimerControl } from '../components/dashboard/TimerControl';
import { isTrackerCompleted } from '../services/analytics.service';
import { 
  Check, 
  Plus, 
  Minus, 
  Calendar,
  Sparkles
} from 'lucide-react';

export function Dashboard() {
  
  const todayStr = new Date().toISOString().split('T')[0];
  
  const { data: trackers = [], isLoading: loadingTrackers } = useTrackers();
  const { data: logs = [], isLoading: loadingLogs } = useLogsByDate(todayStr);
  const { data: categories = [] } = useCategories();
  const upsertLogMut = useUpsertLog();

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.categoryId, c]));
  }, [categories]);

  const getLogForTracker = (trackerId: string): Log | undefined => {
    return logs.find((l) => l.trackerId === trackerId);
  };

  const handleToggleBoolean = (tracker: Tracker) => {
    const existing = getLogForTracker(tracker.trackerId);
    const newValue = existing?.value === 'true' ? 'false' : 'true';
    
    upsertLogMut.mutate({
      trackerId: tracker.trackerId,
      date: todayStr,
      value: newValue,
    });
  };

  const handleNumericChange = (tracker: Tracker, delta: number) => {
    const existing = getLogForTracker(tracker.trackerId);
    const currentVal = existing ? parseInt(existing.value) || 0 : 0;
    const nextVal = Math.max(0, currentVal + delta);
    
    upsertLogMut.mutate({
      trackerId: tracker.trackerId,
      date: todayStr,
      value: nextVal.toString(),
    });
  };

  const handleDurationChange = (tracker: Tracker, durationStr: string) => {
    upsertLogMut.mutate({
      trackerId: tracker.trackerId,
      date: todayStr,
      value: durationStr,
    });
  };

  // Stats calculation memoized
  const { totalTrackers, completedTrackers, completionPercentage } = useMemo(() => {
    const total = trackers.length;
    const completed = trackers.filter((t) => {
      const log = logs.find((l) => l.trackerId === t.trackerId);
      return log ? isTrackerCompleted(t, log.value) : false;
    }).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { totalTrackers: total, completedTrackers: completed, completionPercentage: percent };
  }, [trackers, logs]);

  // Rota of pastel colors for card backgrounds
  const cardColors = [
    'bg-[#FFB2EF]', // Pink
    'bg-[#87CEEB]', // Blue
    'bg-[#FFDB58]', // Yellow
    'bg-[#FFA07A]', // Orange
    'bg-[#A388EE]', // Purple
    'bg-[#E3DFF2]', // Lavender
  ];

  return (
    <div className="space-y-8 animate-pop-in">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black text-[#9723C9] uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" /> Today's Focus
          </span>
          <h2 className="text-3xl font-display font-black tracking-tight leading-none text-black">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h2>
        </div>

        {/* Date Selector Indicator */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-3 border-black bg-white shadow-[3px_3px_0px_#000000] text-xs font-black text-black">
          <Calendar className="w-4 h-4 stroke-[2.5]" />
          <span>Daily Habit Log</span>
        </div>
      </div>

      {loadingTrackers || loadingLogs ? (
        <div className="space-y-6">
          <div className="h-24 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div 
                key={n} 
                className="h-48 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : totalTrackers === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] max-w-xl mx-auto">
          <h3 className="text-xl font-display font-black text-black">No active trackers</h3>
          <p className="text-sm font-semibold opacity-60 max-w-sm mt-2 mb-6">Create habits in the Trackers page to start logging your daily details.</p>
        </div>
      ) : (
        <>
          {/* Progress summary banner */}
          <div className="p-6 rounded-[18px] border-4 border-black bg-[#E3DFF2] shadow-[6px_6px_0px_#000000] flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-black text-black">Today's Progress</h3>
              <p className="text-sm font-bold opacity-75">You completed {completedTrackers} of {totalTrackers} trackers today!</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Progress bar */}
              <div className="w-32 md:w-48 h-6 rounded-full border-3 border-black bg-white p-0.5 overflow-hidden shrink-0">
                <div 
                  className="h-full bg-[#A388EE] rounded-full border-r-2 border-black transition-all duration-500 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="text-2xl font-display font-black tracking-tight text-black">
                {completionPercentage}%
              </span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trackers.map((t, idx) => {
              const log = getLogForTracker(t.trackerId);
              const cardBgClass = cardColors[idx % cardColors.length];
              
              // Handle displays based on types
              let isCompleted = false;
              let displayVal = '';

              if (t.type === 'boolean') {
                isCompleted = log?.value === 'true';
              } else if (t.type === 'numeric') {
                const numericVal = log ? parseFloat(log.value) || 0 : 0;
                isCompleted = typeof t.target === 'number' && numericVal >= t.target;
                displayVal = `${numericVal} / ${t.target ?? 0} ${t.unit || ''}`;
              } else if (t.type === 'duration') {
                const durationStr = log?.value || '0:00';
                const parts = durationStr.split(':');
                const numericVal = (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
                isCompleted = typeof t.target === 'number' && numericVal >= t.target;
              }

              return (
                <div
                  key={t.trackerId}
                  className={`p-6 rounded-[18px] border-4 border-black transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-[6px_6px_0px_#000000] hover:translate-y-[-3px] hover:shadow-[9px_9px_0px_#000000] ${cardBgClass}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border-3 border-black bg-white shadow-[2px_2px_0px_#000000]"
                      >
                        {t.icon}
                      </div>
                      <div>
                        <h4 className="font-display font-black text-base md:text-lg leading-tight tracking-tight text-black">{t.name}</h4>
                        {(() => {
                          const cat = categoryMap.get(t.categoryId);
                          return cat ? (
                            <span className="text-[10px] font-black tracking-widest uppercase opacity-60 mt-1 inline-block">
                              {cat.icon} {cat.name}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {isCompleted && (
                      <div className="w-8 h-8 rounded-full border-3 border-black bg-[#90EE90] text-black flex items-center justify-center shadow-[2px_2px_0px_#000000] animate-pop-in shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Actions Section */}
                  <div className="mt-8">
                    {t.type === 'boolean' && (
                      <button
                        onClick={() => handleToggleBoolean(t)}
                        className={`w-full py-3.5 rounded-[14px] border-3 border-black font-black text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:translate-y-[4px] active:shadow-[1px_1px_0px_#000000] shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] ${
                          isCompleted
                            ? 'bg-[#90EE90] text-black'
                            : 'bg-white text-black'
                        }`}
                      >
                        {isCompleted ? '✓ Completed' : 'Mark Complete'}
                      </button>
                    )}

                    {t.type === 'numeric' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-black text-black uppercase tracking-wider">
                          <span>Progress</span>
                          <span className="font-mono">{displayVal}</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleNumericChange(t, -1)}
                            className="w-10 h-10 shrink-0 border-3 border-black bg-white rounded-xl shadow-[3px_3px_0px_#000000] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000000] flex items-center justify-center font-black cursor-pointer"
                          >
                            <Minus className="w-4 h-4 stroke-[3]" />
                          </button>
                          
                          {/* Inner Progress Line */}
                          <div className="flex-1 h-5 rounded-full border-3 border-black bg-white p-0.5 overflow-hidden">
                            <div 
                              className="h-full rounded-full border-r-2 border-black transition-all duration-300 bg-[#FFDB58]"
                              style={{ 
                                width: `${Math.min(100, (log ? parseFloat(log.value) || 0 : 0) / (t.target || 1) * 100)}%` 
                              }}
                            />
                          </div>

                          <button
                            onClick={() => handleNumericChange(t, 1)}
                            className="w-10 h-10 shrink-0 border-3 border-black bg-white rounded-xl shadow-[3px_3px_0px_#000000] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#000000] active:translate-y-[2px] active:shadow-[1px_1px_0px_#000000] flex items-center justify-center font-black cursor-pointer"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    )}

                    {t.type === 'duration' && (
                      <TimerControl
                        tracker={t}
                        logValue={log?.value}
                        onLogChange={(val) => handleDurationChange(t, val)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

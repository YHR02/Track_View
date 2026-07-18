import { useState, useEffect } from 'react';
import { Tracker } from '../../types/tracker';
import { Play, Square } from 'lucide-react';
import { useToastStore } from '../../stores/toast.store';

interface TimerControlProps {
  tracker: Tracker;
  logValue?: string;
  onLogChange: (value: string) => void;
}

export function TimerControl({ tracker, logValue = '', onLogChange }: TimerControlProps) {
  const addToast = useToastStore((s) => s.addToast);
  
  // Timer active state
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Parse existing duration string (MM:ss) to seconds
  const parseSeconds = (durationStr: string): number => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':');
    if (parts.length === 2) {
      return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
    }
    return 0;
  };

  // Convert seconds to duration string (MM:ss)
  const formatDuration = (totalSecs: number): string => {
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Initialize elapsed time when logValue changes from DB
  useEffect(() => {
    if (!isRunning) {
      setElapsedSeconds(parseSeconds(logValue));
    }
  }, [logValue, isRunning]);

  // Tick interval while timer is running
  useEffect(() => {
    let interval: any = null;
    if (isRunning && startTime !== null) {
      interval = setInterval(() => {
        const passed = Math.floor((Date.now() - startTime) / 1000);
        setCurrentTime(elapsedSeconds + passed);
      }, 1000);
    } else {
      setCurrentTime(elapsedSeconds);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime, elapsedSeconds]);

  const handleStart = () => {
    const parsed = parseSeconds(logValue);
    setElapsedSeconds(parsed);
    setStartTime(Date.now());
    setIsRunning(true);
    addToast('Timer started', 'info');
  };

  const handleStop = () => {
    if (!isRunning || startTime === null) return;
    const passed = Math.floor((Date.now() - startTime) / 1000);
    const totalSecs = elapsedSeconds + passed;
    const durationStr = formatDuration(totalSecs);

    setIsRunning(false);
    setStartTime(null);
    setElapsedSeconds(totalSecs);

    onLogChange(durationStr);
    addToast(`Timer stopped. Logged: ${durationStr}`, 'success');
  };

  const currentDurationStr = formatDuration(currentTime);
  const displayVal = `${currentDurationStr} / ${tracker.target ?? 0} ${tracker.unit || 'mins'}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-black text-black uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          {isRunning && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block border border-black" />
          )}
          Stopwatch
        </span>
        <span className="font-mono">{displayVal}</span>
      </div>

      <div className="flex items-center gap-2">
        {isRunning ? (
          <button
            onClick={handleStop}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#FF6B6B] text-black border-3 border-black rounded-[14px] font-black text-xs shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[4px] active:shadow-[1px_1px_0px_#000000] transition-all duration-150 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-black stroke-black" />
            Stop Timer
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black border-3 border-black rounded-[14px] font-black text-xs shadow-[4px_4px_0px_#000000] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#000000] active:translate-y-[4px] active:shadow-[1px_1px_0px_#000000] transition-all duration-150 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-black stroke-black" />
            Start Timer
          </button>
        )}
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { useTrackers } from '../hooks/use-trackers';
import { useLogsByRange } from '../hooks/use-logs';
import { useCategories } from '../hooks/use-categories';
import { logService } from '../services/log.service';
import { 
  calculateTrackerStats, 
  getDailyBarChartData, 
  getCategoryPieChartData 
} from '../services/analytics.service';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Flame, 
  CheckCircle, 
  PieChart as PieIcon,
  Target
} from 'lucide-react';

export function Analytics() {
  const dateRange = useMemo(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 29); // 30 days history
    
    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  }, []);

  const { data: trackers = [] } = useTrackers();
  const { data: logs = [], isLoading } = useLogsByRange(dateRange.start, dateRange.end);
  const { data: categories = [] } = useCategories();

  const logsByDate = useMemo(() => {
    return logService.groupLogsByDate(logs);
  }, [logs]);

  const logsByTracker = useMemo(() => {
    return logService.groupLogsByTracker(logs);
  }, [logs]);

  const trackerStats = useMemo(() => {
    return trackers.map((t) => {
      const tLogs = logsByTracker[t.trackerId] || [];
      const stats = calculateTrackerStats(t, tLogs, logsByDate);
      return {
        tracker: t,
        ...stats,
      };
    });
  }, [trackers, logsByTracker, logsByDate]);

  const dailyBarChartData = useMemo(() => {
    return getDailyBarChartData(trackers, logsByDate);
  }, [trackers, logsByDate]);

  const categoryPieChartData = useMemo(() => {
    return getCategoryPieChartData(trackers, logs, categories);
  }, [trackers, logs, categories]);

  const globalSummary = useMemo(() => {
    if (trackerStats.length === 0) return { avgCompletionRate: 0, bestStreak: 0, totalCompletedEntries: 0 };
    const totalRate = trackerStats.reduce((acc, curr) => acc + curr.completionRate, 0);
    const bestStreak = Math.max(...trackerStats.map((s) => s.longestStreak), 0);
    const totalCompletedEntries = trackerStats.reduce((acc, curr) => acc + curr.completedDaysCount, 0);

    return {
      avgCompletionRate: Math.round(totalRate / trackerStats.length),
      bestStreak,
      totalCompletedEntries
    };
  }, [trackerStats]);

  const CHART_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6 animate-pop-in text-zinc-100 font-sans bg-[#09090b]">
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
        <TrendingUp className="w-6 h-6 text-zinc-400 stroke-[2]" />
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100">Analytics Console</h2>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">Habit performance, metrics breakdown, and consistency streaks</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded border border-zinc-800 bg-zinc-900/20 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded border border-zinc-800 bg-zinc-900/20 animate-pulse" />
        </div>
      ) : trackerStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-800 bg-zinc-900/10 rounded-lg max-w-xl mx-auto space-y-4">
          <h3 className="text-sm font-bold text-zinc-200">No analytics records yet</h3>
          <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">Start marking daily habits checked off on the Dashboard to calculate metrics.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Avg Completion Rate */}
            <div className="brutalist-card p-5 bg-emerald-950/10 border border-emerald-900/60 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider block">Avg Completion</span>
                <h3 className="text-2xl font-bold text-emerald-400">{globalSummary.avgCompletionRate}%</h3>
              </div>
              <div className="w-10 h-10 rounded border border-emerald-800 bg-emerald-950/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            {/* Best Streak */}
            <div className="brutalist-card p-5 bg-amber-950/10 border border-amber-900/60 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider block">Best Streak</span>
                <h3 className="text-2xl font-bold text-amber-400">{globalSummary.bestStreak} Days</h3>
              </div>
              <div className="w-10 h-10 rounded border border-amber-800 bg-amber-950/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-450 fill-amber-500/20" />
              </div>
            </div>

            {/* Total Completions */}
            <div className="brutalist-card p-5 bg-blue-950/10 border border-blue-900/60 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-wider block">Total Done</span>
                <h3 className="text-2xl font-bold text-blue-400">{globalSummary.totalCompletedEntries} Logs</h3>
              </div>
              <div className="w-10 h-10 rounded border border-blue-800 bg-blue-950/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Completions Bar Chart */}
            <div className="lg:col-span-2 brutalist-card p-5 flex flex-col justify-between">
              <div className="mb-4 pb-2 border-b border-zinc-900">
                <h3 className="font-semibold text-xs md:text-sm text-zinc-200">Consistency Dashboard</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Completions recorded over the last 10 days</p>
              </div>

              <div className="h-60 w-full font-mono text-[9px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyBarChartData} margin={{ left: -30, right: 0, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#3f3f46" 
                      fontSize={9}
                      tickLine={false}
                    />
                    <YAxis 
                      allowDecimals={false} 
                      stroke="#3f3f46" 
                      fontSize={9}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#09090b', 
                        borderColor: '#27272a',
                        borderWidth: '1px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        color: '#f4f4f5'
                      }}
                    />
                    <Bar 
                      dataKey="Completed" 
                      fill="#10b981" 
                      stroke="#047857"
                      strokeWidth={1}
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie Chart */}
            <div className="brutalist-card p-5 flex flex-col justify-between">
              <div className="mb-4 pb-2 border-b border-zinc-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-zinc-400 stroke-[2]" />
                <div>
                  <h3 className="font-semibold text-xs md:text-sm text-zinc-200">Category Breakdown</h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Distribution of completions</p>
                </div>
              </div>

              {categoryPieChartData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
                  No data logged yet
                </div>
              ) : (
                <div className="h-60 flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="70%">
                    <PieChart>
                      <Pie
                        data={categoryPieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryPieChartData.map((_entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CHART_COLORS[index % CHART_COLORS.length]} 
                            stroke="#18181b"
                            strokeWidth={1}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#09090b',
                          borderColor: '#27272a',
                          borderWidth: '1px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          color: '#f4f4f5'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="flex flex-wrap gap-1.5 justify-center text-[8px] font-mono max-h-16 overflow-y-auto px-1 mt-2">
                    {categoryPieChartData.map((entry, index) => (
                      <span 
                        key={entry.name}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-850"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                        <span className="text-zinc-400">{entry.name} ({entry.value})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Breakdown of habits */}
          <div className="brutalist-card p-5">
            <h3 className="font-semibold text-xs md:text-sm text-zinc-200 mb-4">Habit Stats Summary</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-900 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="pb-3 pr-4">Habit</th>
                    <th className="pb-3 px-4">Type</th>
                    <th className="pb-3 px-4">Completion Rate</th>
                    <th className="pb-3 px-4">Current Streak</th>
                    <th className="pb-3 pl-4">Longest Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 font-medium">
                  {trackerStats.map(({ tracker, currentStreak, longestStreak, completionRate }) => (
                    <tr key={tracker.trackerId} className="hover:bg-zinc-900/10 transition">
                      <td className="py-3 pr-4 flex items-center gap-2.5">
                        <span className="text-lg w-8 h-8 border border-zinc-800 rounded flex items-center justify-center bg-zinc-900" style={{ borderLeft: `3px solid ${tracker.color}` }}>
                          {tracker.icon}
                        </span>
                        <span className="font-semibold text-zinc-250">{tracker.name}</span>
                      </td>
                      <td className="py-3 px-4 capitalize text-zinc-500 font-mono text-[10px]">
                        {tracker.type}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-2.5 border border-zinc-800 rounded-full bg-zinc-900/60 p-0.5 overflow-hidden shrink-0">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-zinc-400">{completionRate}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          {currentStreak} Days
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-zinc-500 font-mono text-[10px]">
                        {longestStreak} Days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

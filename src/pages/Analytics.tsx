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

  // Group logs by date using domain logService
  const logsByDate = useMemo(() => {
    return logService.groupLogsByDate(logs);
  }, [logs]);

  // Group logs by trackerId using domain logService
  const logsByTracker = useMemo(() => {
    return logService.groupLogsByTracker(logs);
  }, [logs]);

  // 1. Calculate Streaks & Completion rates for each tracker using domain service
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

  // 2. Bar Chart Data: Daily completions for the last 10 days using domain service
  const dailyBarChartData = useMemo(() => {
    return getDailyBarChartData(trackers, logsByDate);
  }, [trackers, logsByDate]);

  // 3. Pie Chart Data: Completion breakdown by category using domain service
  const categoryPieChartData = useMemo(() => {
    return getCategoryPieChartData(trackers, logs, categories);
  }, [trackers, logs, categories]);

  // Global metrics summary
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

  const COLORS = ['#87CEEB', '#90EE90', '#FFDB58', '#FFA07A', '#FFB2EF', '#A388EE', '#E3DFF2'];

  return (
    <div className="space-y-8 animate-pop-in">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-8 h-8 text-black stroke-[2.5]" />
        <div>
          <h2 className="text-3xl font-display font-black text-black">Analytics</h2>
          <p className="text-sm opacity-65 font-bold">Habit performance, metrics breakdown, and consistency streaks</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] animate-pulse" />
            ))}
          </div>
          <div className="h-80 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] animate-pulse" />
        </div>
      ) : trackerStats.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] max-w-xl mx-auto">
          <h3 className="text-xl font-display font-black text-black">No analytics records yet</h3>
          <p className="text-sm font-semibold opacity-60 max-w-sm mt-2 mb-6">Start marking daily habits checked off on the Dashboard to calculate metrics.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Avg Completion Rate */}
            <div className="neo-card p-6 border-4 border-black shadow-[6px_6px_0px_#000000] bg-[#87CEEB] flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-xs font-black text-black uppercase tracking-widest">Avg Completion</span>
                <h3 className="text-4xl font-display font-black text-black">{globalSummary.avgCompletionRate}%</h3>
              </div>
              <div className="w-12 h-12 rounded-xl border-3 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                <CheckCircle className="w-6 h-6 stroke-[2.5] text-black" />
              </div>
            </div>

            {/* Best Streak */}
            <div className="neo-card p-6 border-4 border-black shadow-[6px_6px_0px_#000000] bg-[#FFDB58] flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-xs font-black text-black uppercase tracking-widest">Best Streak</span>
                <h3 className="text-4xl font-display font-black text-black">{globalSummary.bestStreak} Days</h3>
              </div>
              <div className="w-12 h-12 rounded-xl border-3 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                <Flame className="w-6 h-6 stroke-[2.5] text-black fill-[#FFA07A]" />
              </div>
            </div>

            {/* Total Completions */}
            <div className="neo-card p-6 border-4 border-black shadow-[6px_6px_0px_#000000] bg-[#FFB2EF] flex items-center justify-between">
              <div className="space-y-2">
                <span className="text-xs font-black text-black uppercase tracking-widest">Total Done</span>
                <h3 className="text-4xl font-display font-black text-black">{globalSummary.totalCompletedEntries} Logs</h3>
              </div>
              <div className="w-12 h-12 rounded-xl border-3 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000000]">
                <Target className="w-6 h-6 stroke-[2.5] text-black" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Daily Completions Bar Chart */}
            <div className="lg:col-span-2 p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] flex flex-col justify-between">
              <div className="mb-6 pb-2 border-b-2 border-dashed border-slate-300">
                <h3 className="font-display font-black text-lg text-black">Consistency Dashboard</h3>
                <p className="text-xs font-bold opacity-60">Completions recorded over the last 10 days</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyBarChartData} margin={{ left: -20, right: 10 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#000000" 
                      strokeWidth={2.5}
                      fontSize={9}
                      tickLine={true}
                    />
                    <YAxis 
                      allowDecimals={false} 
                      stroke="#000000" 
                      strokeWidth={2.5}
                      fontSize={9}
                      tickLine={true}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: '#000000',
                        borderWidth: '3px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '3px 3px 0px #000000'
                      }}
                    />
                    <Bar 
                      dataKey="Completed" 
                      fill="#87CEEB" 
                      stroke="#000000"
                      strokeWidth={3}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Pie Chart */}
            <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000] flex flex-col justify-between">
              <div className="mb-6 pb-2 border-b-2 border-dashed border-slate-300 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-black stroke-[2.5]" />
                <div>
                  <h3 className="font-display font-black text-base text-black">Category Breakdown</h3>
                  <p className="text-xs font-bold opacity-60">Distribution of completions</p>
                </div>
              </div>

              {categoryPieChartData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs font-bold opacity-50">
                  No data logged yet
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={categoryPieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryPieChartData.map((_entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            stroke="#000000"
                            strokeWidth={3}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#000000',
                          borderWidth: '3px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          boxShadow: '3px 3px 0px #000000'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="flex flex-wrap gap-2 justify-center text-[10px] font-black max-h-16 overflow-y-auto px-1 mt-2">
                    {categoryPieChartData.map((entry, index) => (
                      <span 
                        key={entry.name}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border-2 border-black bg-white"
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span>{entry.name} ({entry.value})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Breakdown of habits */}
          <div className="p-6 rounded-[18px] border-4 border-black bg-white shadow-[6px_6px_0px_#000000]">
            <h3 className="font-display font-black text-lg mb-4 text-black">Habit Stats Summary</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b-3 border-black text-xs font-black uppercase tracking-wider text-black">
                    <th className="pb-3 pr-4">Habit</th>
                    <th className="pb-3 px-4">Type</th>
                    <th className="pb-3 px-4">Completion Rate</th>
                    <th className="pb-3 px-4">Current Streak</th>
                    <th className="pb-3 pl-4">Longest Streak</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-100 font-bold">
                  {trackerStats.map(({ tracker, currentStreak, longestStreak, completionRate }) => (
                    <tr key={tracker.trackerId} className="hover:bg-slate-50 transition">
                      <td className="py-4 pr-4 flex items-center gap-2.5">
                        <span className="text-xl w-10 h-10 border-2 border-black rounded-lg flex items-center justify-center" style={{ backgroundColor: tracker.color }}>
                          {tracker.icon}
                        </span>
                        <span className="font-display font-black text-black text-sm md:text-base">{tracker.name}</span>
                      </td>
                      <td className="py-4 px-4 text-xs capitalize text-black">
                        {tracker.type}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-4 border-2 border-black rounded-full bg-white p-0.5 overflow-hidden shrink-0">
                            <div 
                              className="h-full bg-[#90EE90] rounded-full border-r border-black"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs">{completionRate}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-black">
                        <span className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-[#FFA07A] shrink-0 stroke-[2.5]" />
                          {currentStreak} Days
                        </span>
                      </td>
                      <td className="py-4 pl-4 text-xs opacity-80 font-mono text-black">
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entryRepository } from '../repositories';
import { syncService } from '../services/sync.service';
import { Log } from '../types/entry';
import { useToastStore } from '../stores/toast.store';

export function useLogsByDate(date: string) {
  return useQuery({
    queryKey: ['logs', 'date', date],
    queryFn: () => entryRepository.getByDate(date),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useLogsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['logs', 'month', year, month],
    queryFn: () => entryRepository.getMonth(year, month),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useLogsByRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['logs', 'range', startDate, endDate],
    queryFn: () => entryRepository.getByDateRange(startDate, endDate),
    staleTime: 60 * 1000,
  });
}

interface UpsertLogVariables {
  trackerId: string;
  date: string;
  value: string;
  note?: string | null;
}

export function useUpsertLog() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: ({ trackerId, date, value, note }: UpsertLogVariables) =>
      syncService.enqueue(trackerId, date, value, note),
    onMutate: async ({ trackerId, date, value, note }) => {
      // 1. Cancel queries for all logs to prevent overwrites
      await queryClient.cancelQueries({ queryKey: ['logs'] });

      const dateKey = ['logs', 'date', date];
      const monthKey = ['logs', 'month', parseInt(date.substring(0, 4)), parseInt(date.substring(5, 7))];
      
      // 2. Snapshot previous logs
      const previousDateLogs = queryClient.getQueryData<Log[]>(dateKey) || [];
      const previousMonthLogs = queryClient.getQueryData<Log[]>(monthKey) || [];

      const updatedLog: Log = {
        entryId: crypto.randomUUID(),
        trackerId,
        date,
        value,
        note: note || null,
        createdAt: new Date().toISOString(),
      };

      // 3. Optimistically update today's logs cache
      const nextDateLogs = previousDateLogs.some((l) => l.trackerId === trackerId)
        ? previousDateLogs.map((l) => (l.trackerId === trackerId ? updatedLog : l))
        : [...previousDateLogs, updatedLog];

      queryClient.setQueryData<Log[]>(dateKey, nextDateLogs);

      // 4. Optimistically update the monthly logs cache
      const nextMonthLogs = previousMonthLogs.some((l) => l.trackerId === trackerId && l.date === date)
        ? previousMonthLogs.map((l) => (l.trackerId === trackerId && l.date === date ? updatedLog : l))
        : [...previousMonthLogs, updatedLog];
        
      queryClient.setQueryData<Log[]>(monthKey, nextMonthLogs);

      // 5. Optimistically update range queries (Heatmap/Stats)
      const rangeQueries = queryClient.getQueryCache().findAll({ queryKey: ['logs', 'range'] });
      const previousRangeSnapshots: Array<{ queryKey: any; data: Log[] | undefined }> = [];

      rangeQueries.forEach((query) => {
        const previousData = query.state.data as Log[] | undefined;
        previousRangeSnapshots.push({ queryKey: query.queryKey, data: previousData });

        if (previousData) {
          const nextRangeData = previousData.some((l) => l.trackerId === trackerId && l.date === date)
            ? previousData.map((l) => (l.trackerId === trackerId && l.date === date ? updatedLog : l))
            : [...previousData, updatedLog];
          queryClient.setQueryData(query.queryKey, nextRangeData);
        }
      });

      return { 
        previousDateLogs, 
        previousMonthLogs, 
        previousRangeSnapshots,
        dateKey, 
        monthKey 
      };
    },
    onError: (err, _variables, context) => {
      // Rollback all caches on error
      if (context) {
        queryClient.setQueryData(context.dateKey, context.previousDateLogs);
        queryClient.setQueryData(context.monthKey, context.previousMonthLogs);
        context.previousRangeSnapshots.forEach((snap) => {
          queryClient.setQueryData(snap.queryKey, snap.data);
        });
      }
      addToast(err instanceof Error ? err.message : 'Sync failed. Local change kept.', 'warning');
    },
    onSuccess: () => {},
    onSettled: () => {
      // Invalidate the entire logs tree (date, month, range) to trigger synchronised refetches
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    },
  });
}

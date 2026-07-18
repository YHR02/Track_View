import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logRepository } from '../repositories';
import { syncService } from '../services/sync.service';
import { Log } from '../types/log';
import { useToastStore } from '../stores/toast.store';

export function useLogsByDate(date: string) {
  return useQuery({
    queryKey: ['logs', 'date', date],
    queryFn: () => logRepository.getByDate(date),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useLogsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['logs', 'month', year, month],
    queryFn: () => logRepository.getMonth(year, month),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useLogsByRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['logs', 'range', startDate, endDate],
    queryFn: () => logRepository.getByDateRange(startDate, endDate),
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
      // 1. Cancel queries for specific logs
      const dateKey = ['logs', 'date', date];
      const monthKey = ['logs', 'month', parseInt(date.substring(0, 4)), parseInt(date.substring(5, 7))];
      
      await queryClient.cancelQueries({ queryKey: dateKey });
      await queryClient.cancelQueries({ queryKey: monthKey });

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

      const nextDateLogs = previousDateLogs.some((l) => l.trackerId === trackerId)
        ? previousDateLogs.map((l) => (l.trackerId === trackerId ? updatedLog : l))
        : [...previousDateLogs, updatedLog];

      queryClient.setQueryData<Log[]>(dateKey, nextDateLogs);

      // 4. Optimistically update the monthly logs cache
      const nextMonthLogs = previousMonthLogs.some((l) => l.trackerId === trackerId && l.date === date)
        ? previousMonthLogs.map((l) => (l.trackerId === trackerId && l.date === date ? updatedLog : l))
        : [...previousMonthLogs, updatedLog];
        
      queryClient.setQueryData<Log[]>(monthKey, nextMonthLogs);

      return { previousDateLogs, previousMonthLogs, dateKey, monthKey };
    },
    onError: (err, _variables, context) => {
      // Rollback caches
      if (context) {
        queryClient.setQueryData(context.dateKey, context.previousDateLogs);
        queryClient.setQueryData(context.monthKey, context.previousMonthLogs);
      }
      addToast(err instanceof Error ? err.message : 'Sync failed. Local change kept.', 'warning');
    },
    onSuccess: () => {
      // Optional: Add toast notifications on sync success (e.g. for user feedback)
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: context.dateKey });
        queryClient.invalidateQueries({ queryKey: context.monthKey });
      }
    },
  });
}

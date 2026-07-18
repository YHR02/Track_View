import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trackerRepository } from '../repositories';
import { Tracker, CreateTrackerInput, UpdateTrackerInput } from '../types/tracker';
import { useToastStore } from '../stores/toast.store';

export function useTrackers() {
  return useQuery({
    queryKey: ['trackers'],
    queryFn: () => trackerRepository.list(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes, can manually refresh
  });
}

export function useCreateTracker() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: (data: CreateTrackerInput) => trackerRepository.create(data),
    onMutate: async (newTrackerInput) => {
      await queryClient.cancelQueries({ queryKey: ['trackers'] });
      const previousTrackers = queryClient.getQueryData<Tracker[]>(['trackers']) || [];

      // Create a temporary tracker object for optimistic UI display
      const tempTracker: Tracker = {
        trackerId: crypto.randomUUID(),
        name: newTrackerInput.name,
        categoryId: newTrackerInput.categoryId || '1',
        type: newTrackerInput.type,
        archived: false,
        icon: newTrackerInput.icon,
        color: newTrackerInput.color,
        target: newTrackerInput.target || null,
        unit: newTrackerInput.unit || null,
        frequency: newTrackerInput.frequency,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Tracker[]>(['trackers'], [...previousTrackers, tempTracker]);
      return { previousTrackers };
    },
    onError: (err, _newTracker, context) => {
      if (context?.previousTrackers) {
        queryClient.setQueryData(['trackers'], context.previousTrackers);
      }
      addToast(err instanceof Error ? err.message : 'Failed to create tracker', 'error');
    },
    onSuccess: () => {
      addToast('Tracker created successfully', 'success');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
    },
  });
}

export function useUpdateTracker() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: ({ trackerId, data }: { trackerId: string; data: UpdateTrackerInput }) =>
      trackerRepository.update(trackerId, data),
    onMutate: async ({ trackerId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['trackers'] });
      const previousTrackers = queryClient.getQueryData<Tracker[]>(['trackers']) || [];

      queryClient.setQueryData<Tracker[]>(
        ['trackers'],
        previousTrackers.map((t) => (t.trackerId === trackerId ? { ...t, ...data } : t))
      );
      return { previousTrackers };
    },
    onError: (err, _variables, context) => {
      if (context?.previousTrackers) {
        queryClient.setQueryData(['trackers'], context.previousTrackers);
      }
      addToast(err instanceof Error ? err.message : 'Failed to update tracker', 'error');
    },
    onSuccess: () => {
      addToast('Tracker updated successfully', 'success');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
    },
  });
}

export function useArchiveTracker() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  return useMutation({
    mutationFn: (trackerId: string) => trackerRepository.archive(trackerId),
    onMutate: async (trackerId) => {
      await queryClient.cancelQueries({ queryKey: ['trackers'] });
      const previousTrackers = queryClient.getQueryData<Tracker[]>(['trackers']) || [];

      queryClient.setQueryData<Tracker[]>(
        ['trackers'],
        previousTrackers.filter((t) => t.trackerId !== trackerId)
      );
      return { previousTrackers };
    },
    onError: (err, _trackerId, context) => {
      if (context?.previousTrackers) {
        queryClient.setQueryData(['trackers'], context.previousTrackers);
      }
      addToast(err instanceof Error ? err.message : 'Failed to archive tracker', 'error');
    },
    onSuccess: () => {
      addToast('Tracker archived successfully', 'success');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
    },
  });
}

export function useReorderTrackers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: string[]) => trackerRepository.reorder(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ['trackers'] });
      const previousTrackers = queryClient.getQueryData<Tracker[]>(['trackers']) || [];

      const reordered = [...previousTrackers];
      const trackerMap = new Map(reordered.map((t) => [t.trackerId, t]));
      
      const newTrackers: Tracker[] = [];
      orderedIds.forEach((id) => {
        const t = trackerMap.get(id);
        if (t) {
          newTrackers.push(t);
        }
      });

      // Append any active trackers that might have been omitted
      previousTrackers.forEach((t) => {
        if (!orderedIds.includes(t.trackerId)) {
          newTrackers.push(t);
        }
      });

      queryClient.setQueryData<Tracker[]>(['trackers'], newTrackers);
      return { previousTrackers };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTrackers) {
        queryClient.setQueryData(['trackers'], context.previousTrackers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trackers'] });
    },
  });
}

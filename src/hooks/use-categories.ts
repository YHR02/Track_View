import { useQuery } from '@tanstack/react-query';
import { categoryRepository } from '../repositories';
import { useAuthStore } from '../stores/authStore';

export function useCategories() {
  const { spreadsheetId } = useAuthStore();

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!spreadsheetId) return [];
      try {
        return await categoryRepository.list();
      } catch (err) {
        console.error('[useCategories] Failed to load categories:', err);
        return [];
      }
    },
    enabled: !!spreadsheetId,
    staleTime: 10 * 60 * 1000, // 10 minutes — categories are static reference data
  });
}

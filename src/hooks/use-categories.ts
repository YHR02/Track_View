import { useQuery } from '@tanstack/react-query';
import { gsheetClient } from '../lib/gsheet';
import { useAuthStore } from '../stores/authStore';
import { Category } from '../types/category';

export function useCategories() {
  const { spreadsheetId } = useAuthStore();
  
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      if (!spreadsheetId) return [];
      try {
        const rows = await gsheetClient.getRows<Category>(spreadsheetId, 'Categories!A:E');
        return rows;
      } catch (err) {
        console.error('Failed to load categories:', err);
        return [];
      }
    },
    enabled: !!spreadsheetId,
    staleTime: 10 * 60 * 1000, // Cache categories for 10 minutes (static reference data)
  });
}

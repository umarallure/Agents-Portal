import { useQuery } from '@tanstack/react-query';
import { fetchBoardItems, isMondayApiConfigured, ParsedPolicyItem } from '@/lib/mondayApi';

/**
 * Custom hook for fetching and caching Monday.com policy placements data
 * Uses React Query for automatic caching, background refetching, and loading states
 * 
 * Cache behavior:
 * - Data stays fresh for 5 minutes (staleTime)
 * - Cached for 10 minutes total (gcTime)
 * - Manual refetch available via refetch()
 * 
 * @param enabled - Whether the query should run (for lazy loading)
 */
export const useAdminAnalyticsData = (enabled: boolean = true) => {
  return useQuery<ParsedPolicyItem[], Error>({
    queryKey: ['admin-analytics-placements'],
    queryFn: async () => {
      if (!isMondayApiConfigured()) {
        throw new Error('Monday.com API token is not configured');
      }

      console.log('[Admin Analytics Query] Fetching all policy placements...');
      
      // Fetch all items without agent filter
      const items = await fetchBoardItems(undefined);
      console.log(`[Admin Analytics Query] Fetched ${items.length} total policy items`);

      return items;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
    enabled, // Only fetch when enabled
  });
};

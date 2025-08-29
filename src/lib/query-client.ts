import { QueryClient } from '@tanstack/react-query';
import { storage } from './storage';
import { serviceLogger } from '../utils/logger-enhanced';

// Modern TanStack Query configuration with persistence
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 1000 * 60 * 5,
      // Keep cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Retry failed requests 3 times
      retry: 3,
      // Exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Only refetch on mount if data is stale
      refetchOnMount: (query) => query.state.data === undefined,
      // Don't refetch on window focus in mobile
      refetchOnWindowFocus: false,
      // Refetch on network reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Network error handling
      onError: (error) => {
        serviceLogger.error('Mutation error', { error: error instanceof Error ? error.message : String(error) });
        // You could add toast notification here
      },
    },
  },
});

// Persist important queries to storage
export const persistQueryClient = () => {
  const queries = queryClient.getQueryCache().getAll();
  const importantQueries = queries
    .filter(query => query.queryKey.includes('channels') || query.queryKey.includes('user'))
    .map(query => ({
      queryKey: query.queryKey,
      data: query.state.data,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }));
  
  storage.set('persisted-queries', JSON.stringify(importantQueries));
};

// Restore queries from storage
export const restoreQueryClient = () => {
  try {
    const persistedQueries = storage.getString('persisted-queries');
    if (persistedQueries) {
      const queries = JSON.parse(persistedQueries);
      queries.forEach(({ queryKey, data, dataUpdatedAt }: any) => {
        queryClient.setQueryData(queryKey, data);
        queryClient.getQueryState(queryKey)!.dataUpdatedAt = dataUpdatedAt;
      });
    }
  } catch (error) {
    serviceLogger.warn('Failed to restore queries', { error: error instanceof Error ? error.message : String(error) });
  }
};
import { useState, useCallback, useEffect } from 'react';
import { apiService, type YoutubeChannel } from '@/services/api';
import { serviceLogger } from '@/utils/logger-enhanced';

export function useChannelSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [channels, setChannels] = useState<YoutubeChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<YoutubeChannel | null>(null);

  const searchChannels = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setChannels([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      serviceLogger.info('🔍 Searching for channels', { query });
      const response = await apiService.searchChannels(query.trim());
      
      if (response.success) {
        serviceLogger.info('✅ Channel search successful', { 
          channelCount: response.data?.length || 0,
          hasChannels: !!response.data?.length
        });
        setChannels(response.data || []);
        
        // Auto-select the first channel if available
        if (response.data && response.data.length > 0) {
          setSelectedChannel(response.data[0]);
        } else {
          setSelectedChannel(null);
        }
      } else {
        serviceLogger.error('❌ Channel search failed', { error: response.error });
        setError(response.error || 'Failed to search channels');
        setChannels([]);
        setSelectedChannel(null);
      }
    } catch (err) {
      serviceLogger.error('❌ Channel search error', { 
        error: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
      setChannels([]);
      setSelectedChannel(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setChannels([]);
    setSelectedChannel(null);
    setError(null);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchChannels(searchTerm);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchChannels]);

  return {
    searchTerm,
    setSearchTerm,
    channels,
    isLoading,
    error,
    selectedChannel,
    setSelectedChannel,
    clearSearch,
    searchChannels, // Expose for manual triggering
  };
}
import { useState, useCallback, useEffect } from 'react';
import { apiService } from '@/services/api';

interface YoutubeChannel {
  channelId: string;
  handle: string;
  title: string;
  description?: string;
  thumbnail?: string;
  subscriberCount?: string;
  videoCount?: string;
}

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
      console.log('🔍 Searching for channels:', query);
      const response = await apiService.searchChannels(query.trim());
      
      if (response.success) {
        console.log('✅ Channel search successful:', response.data);
        setChannels(response.data || []);
        
        // Auto-select the first channel if available
        if (response.data && response.data.length > 0) {
          setSelectedChannel(response.data[0]);
        } else {
          setSelectedChannel(null);
        }
      } else {
        console.error('❌ Channel search failed:', response.error);
        setError(response.error || 'Failed to search channels');
        setChannels([]);
        setSelectedChannel(null);
      }
    } catch (err) {
      console.error('❌ Channel search error:', err);
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
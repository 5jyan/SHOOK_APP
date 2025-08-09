// Shared types from the original web app
export interface User {
  id: string;
  username: string;
  slackUserId?: string;
  slackChannelId?: string;
  slackJoinedAt?: Date;
}

export interface YouTubeChannel {
  id: string;
  channelId: string;
  name: string;
  description?: string;
  thumbnail?: string;
  subscriberCount?: number;
  recentVideoId?: string;
  processed: boolean;
  caption?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserChannel {
  id: string;
  userId: string;
  channelId: string;
  createdAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ChannelSearchResult {
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
  subscriberCount?: number;
}

export interface SlackSetupData {
  inviteLink: string;
  channelName: string;
  instructions: string[];
}

// Error types
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface NetworkError {
  type: 'network';
  message: string;
  retry: () => void;
}
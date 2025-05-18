// API Types representing returned data from the server

export interface Server {
  id: string;
  name: string;
  icon: string | null;
  joined_at: string;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: string;
}

export interface Message {
  id: string;
  server_id: string;
  channel_id: string;
  author_id: string;
  author_username: string;
  author_discriminator: string;
  content: string;
  created_at: string;
}

export interface BotStatus {
  id: number;
  is_online: number;
  uptime_started: string | null;
  servers_count: number;
  channels_count: number;
  messages_count: number;
  storage_usage: number;
  uptime: string;
  isConnected: boolean;
}

export interface CommandLog {
  id: number;
  command: string;
  response: string;
  executed_at: string;
}

export interface StatsResponse {
  isConnected: boolean;
  uptime: string;
  totalMessages: number;
  messageIncrease: string;
  activeChannels: number;
  channelIncrease: string;
  monitoringDays: string;
  oldestMessage: string;
  storageUsage: string;
  storagePercentage: string;
}

export interface MessagesResponse {
  messages: Message[];
  total: number;
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  active: boolean;
}

export interface DateRangeOption {
  label: string;
  value: number;
}

export interface ServerOption {
  id: string | null;
  name: string;
}

export interface ChannelOption {
  id: string | null;
  name: string;
}

export interface CommandResponse {
  response: string;
}

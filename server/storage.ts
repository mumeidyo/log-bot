import {
  type User, type InsertUser,
  type DiscordServer, type InsertDiscordServer,
  type DiscordChannel, type InsertDiscordChannel,
  type DiscordMessage, type InsertDiscordMessage,
  type BotStatus, type InsertBotStatus,
  type CommandLog, type InsertCommandLog
} from "@shared/schema";
import { sub } from "date-fns";

// Storage interface
export interface IStorage {
  // User methods (from original)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Discord server methods
  getServers(): Promise<DiscordServer[]>;
  getServer(id: string): Promise<DiscordServer | undefined>;
  createServer(server: InsertDiscordServer): Promise<DiscordServer>;
  
  // Discord channel methods
  getChannels(serverId?: string): Promise<DiscordChannel[]>;
  getChannel(id: string): Promise<DiscordChannel | undefined>;
  createChannel(channel: InsertDiscordChannel): Promise<DiscordChannel>;
  
  // Discord message methods
  getMessages(options: {
    serverId?: string, 
    channelId?: string, 
    search?: string,
    limit?: number,
    offset?: number
  }): Promise<{ messages: DiscordMessage[], total: number }>;
  getMessage(id: string): Promise<DiscordMessage | undefined>;
  createMessage(message: InsertDiscordMessage): Promise<DiscordMessage>;
  deleteOldMessages(): Promise<number>;
  
  // Bot status methods
  getBotStatus(): Promise<BotStatus | undefined>;
  updateBotStatus(status: Partial<BotStatus>): Promise<BotStatus>;
  
  // Command logs methods
  getCommandLogs(limit?: number): Promise<CommandLog[]>;
  createCommandLog(log: InsertCommandLog): Promise<CommandLog>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private discordServers: Map<string, DiscordServer>;
  private discordChannels: Map<string, DiscordChannel>;
  private discordMessages: Map<string, DiscordMessage>;
  private botStatusRecord: BotStatus;
  private commandLogs: CommandLog[];
  private userCurrentId: number;
  private commandLogCurrentId: number;

  constructor() {
    this.users = new Map();
    this.discordServers = new Map();
    this.discordChannels = new Map();
    this.discordMessages = new Map();
    this.commandLogs = [];
    this.userCurrentId = 1;
    this.commandLogCurrentId = 1;
    
    // Initialize default bot status
    this.botStatusRecord = {
      id: 1,
      is_online: 0,
      uptime_started: null,
      servers_count: 0,
      channels_count: 0,
      messages_count: 0,
      storage_usage: 0
    };
  }
  
  // User methods (from original)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Discord server methods
  async getServers(): Promise<DiscordServer[]> {
    return Array.from(this.discordServers.values());
  }
  
  async getServer(id: string): Promise<DiscordServer | undefined> {
    return this.discordServers.get(id);
  }
  
  async createServer(server: InsertDiscordServer): Promise<DiscordServer> {
    const newServer = server as DiscordServer;
    this.discordServers.set(server.id, newServer);
    
    // Update bot status
    this.botStatusRecord.servers_count = this.discordServers.size;
    
    return newServer;
  }
  
  // Discord channel methods
  async getChannels(serverId?: string): Promise<DiscordChannel[]> {
    if (serverId) {
      return Array.from(this.discordChannels.values()).filter(
        channel => channel.server_id === serverId
      );
    }
    return Array.from(this.discordChannels.values());
  }
  
  async getChannel(id: string): Promise<DiscordChannel | undefined> {
    return this.discordChannels.get(id);
  }
  
  async createChannel(channel: InsertDiscordChannel): Promise<DiscordChannel> {
    const newChannel = channel as DiscordChannel;
    this.discordChannels.set(channel.id, newChannel);
    
    // Update bot status
    this.botStatusRecord.channels_count = this.discordChannels.size;
    
    return newChannel;
  }
  
  // Discord message methods
  async getMessages(options: {
    serverId?: string, 
    channelId?: string, 
    search?: string,
    limit?: number,
    offset?: number
  }): Promise<{ messages: DiscordMessage[], total: number }> {
    const { serverId, channelId, search, limit = 10, offset = 0 } = options;
    
    let filteredMessages = Array.from(this.discordMessages.values());
    
    if (serverId) {
      filteredMessages = filteredMessages.filter(msg => msg.server_id === serverId);
    }
    
    if (channelId) {
      filteredMessages = filteredMessages.filter(msg => msg.channel_id === channelId);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMessages = filteredMessages.filter(
        msg => msg.content.toLowerCase().includes(searchLower) ||
               msg.author_username.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort by created_at in descending order (newest first)
    filteredMessages.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return {
      messages: filteredMessages.slice(offset, offset + limit),
      total: filteredMessages.length
    };
  }
  
  async getMessage(id: string): Promise<DiscordMessage | undefined> {
    return this.discordMessages.get(id);
  }
  
  async createMessage(message: InsertDiscordMessage): Promise<DiscordMessage> {
    const newMessage = message as DiscordMessage;
    this.discordMessages.set(message.id, newMessage);
    
    // Update bot status
    this.botStatusRecord.messages_count = this.discordMessages.size;
    this.botStatusRecord.storage_usage = this.calculateStorageUsage();
    
    return newMessage;
  }
  
  async deleteOldMessages(): Promise<number> {
    const twoWeeksAgo = sub(new Date(), { weeks: 2 });
    const messagesToDelete: string[] = [];
    
    this.discordMessages.forEach((message, id) => {
      if (new Date(message.created_at) < twoWeeksAgo) {
        messagesToDelete.push(id);
      }
    });
    
    messagesToDelete.forEach(id => this.discordMessages.delete(id));
    
    // Update bot status after deletion
    this.botStatusRecord.messages_count = this.discordMessages.size;
    this.botStatusRecord.storage_usage = this.calculateStorageUsage();
    
    return messagesToDelete.length;
  }
  
  // Bot status methods
  async getBotStatus(): Promise<BotStatus | undefined> {
    return this.botStatusRecord;
  }
  
  async updateBotStatus(status: Partial<BotStatus>): Promise<BotStatus> {
    this.botStatusRecord = { ...this.botStatusRecord, ...status };
    return this.botStatusRecord;
  }
  
  // Command logs methods
  async getCommandLogs(limit = 100): Promise<CommandLog[]> {
    // Return the most recent logs
    return [...this.commandLogs]
      .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())
      .slice(0, limit);
  }
  
  async createCommandLog(log: InsertCommandLog): Promise<CommandLog> {
    const newLog: CommandLog = {
      ...log,
      id: this.commandLogCurrentId++
    };
    
    this.commandLogs.push(newLog);
    
    // Keep only the latest 1000 logs
    if (this.commandLogs.length > 1000) {
      this.commandLogs.sort((a, b) => 
        new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
      );
      this.commandLogs = this.commandLogs.slice(0, 1000);
    }
    
    return newLog;
  }
  
  // Helper function to calculate storage usage (simplified estimation in KB)
  private calculateStorageUsage(): number {
    // Rough estimation: each message is approximately 1KB on average
    return this.discordMessages.size;
  }
}

// データベースストレージをインポート
import { DatabaseStorage } from './database-storage';

// 環境変数に基づいてストレージを選択
// Renderなどの本番環境ではデータベースストレージを使用し、開発環境ではメモリストレージを使用可能
const useDatabase = process.env.NODE_ENV === 'production' || process.env.USE_DATABASE === 'true';

export const storage = useDatabase
  ? new DatabaseStorage()
  : new MemStorage();

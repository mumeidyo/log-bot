import {
  type User, type InsertUser,
  type DiscordServer, type InsertDiscordServer,
  type DiscordChannel, type InsertDiscordChannel,
  type DiscordMessage, type InsertDiscordMessage,
  type BotStatus, type InsertBotStatus,
  type CommandLog, type InsertCommandLog,
  users, discordServers, discordChannels, discordMessages, botStatus, commandLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, desc, sql } from "drizzle-orm";
import { sub } from "date-fns";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize database tables if needed
    this.initDatabase();
  }

  private async initDatabase() {
    try {
      // Check if bot status exists, if not create initial record
      const status = await this.getBotStatus();
      if (!status) {
        await db.insert(botStatus).values({
          id: 1,
          is_online: 0,
          uptime_started: null,
          servers_count: 0,
          channels_count: 0,
          messages_count: 0,
          storage_usage: 0
        });
      }
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // Discord server methods
  async getServers(): Promise<DiscordServer[]> {
    return await db.select().from(discordServers);
  }
  
  async getServer(id: string): Promise<DiscordServer | undefined> {
    const result = await db.select().from(discordServers).where(eq(discordServers.id, id));
    return result[0];
  }
  
  async createServer(server: InsertDiscordServer): Promise<DiscordServer> {
    // Check if server exists
    const existing = await this.getServer(server.id);
    if (existing) {
      // Update existing server
      const result = await db.update(discordServers)
        .set({ name: server.name, icon: server.icon })
        .where(eq(discordServers.id, server.id))
        .returning();
      return result[0];
    }
    
    // Create new server
    const result = await db.insert(discordServers).values(server).returning();
    
    // Update bot status
    await this.updateServerCount();
    
    return result[0];
  }
  
  // Discord channel methods
  async getChannels(serverId?: string): Promise<DiscordChannel[]> {
    if (serverId) {
      return await db.select().from(discordChannels).where(eq(discordChannels.server_id, serverId));
    }
    return await db.select().from(discordChannels);
  }
  
  async getChannel(id: string): Promise<DiscordChannel | undefined> {
    const result = await db.select().from(discordChannels).where(eq(discordChannels.id, id));
    return result[0];
  }
  
  async createChannel(channel: InsertDiscordChannel): Promise<DiscordChannel> {
    // Check if channel exists
    const existing = await this.getChannel(channel.id);
    if (existing) {
      // Update existing channel
      const result = await db.update(discordChannels)
        .set({ name: channel.name, type: channel.type })
        .where(eq(discordChannels.id, channel.id))
        .returning();
      return result[0];
    }
    
    // Create new channel
    const result = await db.insert(discordChannels).values(channel).returning();
    
    // Update bot status
    await this.updateChannelCount();
    
    return result[0];
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
    
    // Build query conditions
    let conditions = [];
    if (serverId) {
      conditions.push(eq(discordMessages.server_id, serverId));
    }
    
    if (channelId) {
      conditions.push(eq(discordMessages.channel_id, channelId));
    }
    
    if (search) {
      conditions.push(
        sql`(${discordMessages.content} ILIKE ${'%' + search + '%'} OR ${discordMessages.author_username} ILIKE ${'%' + search + '%'})`
      );
    }
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(discordMessages)
      .where(conditions.length ? and(...conditions) : undefined);
    
    const total = countResult[0]?.count || 0;
    
    // Get messages with pagination
    const messages = await db
      .select()
      .from(discordMessages)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(discordMessages.created_at))
      .limit(limit)
      .offset(offset);
    
    return { messages, total };
  }
  
  async getMessage(id: string): Promise<DiscordMessage | undefined> {
    const result = await db.select().from(discordMessages).where(eq(discordMessages.id, id));
    return result[0];
  }
  
  async createMessage(message: InsertDiscordMessage): Promise<DiscordMessage> {
    // Check if message exists
    const existing = await this.getMessage(message.id);
    if (existing) {
      return existing;
    }
    
    // Create new message
    const result = await db.insert(discordMessages).values(message).returning();
    
    // Update bot status
    await this.updateMessageCount();
    
    return result[0];
  }
  
  async deleteOldMessages(): Promise<number> {
    const twoWeeksAgo = sub(new Date(), { weeks: 2 });
    
    // Delete messages older than two weeks
    const result = await db
      .delete(discordMessages)
      .where(sql`${discordMessages.created_at} < ${twoWeeksAgo}`)
      .returning();
    
    // Update bot status
    await this.updateMessageCount();
    
    return result.length;
  }
  
  // Bot status methods
  async getBotStatus(): Promise<BotStatus | undefined> {
    const result = await db.select().from(botStatus).where(eq(botStatus.id, 1));
    return result[0];
  }
  
  async updateBotStatus(status: Partial<BotStatus>): Promise<BotStatus> {
    const result = await db
      .update(botStatus)
      .set(status)
      .where(eq(botStatus.id, 1))
      .returning();
    
    return result[0];
  }
  
  // Command logs methods
  async getCommandLogs(limit = 100): Promise<CommandLog[]> {
    return await db
      .select()
      .from(commandLogs)
      .orderBy(desc(commandLogs.executed_at))
      .limit(limit);
  }
  
  async createCommandLog(log: InsertCommandLog): Promise<CommandLog> {
    const result = await db.insert(commandLogs).values(log).returning();
    return result[0];
  }
  
  // Helper methods to update counts in bot status
  private async updateServerCount(): Promise<void> {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(discordServers);
    
    const count = countResult[0]?.count || 0;
    
    await db
      .update(botStatus)
      .set({ servers_count: count })
      .where(eq(botStatus.id, 1));
  }
  
  private async updateChannelCount(): Promise<void> {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(discordChannels);
    
    const count = countResult[0]?.count || 0;
    
    await db
      .update(botStatus)
      .set({ channels_count: count })
      .where(eq(botStatus.id, 1));
  }
  
  private async updateMessageCount(): Promise<void> {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(discordMessages);
    
    const count = countResult[0]?.count || 0;
    
    // Calculate storage usage (simplified)
    const storageUsage = await this.calculateStorageUsage();
    
    await db
      .update(botStatus)
      .set({ 
        messages_count: count,
        storage_usage: storageUsage
      })
      .where(eq(botStatus.id, 1));
  }
  
  // Helper function to calculate storage usage (in KB)
  private async calculateStorageUsage(): Promise<number> {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(discordMessages);
    
    // Rough estimation: each message is approximately 1KB on average
    return countResult[0]?.count || 0;
  }
}
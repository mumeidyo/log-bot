import { pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema from the original file
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Discord server schema
export const discordServers = pgTable("discord_servers", {
  id: varchar("id", { length: 20 }).primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  joined_at: timestamp("joined_at").notNull().defaultNow(),
});

export const insertDiscordServerSchema = createInsertSchema(discordServers);
export type InsertDiscordServer = z.infer<typeof insertDiscordServerSchema>;
export type DiscordServer = typeof discordServers.$inferSelect;

// Discord channel schema
export const discordChannels = pgTable("discord_channels", {
  id: varchar("id", { length: 20 }).primaryKey(),
  server_id: varchar("server_id", { length: 20 }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
});

export const insertDiscordChannelSchema = createInsertSchema(discordChannels);
export type InsertDiscordChannel = z.infer<typeof insertDiscordChannelSchema>;
export type DiscordChannel = typeof discordChannels.$inferSelect;

// Discord message schema
export const discordMessages = pgTable("discord_messages", {
  id: varchar("id", { length: 20 }).primaryKey(),
  server_id: varchar("server_id", { length: 20 }).notNull(),
  channel_id: varchar("channel_id", { length: 20 }).notNull(),
  author_id: varchar("author_id", { length: 20 }).notNull(),
  author_username: text("author_username").notNull(),
  author_discriminator: text("author_discriminator"),
  content: text("content").notNull(),
  created_at: timestamp("created_at").notNull(),
});

export const insertDiscordMessageSchema = createInsertSchema(discordMessages);
export type InsertDiscordMessage = z.infer<typeof insertDiscordMessageSchema>;
export type DiscordMessage = typeof discordMessages.$inferSelect;

// Bot status schema
export const botStatus = pgTable("bot_status", {
  id: serial("id").primaryKey(),
  is_online: integer("is_online").notNull(),
  uptime_started: timestamp("uptime_started"),
  servers_count: integer("servers_count").notNull().default(0),
  channels_count: integer("channels_count").notNull().default(0),
  messages_count: integer("messages_count").notNull().default(0),
  storage_usage: integer("storage_usage").notNull().default(0),
});

export const insertBotStatusSchema = createInsertSchema(botStatus);
export type InsertBotStatus = z.infer<typeof insertBotStatusSchema>;
export type BotStatus = typeof botStatus.$inferSelect;

// Command Log schema 
export const commandLogs = pgTable("command_logs", {
  id: serial("id").primaryKey(),
  command: text("command").notNull(),
  response: text("response").notNull(),
  executed_at: timestamp("executed_at").notNull().defaultNow(),
});

export const insertCommandLogSchema = createInsertSchema(commandLogs);
export type InsertCommandLog = z.infer<typeof insertCommandLogSchema>;
export type CommandLog = typeof commandLogs.$inferSelect;

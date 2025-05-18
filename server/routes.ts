import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { DiscordBot } from "./discord-bot";
import { z } from "zod";
import {
  insertCommandLogSchema,
  insertDiscordMessageSchema,
} from "@shared/schema";

// Get Discord token from environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
let bot: DiscordBot | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);

  // Check for Discord token
  if (!DISCORD_TOKEN) {
    console.error("DISCORD_TOKEN is not set in environment variables");
  } else {
    // Initialize Discord bot
    bot = new DiscordBot(storage, DISCORD_TOKEN);
    try {
      await bot.start();
    } catch (error) {
      console.error("Failed to start Discord bot:", error);
    }
  }

  // API routes
  app.get("/api/status", async (req: Request, res: Response) => {
    try {
      const status = await storage.getBotStatus();
      let uptime = "0m";
      
      if (bot) {
        uptime = bot.getUptime();
      }
      
      res.json({
        ...status,
        uptime,
        isConnected: bot?.isConnectedToDiscord() || false
      });
    } catch (error) {
      res.status(500).json({ 
        message: `Error fetching bot status: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  app.get("/api/servers", async (req: Request, res: Response) => {
    try {
      const servers = await storage.getServers();
      res.json(servers);
    } catch (error) {
      res.status(500).json({ 
        message: `Error fetching servers: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  app.get("/api/channels", async (req: Request, res: Response) => {
    try {
      const serverId = req.query.serverId as string | undefined;
      const channels = await storage.getChannels(serverId);
      res.json(channels);
    } catch (error) {
      res.status(500).json({ 
        message: `Error fetching channels: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  app.get("/api/messages", async (req: Request, res: Response) => {
    try {
      const serverId = req.query.serverId as string | undefined;
      const channelId = req.query.channelId as string | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      let { messages, total } = await storage.getMessages({
        serverId,
        channelId,
        search,
        limit,
        offset
      });

      // Enrich messages with channel name
      if (messages.length > 0) {
        const channels = await storage.getChannels();
        messages = messages.map(message => {
          const channel = channels.find(c => c.id === message.channel_id);
          return {
            ...message,
            channel_name: channel ? channel.name : 'unknown-channel'
          };
        });
      }

      res.json({ messages, total });
    } catch (error) {
      res.status(500).json({ 
        message: `Error fetching messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const status = await storage.getBotStatus();
      
      // Get additional statistics
      const servers = await storage.getServers();
      const channels = await storage.getChannels();
      const { total: messageCount } = await storage.getMessages({});
      const commandLogs = await storage.getCommandLogs(1); // Get the latest command log
      
      let messageIncrease = "0%";
      let channelIncrease = "0";
      let oldestMessage = "N/A";
      
      // Calculate storage percentage (assuming 100MB limit)
      const storagePercentage = status ? Math.round((status.storage_usage / (100 * 1024)) * 100) : 0;
      
      // Format the storage usage in MB
      const storageUsage = status ? `${(status.storage_usage / 1024).toFixed(1)} MB` : "0 MB";
      
      // Get the oldest message date
      if (messageCount > 0) {
        const { messages } = await storage.getMessages({ limit: 1, offset: messageCount - 1 });
        if (messages.length > 0) {
          const date = new Date(messages[0].created_at);
          oldestMessage = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
        }
      }
      
      res.json({
        isConnected: bot?.isConnectedToDiscord() || false,
        uptime: bot?.getUptime() || "0m",
        totalMessages: messageCount,
        messageIncrease: "12% from last week", // Placeholder
        activeChannels: channels.length,
        channelIncrease: "3 new channels", // Placeholder
        monitoringDays: "14 days",
        oldestMessage,
        storageUsage,
        storagePercentage: `${storagePercentage}%`
      });
    } catch (error) {
      res.status(500).json({ 
        message: `Error fetching stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  app.get("/api/logs", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getCommandLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ 
        message: `Error fetching logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  app.post("/api/execute-command", async (req: Request, res: Response) => {
    try {
      const commandSchema = z.object({
        command: z.string()
      });
      
      const parsedCommand = commandSchema.safeParse(req.body);
      
      if (!parsedCommand.success) {
        return res.status(400).json({ message: "Invalid command format" });
      }
      
      if (!bot) {
        return res.status(503).json({ message: "Discord bot is not connected" });
      }
      
      const { command } = parsedCommand.data;
      const commandArgs = command.split(' ');
      
      if (commandArgs.length === 0 || !commandArgs[0].startsWith('!')) {
        return res.status(400).json({ message: "Command must start with !" });
      }
      
      // Execute the command using the utility function from the bot
      const response = await bot.getClient().isReady()
        ? await import('./utils').then(module => 
            module.executeCommand(
              commandArgs[0], 
              commandArgs.slice(1), 
              storage, 
              bot!
            )
          )
        : "Bot is not connected to Discord";
      
      // Log the command
      await storage.createCommandLog({
        command,
        response,
        executed_at: new Date()
      });
      
      res.json({ response });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Error executing command: ${errorMessage}` });
      
      // Log the failed command
      if (req.body && typeof req.body.command === 'string') {
        await storage.createCommandLog({
          command: req.body.command,
          response: `Error: ${errorMessage}`,
          executed_at: new Date()
        });
      }
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    if (bot) {
      await bot.stop();
    }
    process.exit(0);
  });

  return httpServer;
}

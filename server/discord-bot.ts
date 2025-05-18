import { Client, GatewayIntentBits, Events, Message, TextChannel } from 'discord.js';
import { IStorage } from './storage';
import { format } from 'date-fns';
import { executeCommand } from './utils';

export class DiscordBot {
  private client: Client;
  private storage: IStorage;
  private token: string;
  private startTime: Date | null = null;
  private isConnected: boolean = false;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(storage: IStorage, token: string) {
    this.storage = storage;
    this.token = token;
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ]
    });
    
    this.setupEventHandlers();
  }
  
  async start(): Promise<void> {
    try {
      await this.client.login(this.token);
      this.startTime = new Date();
      this.isConnected = true;
      
      // Update bot status
      await this.storage.updateBotStatus({
        is_online: 1,
        uptime_started: this.startTime
      });
      
      // Set up cleanup interval for old messages (runs every hour)
      this.cleanupInterval = setInterval(async () => {
        try {
          const deletedCount = await this.storage.deleteOldMessages();
          console.log(`Cleanup: Removed ${deletedCount} messages older than 2 weeks`);
        } catch (error) {
          console.error('Error during message cleanup:', error);
        }
      }, 60 * 60 * 1000); // 1 hour
      
      console.log('Discord bot connected successfully');
    } catch (error) {
      console.error('Failed to connect to Discord:', error);
      this.isConnected = false;
      
      // Update bot status to offline
      await this.storage.updateBotStatus({
        is_online: 0,
        uptime_started: null
      });
      
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    if (this.isConnected) {
      this.client.destroy();
      this.isConnected = false;
      this.startTime = null;
      
      // Update bot status to offline
      await this.storage.updateBotStatus({
        is_online: 0,
        uptime_started: null
      });
      
      console.log('Discord bot disconnected');
    }
  }
  
  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, async (client) => {
      console.log(`Logged in as ${client.user.tag}`);
      
      // Register all guilds (servers) the bot is in
      await this.syncServersAndChannels();
    });
    
    this.client.on(Events.MessageCreate, async (message) => {
      try {
        // Ignore bot's own messages
        if (message.author.bot) return;
        
        // Store the message
        await this.storeMessage(message);
        
        // Check if it's a command (starts with !)
        if (message.content.startsWith('!')) {
          await this.handleCommand(message);
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });
    
    this.client.on(Events.GuildCreate, async (guild) => {
      console.log(`Joined a new guild: ${guild.name}`);
      await this.syncServersAndChannels();
    });
    
    this.client.on(Events.ChannelCreate, async (channel) => {
      if (channel.isTextBased() && channel.guildId) {
        await this.syncServersAndChannels();
      }
    });
    
    this.client.on(Events.Error, (error) => {
      console.error('Discord client error:', error);
    });
  }
  
  async syncServersAndChannels(): Promise<void> {
    try {
      console.log(`Syncing servers and channels...`);
      
      // Sync servers (guilds)
      for (const guild of this.client.guilds.cache.values()) {
        await this.storage.createServer({
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL() || null,
          joined_at: new Date()
        });
        
        // Fetch all channels for this guild to ensure we have the latest data
        await guild.channels.fetch();
        
        // Sync channels for this guild
        const textChannels = guild.channels.cache.filter(
          channel => channel.isTextBased() && !channel.isDMBased()
        );
        
        console.log(`Found ${textChannels.size} text channels in ${guild.name}`);
        
        for (const channel of textChannels.values()) {
          await this.storage.createChannel({
            id: channel.id,
            server_id: guild.id,
            name: channel.name,
            type: channel.type.toString()
          });
        }
      }
      
      // Log the total channels after syncing
      const channels = await this.storage.getChannels();
      console.log(`Total channels synced: ${channels.length}`);
    } catch (error) {
      console.error('Error syncing servers and channels:', error);
    }
  }
  
  private async storeMessage(message: Message): Promise<void> {
    if (!message.guild) return; // Ignore DMs
    
    try {
      await this.storage.createMessage({
        id: message.id,
        server_id: message.guild.id,
        channel_id: message.channel.id,
        author_id: message.author.id,
        author_username: message.author.username,
        author_discriminator: message.author.discriminator || '',
        content: message.content,
        created_at: message.createdAt
      });
    } catch (error) {
      console.error('Error storing message:', error);
    }
  }
  
  private async handleCommand(message: Message): Promise<void> {
    const commandArgs = message.content.split(' ');
    const command = commandArgs[0].toLowerCase();
    
    let response = '';
    
    try {
      response = await executeCommand(command, commandArgs.slice(1), this.storage, this);
      
      // Log the command
      await this.storage.createCommandLog({
        command: message.content,
        response,
        executed_at: new Date()
      });
      
      // Send response to Discord
      await message.reply(response);
    } catch (error) {
      console.error('Error handling command:', error);
      response = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      await message.reply(response);
      
      // Log the error
      await this.storage.createCommandLog({
        command: message.content,
        response,
        executed_at: new Date()
      });
    }
  }
  
  // Utility methods
  isConnectedToDiscord(): boolean {
    return this.isConnected;
  }
  
  getUptime(): string {
    if (!this.startTime) return '0m';
    
    const now = new Date();
    const uptimeMs = now.getTime() - this.startTime.getTime();
    
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
  
  getClient(): Client {
    return this.client;
  }
}

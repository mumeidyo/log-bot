import { IStorage } from './storage';
import { DiscordBot } from './discord-bot';
import { format } from 'date-fns';

// Execute bot commands
export async function executeCommand(
  command: string,
  args: string[],
  storage: IStorage,
  bot: DiscordBot
): Promise<string> {
  switch (command) {
    case '!help':
      return formatHelpCommand();
      
    case '!messages':
      return await formatMessagesCommand(args, storage);
      
    case '!stats':
      return await formatStatsCommand(storage, bot);
      
    case '!clear':
      return await formatClearCommand(args, storage);
      
    default:
      throw new Error('Unknown command. Type !help for a list of commands');
  }
}

// Format the help command response
function formatHelpCommand(): string {
  return [
    '**Available Commands:**',
    '`!messages [channel] [count]` - Get recent messages',
    '`!stats` - Display message statistics',
    '`!help` - Show command list',
    '`!clear [days]` - Clear message logs older than X days',
  ].join('\n');
}

// Format the messages command response
async function formatMessagesCommand(args: string[], storage: IStorage): Promise<string> {
  let channelId: string | undefined = undefined;
  let limit = 5;
  
  // Parse arguments
  if (args.length > 0) {
    // Check if the first argument is a channel mention (<#123456789>)
    const channelMatch = args[0].match(/<#(\d+)>/);
    if (channelMatch) {
      channelId = channelMatch[1];
    }
    
    // Check if there's a limit specified
    if (args.length > 1 && !isNaN(parseInt(args[1]))) {
      limit = Math.min(20, parseInt(args[1])); // Max 20 messages at once
    }
  }
  
  // Get messages
  const { messages, total } = await storage.getMessages({
    channelId,
    limit
  });
  
  if (messages.length === 0) {
    return 'No messages found with the given criteria.';
  }
  
  // Get channel name if specified
  let channelName = 'all channels';
  if (channelId) {
    const channel = await storage.getChannel(channelId);
    if (channel) {
      channelName = `#${channel.name}`;
    }
  }
  
  // Format response
  const formattedMessages = messages.map(msg => {
    const dateStr = format(new Date(msg.created_at), 'MMM d, yyyy HH:mm');
    return `**${msg.author_username}** (${dateStr}): ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`;
  }).join('\n\n');
  
  return `**Recent Messages from ${channelName}** (Showing ${messages.length} of ${total} messages):\n\n${formattedMessages}`;
}

// Format the stats command response
async function formatStatsCommand(storage: IStorage, bot: DiscordBot): Promise<string> {
  const status = await storage.getBotStatus();
  
  if (!status) {
    return 'Error: Bot status not available';
  }
  
  const servers = await storage.getServers();
  const channels = await storage.getChannels();
  const { total: messageCount } = await storage.getMessages({});
  
  return [
    '**Bot Statistics:**',
    `Status: ${status.is_online ? 'Online' : 'Offline'}`,
    `Uptime: ${bot.getUptime()}`,
    `Monitoring ${servers.length} servers and ${channels.length} channels`,
    `Total Messages: ${messageCount}`,
    `Storage Usage: ${status.storage_usage} KB`,
  ].join('\n');
}

// Format the clear command response
async function formatClearCommand(args: string[], storage: IStorage): Promise<string> {
  // Default to 14 days if not specified
  const days = args.length > 0 && !isNaN(parseInt(args[0])) 
    ? parseInt(args[0]) 
    : 14;
  
  const deletedCount = await storage.deleteOldMessages();
  
  return `Cleared ${deletedCount} messages older than ${days} days.`;
}

// Format uptime for display
export function formatUptime(uptimeStarted: Date | null): string {
  if (!uptimeStarted) return '0m';
  
  const now = new Date();
  const uptimeMs = now.getTime() - uptimeStarted.getTime();
  
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

// Calculate storage percentage
export function calculateStoragePercentage(usage: number): number {
  // Assume a 100MB limit for our example
  const STORAGE_LIMIT_KB = 100 * 1024;
  
  return Math.round((usage / STORAGE_LIMIT_KB) * 100);
}

// Format dateRange for frontend display
export function formatDateRange(daysBack: number): string {
  if (daysBack === 14) {
    return 'Last 14 days';
  } else if (daysBack === 7) {
    return 'Last 7 days';
  } else if (daysBack === 30) {
    return 'Last 30 days';
  } else if (daysBack === 1) {
    return 'Today';
  } else {
    return `Last ${daysBack} days`;
  }
}

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { type MessagesResponse, type Message } from "@/lib/types";

interface MessageLogProps {
  serverId: string | null;
  channelId: string | null;
  searchQuery: string;
  currentPage: number;
  messagesPerPage: number;
  onPageChange: (page: number) => void;
  viewMode: "list" | "grid";
}

export default function MessageLog({
  serverId,
  channelId,
  searchQuery,
  currentPage,
  messagesPerPage,
  onPageChange,
  viewMode
}: MessageLogProps) {
  // Calculate offset
  const offset = (currentPage - 1) * messagesPerPage;
  
  // Fetch messages
  const { data, isLoading } = useQuery<MessagesResponse>({
    queryKey: ["/api/messages", { serverId, channelId, search: searchQuery, limit: messagesPerPage, offset }],
    staleTime: 30000, // 30 seconds
  });
  
  // Get abbreviation from username
  const getInitials = (username: string): string => {
    return username.substring(0, 2).toUpperCase();
  };
  
  // Get color for user avatar
  const getUserColor = (userId: string): string => {
    // Generate a consistent color based on user ID
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const colors = [
      "bg-primary",        // Discord blurple
      "bg-[#43B581]",      // Discord green
      "bg-destructive",    // Discord red
      "bg-purple-500",     // Purple
      "bg-yellow-500",     // Yellow
      "bg-indigo-500",     // Indigo
      "bg-pink-500",       // Pink
      "bg-blue-500",       // Blue
      "bg-green-500",      // Green
      "bg-orange-500",     // Orange
    ];
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };
  
  // Render message border color
  const getMessageBorderColor = (userId: string): string => {
    // Generate a consistent border color based on user ID
    // We'll use just two colors for simplicity
    const hash = userId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    return hash % 2 === 0 ? "border-primary" : "border-[#43B581]";
  };
  
  // Calculate total pages
  const totalPages = data ? Math.ceil(data.total / messagesPerPage) : 0;
  
  // Generate page buttons
  const generatePageButtons = () => {
    if (!data || totalPages <= 1) return null;
    
    const pageButtons = [];
    const maxVisiblePages = 5;
    
    // Always show first page
    pageButtons.push(
      <Button
        key="page-1"
        variant={currentPage === 1 ? "default" : "outline"}
        className={cn(
          currentPage === 1 ? "bg-primary" : "bg-popover",
          "px-3 py-1 text-sm"
        )}
        onClick={() => onPageChange(1)}
      >
        1
      </Button>
    );
    
    // Calculate range of pages to show
    let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3);
    
    if (startPage > 2) {
      pageButtons.push(
        <Button
          key="ellipsis-start"
          variant="outline"
          className="bg-popover px-3 py-1 text-sm"
          disabled
        >
          ...
        </Button>
      );
    }
    
    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <Button
          key={`page-${i}`}
          variant={currentPage === i ? "default" : "outline"}
          className={cn(
            currentPage === i ? "bg-primary" : "bg-popover",
            "px-3 py-1 text-sm"
          )}
          onClick={() => onPageChange(i)}
        >
          {i}
        </Button>
      );
    }
    
    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      pageButtons.push(
        <Button
          key="ellipsis-end"
          variant="outline"
          className="bg-popover px-3 py-1 text-sm"
          disabled
        >
          ...
        </Button>
      );
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pageButtons.push(
        <Button
          key={`page-${totalPages}`}
          variant={currentPage === totalPages ? "default" : "outline"}
          className={cn(
            currentPage === totalPages ? "bg-primary" : "bg-popover",
            "px-3 py-1 text-sm"
          )}
          onClick={() => onPageChange(totalPages)}
        >
          {totalPages}
        </Button>
      );
    }
    
    return pageButtons;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <section className="bg-card rounded-lg p-4 shadow">
        <h3 className="text-lg font-medium mb-4">Recent Messages</h3>
        <div className="space-y-3">
          {[...Array(messagesPerPage)].map((_, index) => (
            <div key={index} className="border-l-4 border-primary bg-popover rounded p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="ml-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="pl-10">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-1" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-between items-center">
          <Skeleton className="h-4 w-48" />
          <div className="flex space-x-2">
            {[...Array(5)].map((_, index) => (
              <Skeleton key={index} className="h-8 w-8" />
            ))}
          </div>
        </div>
      </section>
    );
  }
  
  // No messages state
  if (!data || data.messages.length === 0) {
    return (
      <section className="bg-card rounded-lg p-4 shadow">
        <h3 className="text-lg font-medium mb-4">Recent Messages</h3>
        <div className="py-8 text-center">
          <span className="material-icons text-4xl text-muted-foreground mb-2">chat_bubble_outline</span>
          <p className="text-muted-foreground">No messages found</p>
        </div>
      </section>
    );
  }
  
  return (
    <section className="bg-card rounded-lg p-4 shadow">
      <h3 className="text-lg font-medium mb-4">Recent Messages</h3>
      
      {/* Message List */}
      <div className={cn(
        viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-3"
      )}>
        {data.messages.map((message: Message) => (
          <div
            key={message.id}
            className={cn(
              `border-l-4 ${getMessageBorderColor(message.author_id)} bg-popover rounded p-3`
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold",
                  getUserColor(message.author_id)
                )}>
                  {getInitials(message.author_username)}
                </div>
                <div className="ml-2">
                  <div className="font-medium">
                    {message.author_username}
                    {message.author_discriminator && message.author_discriminator !== '0' && 
                      `#${message.author_discriminator}`
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">
                    #{(message as any).channel_name || "channel"}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatTimestamp(message.created_at)}
              </div>
            </div>
            <div className="pl-10">
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination Controls */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {offset + 1}-{Math.min(offset + data.messages.length, data.total)} of {data.total} messages
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="bg-popover px-3 py-1 text-sm"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <span className="material-icons text-sm">chevron_left</span>
          </Button>
          
          {generatePageButtons()}
          
          <Button
            variant="outline"
            className="bg-popover px-3 py-1 text-sm"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <span className="material-icons text-sm">chevron_right</span>
          </Button>
        </div>
      </div>
    </section>
  );
}

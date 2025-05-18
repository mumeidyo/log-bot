import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import StatsSection from "@/components/stats-section";
import MessageControls from "@/components/message-controls";
import MessageLog from "@/components/message-log";
import CommandInterface from "@/components/command-interface";
import ServerSelector from "@/components/server-selector";
import { Button } from "@/components/ui/button";
import { type ServerOption, type ChannelOption } from "@/lib/types";

export default function Dashboard() {
  const [selectedServer, setSelectedServer] = useState<ServerOption>({ id: null, name: "All Servers" });
  const [selectedChannel, setSelectedChannel] = useState<ChannelOption>({ id: null, name: "All Channels" });
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState(14); // Default to 14 days
  const [currentPage, setCurrentPage] = useState(1);
  const [messagesPerPage, setMessagesPerPage] = useState(5);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Fetch servers
  const { data: servers = [] } = useQuery({
    queryKey: ["/api/servers"],
    staleTime: 60000, // 1 minute
  });

  // Status query to check if the bot is online
  const { data: botStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/status"],
    staleTime: 30000, // 30 seconds
  });

  // Handle refresh
  const handleRefresh = () => {
    refetchStatus();
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <Sidebar isOnline={botStatus?.isConnected || false} uptime={botStatus?.uptime || "0m"} />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card px-6 py-4 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monitor your Discord messages</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Server Selector */}
            <ServerSelector 
              servers={servers} 
              selectedServer={selectedServer} 
              onSelectServer={setSelectedServer} 
            />
            
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="bg-popover"
            >
              <span className="material-icons text-muted-foreground">refresh</span>
            </Button>
            
            {/* Settings Button */}
            <Button
              variant="outline"
              size="icon"
              className="bg-popover"
            >
              <span className="material-icons text-muted-foreground">settings</span>
            </Button>
          </div>
        </header>
        
        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto p-6 bg-background">
          {/* Stats Section */}
          <StatsSection />
          
          {/* Filters & Controls */}
          <MessageControls
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            selectedChannel={selectedChannel}
            onChannelChange={setSelectedChannel}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            serverId={selectedServer.id}
          />
          
          {/* Message Log */}
          <MessageLog
            serverId={selectedServer.id}
            channelId={selectedChannel.id}
            searchQuery={searchQuery}
            currentPage={currentPage}
            messagesPerPage={messagesPerPage}
            onPageChange={setCurrentPage}
            viewMode={viewMode}
          />
          
          {/* Command Interface */}
          <CommandInterface />
        </div>
      </main>
    </div>
  );
}

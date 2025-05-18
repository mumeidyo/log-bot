import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type ChannelOption } from "@/lib/types";

interface MessageControlsProps {
  dateRange: number;
  onDateRangeChange: (days: number) => void;
  selectedChannel: ChannelOption;
  onChannelChange: (channel: ChannelOption) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  serverId: string | null;
}

export default function MessageControls({
  dateRange,
  onDateRangeChange,
  selectedChannel,
  onChannelChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  serverId
}: MessageControlsProps) {
  const [searchInputValue, setSearchInputValue] = useState(searchQuery);
  
  // Format date range for display
  const formatDateRange = (days: number): string => {
    switch (days) {
      case 1: return "Today";
      case 7: return "Last 7 days";
      case 14: return "Last 14 days";
      case 30: return "Last 30 days";
      default: return `Last ${days} days`;
    }
  };
  
  // Date range options
  const dateRangeOptions = [
    { label: "Today", value: 1 },
    { label: "Last 7 days", value: 7 },
    { label: "Last 14 days", value: 14 },
    { label: "Last 30 days", value: 30 },
  ];
  
  // Fetch channels for the selected server
  const { data: channels = [] } = useQuery({
    queryKey: ["/api/channels", serverId],
    staleTime: 60000, // 1 minute
  });
  
  // Reset channel selection when server changes
  useEffect(() => {
    onChannelChange({ id: null, name: "All Channels" });
  }, [serverId, onChannelChange]);
  
  // Handle search input
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInputValue(e.target.value);
  };
  
  // Handle search submit
  const handleSearchSubmit = () => {
    onSearchChange(searchInputValue);
  };
  
  // Handle key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };
  
  return (
    <section className="bg-card rounded-lg p-4 mb-6 shadow">
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-popover">
                <span className="material-icons mr-2 text-sm">date_range</span>
                {formatDateRange(dateRange)}
                <span className="material-icons ml-1 text-sm">expand_more</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {dateRangeOptions.map((option) => (
                <DropdownMenuItem 
                  key={option.value}
                  onClick={() => onDateRangeChange(option.value)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Channel Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-popover">
                <span className="material-icons mr-2 text-sm">filter_list</span>
                {selectedChannel.name}
                <span className="material-icons ml-1 text-sm">expand_more</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => onChannelChange({ id: null, name: "All Channels" })}
              >
                All Channels
              </DropdownMenuItem>
              {channels.map((channel: any) => (
                <DropdownMenuItem 
                  key={channel.id}
                  onClick={() => onChannelChange({ id: channel.id, name: `#${channel.name}` })}
                >
                  #{channel.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Search */}
          <div className="relative flex">
            <div className="flex items-center bg-popover rounded overflow-hidden px-2">
              <span className="material-icons text-muted-foreground">search</span>
              <Input
                type="text"
                placeholder="Search messages"
                className="bg-transparent border-none focus:outline-none w-40 md:w-auto"
                value={searchInputValue}
                onChange={handleSearchInput}
                onKeyPress={handleSearchKeyPress}
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSearchSubmit}
              className="ml-1"
            >
              Go
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Export Button */}
          <Button variant="outline" className="bg-popover">
            <span className="material-icons mr-2 text-sm">download</span>
            Export
          </Button>
          
          {/* View Options */}
          <div className="flex bg-popover rounded overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              className={viewMode === "list" ? "bg-primary" : ""}
              size="sm"
              onClick={() => onViewModeChange("list")}
            >
              <span className="material-icons text-sm">view_list</span>
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              className={viewMode === "grid" ? "bg-primary" : ""}
              size="sm"
              onClick={() => onViewModeChange("grid")}
            >
              <span className="material-icons text-sm">grid_view</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

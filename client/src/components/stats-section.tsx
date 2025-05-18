import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { type StatsResponse } from "@/lib/types";

export default function StatsSection() {
  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/stats"],
    staleTime: 30000, // 30 seconds
  });
  
  if (isLoading) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-card rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div className="w-full">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-7 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        ))}
      </section>
    );
  }
  
  if (!stats) {
    return (
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4 shadow">
          <p className="text-muted-foreground">Could not load stats</p>
        </div>
      </section>
    );
  }
  
  // Extract percentage value
  const storagePercentValue = parseInt(stats.storagePercentage.replace('%', ''));
  
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Messages Card */}
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Total Messages</p>
            <p className="text-2xl font-semibold">{stats.totalMessages.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary bg-opacity-20 flex items-center justify-center">
            <span className="material-icons text-primary">chat</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-[#43B581] flex items-center">
          <span className="material-icons text-xs mr-1">arrow_upward</span>
          <span>{stats.messageIncrease}</span>
        </div>
      </div>
      
      {/* Active Channels Card */}
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Active Channels</p>
            <p className="text-2xl font-semibold">{stats.activeChannels}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#43B581] bg-opacity-20 flex items-center justify-center">
            <span className="material-icons text-[#43B581]">tag</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-[#43B581] flex items-center">
          <span className="material-icons text-xs mr-1">arrow_upward</span>
          <span>{stats.channelIncrease}</span>
        </div>
      </div>
      
      {/* Monitoring Time Card */}
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Monitoring Time</p>
            <p className="text-2xl font-semibold">{stats.monitoringDays}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary bg-opacity-20 flex items-center justify-center">
            <span className="material-icons text-primary">schedule</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span>Oldest: {stats.oldestMessage}</span>
        </div>
      </div>
      
      {/* Storage Usage Card */}
      <div className="bg-card rounded-lg p-4 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Storage Usage</p>
            <p className="text-2xl font-semibold">{stats.storageUsage}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-destructive bg-opacity-20 flex items-center justify-center">
            <span className="material-icons text-destructive">storage</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <Progress value={storagePercentValue} className="h-1.5 bg-card" />
          <span className="text-xs mt-1 inline-block">{stats.storagePercentage} of limit</span>
        </div>
      </div>
    </section>
  );
}

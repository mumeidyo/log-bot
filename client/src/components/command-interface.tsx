import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { type CommandLog, type CommandResponse } from "@/lib/types";

export default function CommandInterface() {
  const [command, setCommand] = useState("");
  const { toast } = useToast();
  
  // Fetch command logs
  const { data: logs = [], refetch: refetchLogs } = useQuery<CommandLog[]>({
    queryKey: ["/api/logs"],
    staleTime: 30000, // 30 seconds
  });
  
  // Execute command mutation
  const mutation = useMutation({
    mutationFn: async (cmd: string) => {
      const res = await apiRequest('POST', '/api/execute-command', { command: cmd });
      return res.json() as Promise<CommandResponse>;
    },
    onSuccess: () => {
      setCommand("");
      refetchLogs();
    },
    onError: (error) => {
      toast({
        title: "Command Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle command execution
  const executeCommand = () => {
    if (!command) return;
    
    mutation.mutate(command);
  };
  
  // Handle key press (Enter to execute)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      executeCommand();
    }
  };
  
  return (
    <section className="bg-card rounded-lg p-4 mt-6 shadow">
      <h3 className="text-lg font-medium mb-3">Bot Command Interface</h3>
      <div className="flex flex-col space-y-4">
        <div className="bg-popover rounded-lg p-3">
          <div className="font-mono text-sm mb-2 text-muted-foreground">Available Commands:</div>
          <div className="pl-4 font-mono text-xs space-y-1">
            <div><span className="text-[#43B581]">!messages</span> <span className="text-muted-foreground">[channel] [count]</span> - Get recent messages</div>
            <div><span className="text-[#43B581]">!stats</span> - Display message statistics</div>
            <div><span className="text-[#43B581]">!help</span> - Show command list</div>
            <div><span className="text-[#43B581]">!clear</span> <span className="text-muted-foreground">[days]</span> - Clear message logs older than X days</div>
          </div>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-muted-foreground">{">"}</span>
          </div>
          <Input
            type="text"
            className="w-full bg-popover text-white pl-6 pr-24 py-2 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Type a command..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={mutation.isPending}
          />
          <Button
            className="absolute inset-y-0 right-0 px-4 py-1 m-1 bg-primary rounded text-white text-sm hover:bg-opacity-80"
            onClick={executeCommand}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Executing..." : "Execute"}
          </Button>
        </div>
        
        <div className="bg-black bg-opacity-30 rounded-lg p-3 h-32 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <>
              <div className="text-[#43B581]">{"> Connected to Discord API"}</div>
              <div className="text-muted-foreground">{"> Type !help for a list of commands"}</div>
            </>
          ) : (
            logs.slice().reverse().map((log) => (
              <div key={log.id}>
                <div className="text-white">{`> ${log.command}`}</div>
                <div className="text-[#43B581] whitespace-pre-line">{`> ${log.response}`}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

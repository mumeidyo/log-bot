import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ServerOption } from "@/lib/types";

interface ServerSelectorProps {
  servers: any[];
  selectedServer: ServerOption;
  onSelectServer: (server: ServerOption) => void;
}

export default function ServerSelector({
  servers,
  selectedServer,
  onSelectServer
}: ServerSelectorProps) {
  const handleSelectServer = (server: any) => {
    onSelectServer({
      id: server.id,
      name: server.name
    });
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-popover flex items-center text-sm">
          <span>{selectedServer.name}</span>
          <span className="material-icons ml-1 text-sm">expand_more</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onSelectServer({ id: null, name: "All Servers" })}>
          All Servers
        </DropdownMenuItem>
        {servers.map((server) => (
          <DropdownMenuItem 
            key={server.id}
            onClick={() => handleSelectServer(server)}
          >
            {server.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

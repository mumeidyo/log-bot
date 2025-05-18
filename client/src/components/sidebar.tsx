import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOnline: boolean;
  uptime: string;
}

export default function Sidebar({ isOnline, uptime }: SidebarProps) {
  const [location] = useLocation();
  
  const navItems = [
    {
      href: "/",
      label: "Dashboard",
      icon: "dashboard",
      active: location === "/" || location === ""
    },
    {
      href: "/messages",
      label: "Messages",
      icon: "chat",
      active: location === "/messages"
    },
    {
      href: "/servers",
      label: "Servers",
      icon: "dns",
      active: location === "/servers"
    },
    {
      href: "/settings",
      label: "Settings",
      icon: "settings",
      active: location === "/settings"
    },
    {
      href: "/logs",
      label: "Logs",
      icon: "receipt_long",
      active: location === "/logs"
    }
  ];
  
  return (
    <aside className="w-full md:w-64 bg-sidebar flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-icons text-white text-sm">visibility</span>
          </div>
          <h1 className="text-lg font-bold text-white">Message Monitor</h1>
        </div>
      </div>
      
      <nav className="p-2 flex-1">
        <ul>
          {navItems.map((item) => (
            <li className="mb-1" key={item.href}>
              <Link href={item.href} className={cn(
                "flex items-center px-4 py-2 rounded transition",
                item.active
                  ? "text-white bg-primary hover:bg-opacity-80"
                  : "text-muted-foreground hover:text-white hover:bg-background"
              )}>
                <span className="material-icons mr-2 text-sm">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center space-x-2">
          <span className="flex h-3 w-3">
            <span className={cn(
              "relative inline-flex rounded-full h-3 w-3",
              isOnline ? "bg-[#43B581]" : "bg-destructive"
            )}></span>
          </span>
          <span className="text-sm text-muted-foreground">
            Bot {isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Uptime: {uptime}
        </div>
      </div>
    </aside>
  );
}

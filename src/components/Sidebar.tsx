import React from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  Package,
  MapPin,
  Wrench,
  FileText,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  Settings,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { User } from '@/types/wardops';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface SidebarProps {
  user?: User;
  activeTab: string | null;
  onTabChange: (tab: string) => void;
  isMiddlePanelCollapsed?: boolean;
  onExpandMiddlePanel?: () => void;
  onLogout?: () => void;
}

const navItems = [
  { id: 'ask', label: 'Ask Vitalis', icon: MessageSquare },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export function Sidebar({ user, activeTab, onTabChange, isMiddlePanelCollapsed, onExpandMiddlePanel, onLogout }: SidebarProps) {
  return (
    <div className="flex h-screen w-40 flex-col border-r border-border-medium" style={{ backgroundColor: 'hsl(var(--bg-sidebar))' }}>
      {/* Logo Section */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent-green flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-white rounded-sm" />
          </div>
          <div>
            <h1 className="text-base font-semibold" style={{ color: 'hsl(var(--text-white))' }}>Vitalis</h1>
            <p className="text-xs" style={{ color: 'hsl(var(--text-white-dim))' }}>AI Ops Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isCollapsed = isActive && isMiddlePanelCollapsed;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isCollapsed && onExpandMiddlePanel) {
                  onExpandMiddlePanel();
                } else {
                  onTabChange(item.id);
                }
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-md
                transition-smooth text-sm
                ${isActive
                  ? 'bg-white/10'
                  : 'hover:bg-white/5'
                }
              `}
              style={{ color: isActive ? 'hsl(var(--text-white))' : 'hsl(var(--text-white-dim))' }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
              {isCollapsed && <ChevronRight className="h-3 w-3 ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="p-3 border-t border-white/10">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full rounded-md p-2 flex items-center gap-2 bg-white/5 hover:bg-white/10 transition-smooth">
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-accent-green flex items-center justify-center">
                    <span className="text-xs font-semibold" style={{ color: 'hsl(var(--text-white))' }}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  {user.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-400 rounded-full border-2" style={{ borderColor: 'hsl(var(--bg-sidebar))' }} />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium truncate" style={{ color: 'hsl(var(--text-white))' }}>{user.name}</p>
                  <p className="text-xs truncate" style={{ color: 'hsl(var(--text-white-dim))' }}>{user.role}</p>
                </div>
                <ChevronDown className="h-3 w-3 flex-shrink-0" style={{ color: 'hsl(var(--text-white-dim))' }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info('Profile page coming soon')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info('Settings page coming soon')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info('Help page coming soon')}>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (onLogout) {
                  onLogout();
                  toast.success('Logged out successfully');
                }
              }}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        ) : (
          <div className="w-full rounded-md p-2 flex items-center gap-2 bg-white/5">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
              <UserIcon className="h-4 w-4" style={{ color: 'hsl(var(--text-white-dim))' }} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs" style={{ color: 'hsl(var(--text-white-dim))' }}>Loading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

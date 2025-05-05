import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { 
  LayoutDashboard, 
  Kanban, 
  Calendar, 
  FileText, 
  Users, 
  Settings, 
  HelpCircle, 
  Clock, 
  Bell, 
  BarChart2, 
  Briefcase,
  GanttChart
} from 'lucide-react';

type SidebarItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  indented?: boolean;
};

const SidebarItem = ({ href, icon, label, active, indented }: SidebarItemProps) => {
  return (
    <Link href={href}>
      <a
        className={cn(
          'flex items-center py-2 px-4 text-sm rounded-md transition-colors',
          indented && 'ml-6',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <span className="mr-3">{icon}</span>
        <span className="truncate">{label}</span>
      </a>
    </Link>
  );
};

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className={cn('h-screen w-64 bg-white border-r border-gray-200 flex flex-col', className)}>
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-primary">ProjectHub</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          <SidebarItem 
            href="/" 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={location === '/'} 
          />
          
          <SidebarItem 
            href="/projects" 
            icon={<Briefcase size={18} />} 
            label="Projects" 
            active={location.startsWith('/projects')} 
          />
          
          <SidebarItem 
            href="/tasks" 
            icon={<FileText size={18} />} 
            label="Tasks" 
            active={location === '/tasks'} 
          />
          
          <div className="pt-2 pb-1">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Planning
            </p>
          </div>
          
          <SidebarItem 
            href="/kanban" 
            icon={<Kanban size={18} />} 
            label="Kanban Board" 
            active={location.includes('/kanban')} 
          />
          
          <SidebarItem 
            href="/gantt" 
            icon={<GanttChart size={18} />} 
            label="Gantt Chart" 
            active={location.includes('/gantt') && !location.includes('/modern-gantt')} 
          />
          
          <SidebarItem 
            href="/modern-gantt" 
            icon={<GanttChart size={18} />} 
            label="Modern Gantt" 
            active={location.includes('/modern-gantt')} 
            indented={true}
          />
          
          <SidebarItem 
            href="/timeline" 
            icon={<Calendar size={18} />} 
            label="Timeline" 
            active={location === '/timeline'} 
          />
          
          <div className="pt-2 pb-1">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Team
            </p>
          </div>
          
          <SidebarItem 
            href="/team" 
            icon={<Users size={18} />} 
            label="Members" 
            active={location === '/team'} 
          />
          
          <SidebarItem 
            href="/time-tracking" 
            icon={<Clock size={18} />} 
            label="Time Tracking" 
            active={location === '/time-tracking'} 
          />
          
          <SidebarItem 
            href="/analytics" 
            icon={<BarChart2 size={18} />} 
            label="Analytics" 
            active={location === '/analytics'} 
          />
          
          <div className="pt-2 pb-1">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Other
            </p>
          </div>
          
          <SidebarItem 
            href="/notifications" 
            icon={<Bell size={18} />} 
            label="Notifications" 
            active={location === '/notifications'} 
          />
          
          <SidebarItem 
            href="/help" 
            icon={<HelpCircle size={18} />} 
            label="Help & Support" 
            active={location === '/help'} 
          />
          
          <SidebarItem 
            href="/settings" 
            icon={<Settings size={18} />} 
            label="Settings" 
            active={location === '/settings'} 
          />
        </div>
      </nav>
      
      <div className="p-4 border-t border-gray-200 flex items-center">
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
          {user.username.substring(0, 2).toUpperCase()}
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{user.username}</p>
          <p className="text-xs text-gray-500">{user.role || 'User'}</p>
        </div>
      </div>
    </div>
  );
}
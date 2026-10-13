import React, { useState } from 'react';
import {
  Mic,
  Calendar,
  BarChart3,
  MessageSquare,
  Sparkles,
  Settings,
  Flame,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  ActivitySquare,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type PageRoute = '/' | '/timeline' | '/dashboard' | '/ask' | '/insights' | '/settings';

interface NavigationProps {
  currentRoute: PageRoute;
  onNavigate: (route: PageRoute) => void;
  streakDays?: number;
}

interface NavItemConfig {
  path: PageRoute;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

export const navItems: NavItemConfig[] = [
  {
    path: '/',
    label: 'Voice Log',
    icon: Mic,
    badge: 'Live',
    description: 'Speak & record daily habits',
  },
  {
    path: '/timeline',
    label: 'Timeline',
    icon: Calendar,
    description: 'Day-by-day logs & filters',
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    description: 'Bento analytics & charts',
  },
  {
    path: '/ask',
    label: 'Ask',
    icon: MessageSquare,
    description: 'Conversational reflection',
  },
  {
    path: '/insights',
    label: 'Insights',
    icon: Sparkles,
    badge: 'AI',
    description: 'Weekly health patterns',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
    badge: 'Omi',
    description: 'Goals & integrations',
  },
];

export const DesktopSidebar: React.FC<NavigationProps> = ({
  currentRoute,
  onNavigate,
  streakDays = 0,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('dayline_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const { theme, toggleTheme } = useTheme();

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('dayline_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <aside
      className={`hidden md:flex flex-col border-r transition-all duration-300 ease-in-out select-none shrink-0 h-screen sticky top-0 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-slate-900/40 dark:bg-[#0d121f]/90 bg-white/70 backdrop-blur-xl border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-slate-100 justify-between`}
    >
      <div className="p-3.5 flex flex-col h-full">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1.5 py-2 mb-6">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-3 text-left group cursor-pointer overflow-hidden"
            title="Dayline Home"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform shrink-0">
              <ActivitySquare className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    Dayline
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium -mt-0.5 tracking-wide">
                  Voice Wellness
                </p>
              </div>
            )}
          </button>

          {/* Sidebar Collapse Toggle */}
          <button
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.path;
            return (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer group ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600 text-white shadow-md shadow-violet-600/25 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-violet-500'
                    }`}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && !isActive && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300 border border-violet-500/20">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section: Streak Card & Theme Switch */}
        <div className="pt-4 border-t border-slate-200/70 dark:border-white/5 space-y-3">
          {/* Daily Streak Card */}
          {!isCollapsed ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-teal-500/10 dark:from-violet-500/10 dark:to-teal-500/5 border border-violet-500/20 dark:border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  Streak
                </span>
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                  {streakDays} {streakDays === 1 ? 'Day' : 'Days'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {streakDays > 0 ? 'Consecutive logs active!' : 'Log today to start streak'}
              </p>
            </div>
          ) : (
            <div
              className="flex justify-center p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20"
              title={`${streakDays} Day Streak`}
            >
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`w-full flex items-center justify-center p-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer text-xs font-medium ${
              isCollapsed ? '' : 'gap-2'
            }`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                {!isCollapsed && <span>Light Mode</span>}
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-violet-600" />
                {!isCollapsed && <span>Dark Mode</span>}
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};

export const MobileBottomBar: React.FC<NavigationProps> = ({ currentRoute, onNavigate }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c101d]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 px-3 py-2 shadow-2xl">
      <div className="flex items-center justify-between max-w-lg mx-auto relative">
        {/* Timeline */}
        <button
          onClick={() => onNavigate('/timeline')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            currentRoute === '/timeline'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-400'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Timeline</span>
        </button>

        {/* Dashboard */}
        <button
          onClick={() => onNavigate('/dashboard')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            currentRoute === '/dashboard'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Dashboard</span>
        </button>

        {/* Raised Center Mic Orb */}
        <div className="-mt-7 relative group">
          <button
            onClick={() => onNavigate('/')}
            title="Open Voice Logger"
            aria-label="Open Voice Logger"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-teal-400 p-0.5 shadow-xl shadow-violet-600/40 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-white dark:ring-[#0c101d]"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center">
              <Mic className="w-6 h-6 animate-pulse" />
            </div>
          </button>
          <span className="text-[9px] font-bold text-center block text-slate-500 dark:text-slate-400 mt-1">
            Log
          </span>
        </div>

        {/* Ask */}
        <button
          onClick={() => onNavigate('/ask')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            currentRoute === '/ask'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-400'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Ask</span>
        </button>

        {/* Insights */}
        <button
          onClick={() => onNavigate('/insights')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            currentRoute === '/insights'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-400'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-1">Insights</span>
        </button>
      </div>
    </nav>
  );
};

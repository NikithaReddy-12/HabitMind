import React, { useState } from 'react';
import {
  Sparkles,
  Milestone,
  Orbit,
  MessageSquareQuote,
  User,
} from 'lucide-react';

export type AuroraRoute = 'today' | 'journey' | 'patterns' | 'ask' | 'you';

interface FloatingDockProps {
  currentRoute: AuroraRoute;
  onRouteChange: (route: AuroraRoute) => void;
}

interface DockItem {
  id: AuroraRoute;
  label: string;
  icon: React.FC<{ className?: string }>;
}

const DOCK_ITEMS: DockItem[] = [
  { id: 'today', label: 'Today', icon: Sparkles },
  { id: 'journey', label: 'Journey', icon: Milestone },
  { id: 'patterns', label: 'Patterns', icon: Orbit },
  { id: 'ask', label: 'Ask', icon: MessageSquareQuote },
  { id: 'you', label: 'You', icon: User },
];

export const FloatingDock: React.FC<FloatingDockProps> = ({ currentRoute, onRouteChange }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <nav
      aria-label="Application navigation"
      className="fixed bottom-5 inset-x-0 z-50 flex justify-center pointer-events-none px-4"
    >
      <div
        className="pointer-events-auto flex items-center gap-1.5 md:gap-2 px-3.5 py-2.5 rounded-full bg-white/70 dark:bg-slate-900/75 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.5)] transition-all duration-300"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {DOCK_ITEMS.map((item, idx) => {
          const isActive = currentRoute === item.id;
          const Icon = item.icon;

          // macOS dock magnification distance factor
          let scaleClass = 'scale-100';
          if (hoveredIdx !== null) {
            const distance = Math.abs(hoveredIdx - idx);
            if (distance === 0) scaleClass = 'scale-125 -translate-y-1';
            else if (distance === 1) scaleClass = 'scale-110 -translate-y-0.5';
          }

          return (
            <button
              key={item.id}
              onClick={() => onRouteChange(item.id)}
              onMouseEnter={() => setHoveredIdx(idx)}
              className={`group relative flex flex-col items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                isActive
                  ? 'bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-950 shadow-md px-3.5 py-2'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white px-3 py-2'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`flex items-center gap-1.5 transform transition-transform duration-200 ${scaleClass}`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                <span
                  className={`text-xs tracking-tight transition-all duration-200 font-sans-ui ${
                    isActive
                      ? 'font-semibold inline-block'
                      : 'hidden md:inline-block font-medium opacity-80 group-hover:opacity-100'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {/* Active dot indicator under active icon */}
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-violet-400 dark:bg-teal-300 animate-pulse" />
              )}

              {/* Floating label tooltip on hover for mobile/dock */}
              <span className="md:hidden absolute -top-9 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-900 text-stone-100 dark:bg-white dark:text-stone-900 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-sm whitespace-nowrap">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

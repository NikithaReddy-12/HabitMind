import React, { useState, useRef, useEffect } from 'react';
import {
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  Flame,
  Check,
  ChevronDown,
} from 'lucide-react';
import { useTheme, AuroraMode } from '../context/ThemeContext';

interface AuroraHeaderProps {
  streak?: number;
}

const THEME_OPTIONS: { id: AuroraMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'auto', label: 'Auto (Time of Day)', icon: Sparkles },
  { id: 'dawn', label: 'Dawn (Peach & Rose)', icon: Sunrise },
  { id: 'day', label: 'Day (Sky & Mint)', icon: Sun },
  { id: 'dusk', label: 'Dusk (Amber & Violet)', icon: Sunset },
  { id: 'night', label: 'Night (Navy & Teal)', icon: Moon },
];

export const AuroraHeader: React.FC<AuroraHeaderProps> = ({ streak = 0 }) => {
  const { mode, activeAurora, setMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const CurrentIcon =
    activeAurora === 'dawn'
      ? Sunrise
      : activeAurora === 'day'
      ? Sun
      : activeAurora === 'dusk'
      ? Sunset
      : Moon;

  return (
    <header className="w-full max-w-5xl mx-auto px-4 pt-4 sm:pt-6 pb-2 flex items-center justify-between z-30">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500/80 via-teal-400/80 to-amber-300/80 shadow-md">
          <div className="w-3 h-3 rounded-full bg-white dark:bg-stone-950 shadow-inner" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-400 animate-ping opacity-75" />
        </div>
        <div>
          <h1 className="text-2xl font-editorial tracking-tight font-normal text-stone-900 dark:text-stone-50 leading-none">
            Dayline
          </h1>
          <span className="text-[11px] tracking-wide uppercase font-sans-ui text-stone-500 dark:text-stone-400 font-medium">
            Daily Journal & Rhythm
          </span>
        </div>
      </div>

      {/* Right controls: Streak & Aurora theme override */}
      <div className="flex items-center gap-2">
        {streak > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold shadow-sm"
            title={`${streak} day streak`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
            <span>{streak}d</span>
          </div>
        )}

        {/* Aurora palette switcher dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white text-xs font-medium shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            aria-label="Aurora theme mode menu"
            aria-expanded={menuOpen}
          >
            <CurrentIcon className="w-3.5 h-3.5 text-violet-500 dark:text-teal-400" />
            <span className="capitalize hidden sm:inline">{activeAurora}</span>
            <ChevronDown className="w-3 h-3 text-stone-400 transition-transform duration-200" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-stone-200/80 dark:border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Aurora Atmosphere
              </div>
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mode === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setMode(opt.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-violet-500/10 dark:bg-teal-500/15 text-violet-700 dark:text-teal-300 font-semibold'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 opacity-80" />
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

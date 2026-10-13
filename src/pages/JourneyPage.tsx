import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Moon,
  Smile,
  Droplets,
  Activity,
  AlertCircle,
  X,
  Clock,
  Compass,
} from 'lucide-react';
import { HabitLog } from '../types';
import { getLogs } from '../api';
import { MetricChips } from '../components/MetricChips';
import { FooterNote } from '../components/FooterNote';

export const JourneyPage: React.FC = () => {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<HabitLog | null>(null);
  const riverRef = useRef<HTMLDivElement>(null);

  // Month scrubber state
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');

  useEffect(() => {
    const fetchJourney = async () => {
      try {
        setIsLoading(true);
        const data = await getLogs(90); // 90 days river
        // Sort chronologically ascending for horizontal river
        const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
        setLogs(sorted);

        if (sorted.length > 0) {
          const latest = sorted[sorted.length - 1];
          const monthKey = latest.date.slice(0, 7); // "YYYY-MM"
          setSelectedMonthKey(monthKey);
        }
      } catch (e) {
        console.error('Failed to load journey logs', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJourney();
  }, []);

  // Auto-scroll to the latest day on load
  useEffect(() => {
    if (!isLoading && logs.length > 0 && riverRef.current) {
      const el = riverRef.current;
      const timer = setTimeout(() => {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, logs]);

  // Compute available months for the scrubber
  const months = useMemo(() => {
    const monthMap = new Map<string, string>();
    logs.forEach((log) => {
      const key = log.date.slice(0, 7);
      if (!monthMap.has(key)) {
        const d = new Date(log.date + 'T12:00:00');
        const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        monthMap.set(key, label);
      }
    });

    // If empty, add current month
    if (monthMap.size === 0) {
      const now = new Date();
      const key = now.toISOString().slice(0, 7);
      const label = now.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      monthMap.set(key, label);
    }

    return Array.from(monthMap.entries()).map(([key, label]) => ({ key, label }));
  }, [logs]);

  // Scroll to selected month
  const scrollToMonth = (key: string) => {
    setSelectedMonthKey(key);
    const firstEl = document.getElementById(`river-log-${key}`);
    if (firstEl && riverRef.current) {
      firstEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  };

  // Color mapping by mood: normalized as (mood - 1) / 9
  // Low = cool blue, High = warm gold
  const getPebbleStyle = (mood: number | null, sleep: number | null) => {
    // Height: base 160px up to 340px depending on sleep hours (0h to 12h)
    const sleepH = sleep ?? 6;
    const heightPx = Math.min(340, Math.max(160, 160 + (sleepH / 10) * 160));

    // Normalize mood on 1-10 scale: (mood - 1) / 9
    const t = mood !== null ? Math.max(0, Math.min(1, (mood - 1) / 9)) : 0.55;

    if (t >= 0.75) {
      // Warm gold & radiant amber (mood ~ 8-10)
      return {
        height: `${heightPx}px`,
        bg: 'from-amber-400 via-orange-400 to-yellow-300 text-amber-950',
        border: 'border-amber-300/80 shadow-amber-500/30',
        glow: 'shadow-[0_12px_32px_rgba(251,191,36,0.35)]',
        emoji: '✨',
      };
    } else if (t >= 0.55) {
      // Warm peach & golden coral (mood ~ 6-7)
      return {
        height: `${heightPx}px`,
        bg: 'from-amber-300 via-rose-300 to-emerald-300 text-stone-900',
        border: 'border-amber-200/80 shadow-rose-400/25',
        glow: 'shadow-[0_12px_32px_rgba(244,63,94,0.25)]',
        emoji: '☀️',
      };
    } else if (t >= 0.35) {
      // Balanced emerald & teal (mood ~ 4-5)
      return {
        height: `${heightPx}px`,
        bg: 'from-teal-400 via-emerald-400 to-cyan-400 text-teal-950',
        border: 'border-teal-300/80 shadow-teal-500/25',
        glow: 'shadow-[0_12px_32px_rgba(20,184,166,0.25)]',
        emoji: '🌿',
      };
    } else if (t >= 0.15) {
      // Soft violet & celestial indigo (mood ~ 2-3)
      return {
        height: `${heightPx}px`,
        bg: 'from-indigo-400 via-violet-400 to-sky-400 text-violet-950',
        border: 'border-indigo-300/80 shadow-indigo-500/25',
        glow: 'shadow-[0_12px_32px_rgba(99,102,241,0.25)]',
        emoji: '🌤️',
      };
    } else {
      // Cool deep sky blue & ocean (mood ~ 1)
      return {
        height: `${heightPx}px`,
        bg: 'from-sky-500 via-blue-600 to-cyan-500 text-white',
        border: 'border-sky-300/80 shadow-sky-500/30',
        glow: 'shadow-[0_12px_32px_rgba(56,189,248,0.35)]',
        emoji: '🌧️',
      };
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 select-none safe-dock-pb flex flex-col justify-between min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider font-sans-ui">
              <Compass className="w-4 h-4" />
              <span>Living River of Days</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-editorial font-normal tracking-tight text-stone-900 dark:text-stone-50 mt-1">
              Your Journey
            </h2>
            <p className="text-xs sm:text-sm font-sans-ui text-stone-700 dark:text-stone-300 mt-1 font-medium">
              Pebble height represents sleep hours, hue maps to mood, and dot patterns reflect movement.
            </p>
          </div>

          {/* Month Scrubber with Carousel Mask */}
          <div className="carousel-mask overflow-hidden max-w-md">
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-sm overflow-x-auto no-scrollbar px-3">
              {months.map(({ key, label }) => {
                const isSelected = selectedMonthKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => scrollToMonth(key)}
                    className={`px-3 py-1 rounded-full text-xs font-sans-ui transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 font-semibold shadow-sm'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main River Horizon */}
        {isLoading ? (
          <div className="flex items-center justify-center h-72">
            <Sparkles className="w-6 h-6 animate-spin text-stone-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-stone-200/60 dark:border-white/10">
            <p className="text-stone-700 dark:text-stone-200 font-editorial text-xl font-medium">
              No memories logged yet.
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-sans-ui mt-1 font-medium">
              Speak or write your first entry in the Today omnibox.
            </p>
          </div>
        ) : (
          <div className="carousel-mask w-full overflow-hidden">
            <div
              ref={riverRef}
              className="flex items-end gap-3.5 sm:gap-5 overflow-x-auto py-8 px-6 no-scrollbar scroll-smooth min-h-[380px]"
            >
              {logs.map((log) => {
                const dateObj = new Date(log.date + 'T12:00:00');
                const dayOfWeek = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                const dayNum = dateObj.getDate();
                const monthKey = log.date.slice(0, 7);
                const style = getPebbleStyle(log.mood, log.sleepHours);

                // Exercise dots: 1 dot per 10 minutes (up to 5 dots)
                const dotCount = Math.min(5, Math.ceil((log.exerciseMinutes || 0) / 10));

                return (
                  <div
                    key={log.id || log.date}
                    id={`river-log-${monthKey}`}
                    className="flex-shrink-0 flex flex-col items-center group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Vertical Pebble */}
                    <div
                      style={{ height: style.height }}
                      className={`w-14 sm:w-16 rounded-full bg-gradient-to-t ${style.bg} border ${style.border} ${style.glow} flex flex-col items-center justify-between p-3.5 transition-all duration-300 transform-gpu group-hover:-translate-y-2 group-hover:scale-105 active:scale-95`}
                    >
                      {/* Top indicator: Emoji */}
                      <span className="text-base sm:text-lg select-none" title={`Mood: ${log.mood != null ? `${log.mood}/10` : 'Unrated'}`}>
                        {style.emoji}
                      </span>

                      {/* Middle Dot Pattern: Exercise matrix */}
                      <div className="flex flex-col items-center gap-1.5 my-auto">
                        {dotCount > 0 ? (
                          Array.from({ length: dotCount }).map((_, i) => (
                            <span
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm"
                            />
                          ))
                        ) : (
                          <span className="w-1 h-1 rounded-full bg-black/25 dark:bg-white/25" />
                        )}
                      </div>

                      {/* Bottom indicator: Sleep hours */}
                      <div className="text-center">
                        <span className="text-xs font-bold leading-none block">
                          {log.sleepHours ? `${log.sleepHours}h` : '—'}
                        </span>
                        <span className="text-[9px] opacity-85 uppercase tracking-wider block font-sans-ui mt-0.5 font-semibold">
                          sleep
                        </span>
                      </div>
                    </div>

                    {/* Day label below pebble */}
                    <div className="mt-3 text-center">
                      <span className="text-xs font-bold block text-stone-900 dark:text-stone-100">
                        {dayNum}
                      </span>
                      <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-sans-ui block font-semibold">
                        {dayOfWeek}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Required footer disclaimer above dock */}
      <FooterNote />


      {/* Floating Detail Bottom Sheet when pebble tapped */}
      {selectedLog && (
        <div
          role="dialog"
          aria-labelledby="journey-sheet-title"
          className="fixed inset-x-0 bottom-24 z-50 max-w-xl mx-auto px-4 animate-in slide-in-from-bottom-8 duration-300"
        >
          <div className="p-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-stone-200/80 dark:border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.3)] text-stone-900 dark:text-stone-100">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-teal-400 font-sans-ui">
                  Day Reflection
                </span>
                <h3 id="journey-sheet-title" className="text-2xl font-editorial font-bold text-stone-900 dark:text-stone-50 mt-0.5">
                  {new Date(selectedLog.date + 'T12:00:00').toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                aria-label="Close day reflection"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metric Chips */}
            <div className="mt-4">
              <MetricChips
                sleepHours={selectedLog.sleepHours}
                mood={selectedLog.mood}
                waterLiters={selectedLog.waterLiters}
                exerciseMinutes={selectedLog.exerciseMinutes}
                activityType={selectedLog.activityType}
                symptoms={selectedLog.symptoms}
              />
            </div>

            {/* Raw Transcript or Notes */}
            <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-white/10">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 dark:text-stone-500">
                Log Journal
              </span>
              <p className="mt-1.5 text-sm text-stone-700 dark:text-stone-300 italic leading-relaxed font-sans-ui bg-stone-50 dark:bg-white/5 p-3.5 rounded-2xl border border-stone-200/40 dark:border-white/5">
                "{selectedLog.rawText || selectedLog.note}"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

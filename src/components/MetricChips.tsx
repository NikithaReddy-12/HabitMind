import React from 'react';
import { Moon, Smile, Droplets, Activity } from 'lucide-react';

interface MetricChipsProps {
  sleepHours: number | null;
  mood: number | null;
  waterLiters: number | null;
  exerciseMinutes: number | null;
  activityType?: string;
  symptoms?: string[];
  size?: 'sm' | 'md';
}

export const MetricChips: React.FC<MetricChipsProps> = ({
  sleepHours,
  mood,
  waterLiters,
  exerciseMinutes,
  activityType,
  symptoms,
  size = 'md',
}) => {
  const isSm = size === 'sm';
  const chipClass = isSm
    ? 'text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-medium transition-colors'
    : 'text-xs sm:text-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium transition-colors';

  const getMoodConfig = (m: number | null) => {
    if (m === null) {
      return {
        label: 'No mood',
        emoji: '—',
        cls: 'bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/60',
      };
    }
    if (m >= 8) {
      return {
        label: `Mood ${m}/10`,
        emoji: '✨',
        cls: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
      };
    }
    if (m >= 6) {
      return {
        label: `Mood ${m}/10`,
        emoji: '🌿',
        cls: 'bg-teal-500/10 text-teal-700 border border-teal-500/20 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30',
      };
    }
    if (m >= 4) {
      return {
        label: `Mood ${m}/10`,
        emoji: '🌤️',
        cls: 'bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
      };
    }
    return {
      label: `Mood ${m}/10`,
      emoji: '🌧️',
      cls: 'bg-rose-500/10 text-rose-700 border border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    };
  };

  const hasAnyMetric =
    sleepHours !== null ||
    mood !== null ||
    waterLiters !== null ||
    exerciseMinutes !== null ||
    !!activityType;

  if (!hasAnyMetric) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500 italic">
        No specific metrics recorded
      </span>
    );
  }

  const moodConfig = getMoodConfig(mood);

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      {/* Sleep Chip */}
      {sleepHours !== null && (
        <span
          className={`${chipClass} bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30`}
          title="Sleep duration"
        >
          <Moon className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-indigo-500 dark:text-indigo-400`} />
          <span>{sleepHours} hrs</span>
        </span>
      )}

      {/* Mood Chip with Emoji */}
      {mood !== null && (
        <span className={`${chipClass} ${moodConfig.cls}`} title="Mood rating (1-10)">
          <span className="text-xs leading-none">{moodConfig.emoji}</span>
          <Smile className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
          <span>{moodConfig.label}</span>
        </span>
      )}

      {/* Water Chip */}
      {waterLiters !== null && (
        <span
          className={`${chipClass} bg-cyan-500/10 text-cyan-700 border border-cyan-500/20 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30`}
          title="Water hydration"
        >
          <Droplets className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-cyan-500 dark:text-cyan-400`} />
          <span>{waterLiters}L</span>
        </span>
      )}

      {/* Movement Chip */}
      {(exerciseMinutes !== null || activityType) && (
        <span
          className={`${chipClass} bg-violet-500/10 text-violet-700 border border-violet-500/20 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30`}
          title="Physical exercise & movement"
        >
          <Activity className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-violet-500 dark:text-violet-400`} />
          <span>
            {exerciseMinutes !== null ? `${exerciseMinutes}m` : ''}
            {exerciseMinutes !== null && activityType ? ' • ' : ''}
            {activityType || ''}
          </span>
        </span>
      )}

      {/* Symptoms Chips */}
      {symptoms && symptoms.length > 0 && symptoms.map((s, idx) => (
        <span
          key={idx}
          className={`${chipClass} bg-rose-500/10 text-rose-700 border border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30`}
          title="Recorded symptom"
        >
          <span>{s}</span>
        </span>
      ))}
    </div>
  );
};

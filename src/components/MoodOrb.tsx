import React, { useId } from 'react';
import { Moon, Droplets, Activity } from 'lucide-react';
import { DailyGoals } from '../types';

interface MoodOrbProps {
  mood: number | null; // 1 to 10
  sleepHours: number | null;
  waterLiters: number | null;
  exerciseMinutes: number | null;
  goals: DailyGoals;
  isListening: boolean;
  onClickOrb?: () => void;
}

export const MoodOrb: React.FC<MoodOrbProps> = ({
  mood,
  sleepHours,
  waterLiters,
  exerciseMinutes,
  goals,
  isListening,
  onClickOrb,
}) => {
  const filterId = useId();

  // Mood normalized on 1-10 scale: (mood - 1) / 9
  // Low (near 0) cool blue, Mid (near 0.5) balanced violet/teal, High (near 1) warm gold
  const t = mood != null ? Math.max(0, Math.min(1, (mood - 1) / 9)) : 0.55;
  const getOrbGradient = () => {
    if (t < 0.35) {
      return {
        c1: '#38bdf8', // sky-400
        c2: '#2563eb', // blue-600
        c3: '#0ea5e9', // ocean blue
        glow: 'rgba(56, 189, 248, 0.45)',
        label: 'Calm & Reflective',
      };
    } else if (t < 0.7) {
      return {
        c1: '#a78bfa', // violet-400
        c2: '#2dd4bf', // teal-400
        c3: '#818cf8', // indigo-400
        glow: 'rgba(167, 139, 250, 0.45)',
        label: 'Balanced & Steady',
      };
    } else {
      return {
        c1: '#fbbf24', // amber-400
        c2: '#f43f5e', // rose-500
        c3: '#f59e0b', // amber-500
        glow: 'rgba(251, 191, 36, 0.55)',
        label: 'Radiant & Energized',
      };
    }
  };

  const orbTheme = getOrbGradient();

  // Sleep quality to edge turbulence:
  // Less sleep (<6h) = more fragmented, noisy edge
  const effectiveSleep = sleepHours ?? 7;
  const turbulenceBase = effectiveSleep < 5.5 ? 0.04 : effectiveSleep < 7 ? 0.02 : 0.005;
  const displacementScale = effectiveSleep < 5.5 ? 18 : effectiveSleep < 7 ? 9 : 2;

  // Pulse speed and size based on energy (exercise + mood normalized)
  const pulseSpeedSec = Math.max(2.5, 6 - (t * 2.2 + (exerciseMinutes ? exerciseMinutes / 30 : 0.5)));

  // Satellite calculations
  const sleepProgress = Math.min(100, Math.round(((sleepHours ?? 0) / Math.max(1, goals.sleepHours)) * 100));
  const waterProgress = Math.min(100, Math.round(((waterLiters ?? 0) / Math.max(0.5, goals.waterLiters)) * 100));
  const exerciseProgress = Math.min(
    100,
    Math.round(((exerciseMinutes ?? 0) / Math.max(10, goals.exerciseMinutes)) * 100)
  );

  return (
    <div className="relative flex items-center justify-center w-full max-w-sm sm:max-w-md h-[270px] sm:h-[310px] mx-auto select-none">
      {/* SVG Filters for generative organic edge */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id={`orb-turbulence-${filterId}`} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={turbulenceBase}
              numOctaves="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacementScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Ripple waves when microphone is actively listening */}
      {isListening && (
        <>
          <div
            className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-teal-400/50 animate-orb-ripple pointer-events-none"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-violet-400/50 animate-orb-ripple pointer-events-none"
            style={{ animationDelay: '0.7s' }}
          />
        </>
      )}

      {/* Central Generative Mood Orb */}
      <div
        onClick={onClickOrb}
        role="button"
        tabIndex={0}
        aria-label={`Mood Orb: ${orbTheme.label}, mood ${mood != null ? `${mood}/10` : 'unrated'}`}
        className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-full cursor-pointer transition-transform duration-700 ease-out hover:scale-105 active:scale-95 animate-orb-float flex items-center justify-center"
        style={{
          boxShadow: `0 0 65px ${orbTheme.glow}`,
          animationDuration: `${pulseSpeedSec}s`,
        }}
      >
        {/* SVG Rendered Blob with gradient & noise filter */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full overflow-visible transition-all duration-700"
          style={{ filter: `url(#orb-turbulence-${filterId})` }}
        >
          <defs>
            <radialGradient id={`orbGrad-${filterId}`} cx="38%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="25%" stopColor={orbTheme.c1} stopOpacity="0.95" />
              <stop offset="70%" stopColor={orbTheme.c2} stopOpacity="0.95" />
              <stop offset="100%" stopColor={orbTheme.c3} stopOpacity="0.9" />
            </radialGradient>
          </defs>
          <circle cx="100" cy="100" r="92" fill={`url(#orbGrad-${filterId})`} />
        </svg>

        {/* Ambient interior core glow */}
        <div className="absolute inset-5 rounded-full bg-white/20 blur-md pointer-events-none" />

        {/* Center state badge */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-2xl sm:text-3xl font-editorial font-bold text-white drop-shadow-md">
            {mood ? `${mood}/10` : 'Dayline'}
          </span>
          <span className="text-[11px] sm:text-xs font-sans-ui font-medium text-white/90 drop-shadow-sm tracking-wide">
            {isListening ? 'Listening…' : orbTheme.label}
          </span>
        </div>
      </div>

      {/* Orbiting Satellite 1: Sleep (Top-Right, ~45deg) */}
      <div className="absolute -top-1 right-3 sm:right-6 z-20">
        <SatellitePill
          icon={Moon}
          label={`${sleepHours ?? 0}h`}
          goalLabel={`/${goals.sleepHours}h`}
          progress={sleepProgress}
          color="text-indigo-400 dark:text-indigo-300"
          strokeColor="#818cf8"
          tooltip="Sleep target"
        />
      </div>

      {/* Orbiting Satellite 2: Water (Bottom-Left, ~210deg) */}
      <div className="absolute bottom-2 left-2 sm:left-4 z-20">
        <SatellitePill
          icon={Droplets}
          label={`${waterLiters ?? 0}L`}
          goalLabel={`/${goals.waterLiters}L`}
          progress={waterProgress}
          color="text-cyan-500 dark:text-cyan-300"
          strokeColor="#38bdf8"
          tooltip="Hydration target"
        />
      </div>

      {/* Orbiting Satellite 3: Exercise (Bottom-Right, ~330deg) */}
      <div className="absolute bottom-2 right-2 sm:right-4 z-20">
        <SatellitePill
          icon={Activity}
          label={`${exerciseMinutes ?? 0}m`}
          goalLabel={`/${goals.exerciseMinutes}m`}
          progress={exerciseProgress}
          color="text-emerald-500 dark:text-emerald-300"
          strokeColor="#34d399"
          tooltip="Movement target"
        />
      </div>
    </div>
  );
};

interface SatellitePillProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  goalLabel: string;
  progress: number;
  color: string;
  strokeColor: string;
  tooltip: string;
}

const SatellitePill: React.FC<SatellitePillProps> = ({
  icon: Icon,
  label,
  goalLabel,
  progress,
  color,
  strokeColor,
  tooltip,
}) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      title={`${tooltip}: ${progress}% completed`}
      className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all hover:scale-105"
    >
      {/* Mini circular progress indicator */}
      <div className="relative w-8 h-8 flex items-center justify-center">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r={radius}
            className="stroke-stone-200 dark:stroke-white/10"
            strokeWidth="3"
            fill="transparent"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
        </div>
      </div>

      <div className="flex items-baseline gap-0.5 font-sans-ui">
        <span className="text-xs font-bold text-stone-800 dark:text-stone-100">{label}</span>
        <span className="text-[10px] text-stone-400 dark:text-stone-500">{goalLabel}</span>
      </div>
    </div>
  );
};

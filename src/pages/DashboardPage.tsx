import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  Flame,
  Moon,
  Smile,
  Droplets,
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Calendar,
  Grid,
} from 'lucide-react';
import { HabitLog, TimeRange } from '../types';
import { getLogs, computeStreak, computeAverages, getLocalDateString } from '../api';

export const DashboardPage: React.FC = () => {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await getLogs(timeRange);
        setLogs(data);
      } catch (e) {
        console.error('Failed to load logs', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [timeRange]);

  // Streak ending today
  const streak = useMemo(() => computeStreak(logs), [logs]);

  // Real client averages across non-null values for current window
  const averages = useMemo(() => computeAverages(logs), [logs]);

  // Compute week-over-week / period comparison
  const statsComparison = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const half = Math.floor(sorted.length / 2);
    const priorPeriod = sorted.slice(0, half);
    const currentPeriod = sorted.slice(half);

    const avgPrior = computeAverages(priorPeriod);
    const avgCurrent = computeAverages(currentPeriod);

    const calcDelta = (cur: string | number | null, prior: string | number | null) => {
      if (cur === null || prior === null) return null;
      const numCur = typeof cur === 'string' ? parseFloat(cur) : cur;
      const numPrior = typeof prior === 'string' ? parseFloat(prior) : prior;
      if (isNaN(numCur) || isNaN(numPrior) || numPrior === 0) return null;
      const diff = numCur - numPrior;
      const pct = Math.round((diff / numPrior) * 100);
      return { diff: Number(diff.toFixed(1)), pct };
    };

    return {
      sleep: calcDelta(avgCurrent.avgSleep, avgPrior.avgSleep),
      mood: calcDelta(avgCurrent.avgMood, avgPrior.avgMood),
      water: calcDelta(avgCurrent.avgWater, avgPrior.avgWater),
      exercise: calcDelta(avgCurrent.avgExercise, avgPrior.avgExercise),
    };
  }, [logs]);

  // Format chart timeline for Recharts: chronological order (oldest to newest)
  // Maps every day in range, placing null for missing/unrecorded points so Recharts skips them
  const chartData = useMemo(() => {
    const today = new Date();
    const daysList: { name: string; fullDate: string }[] = [];

    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayLabel = d.toLocaleDateString('en-US', {
        weekday: timeRange === 7 ? 'short' : undefined,
        month: timeRange > 7 ? 'numeric' : undefined,
        day: 'numeric',
      });
      daysList.push({ name: dayLabel, fullDate: dateStr });
    }

    const logMap = new Map(logs.map((l) => [l.date, l]));

    return daysList.map((day) => {
      const match = logMap.get(day.fullDate);
      return {
        name: day.name,
        fullDate: day.fullDate,
        sleepHours: match && match.sleepHours !== null && match.sleepHours !== undefined ? match.sleepHours : null,
        mood: match && match.mood !== null && match.mood !== undefined ? match.mood : null,
        waterLiters: match && match.waterLiters !== null && match.waterLiters !== undefined ? match.waterLiters : null,
        exerciseMinutes: match && match.exerciseMinutes !== null && match.exerciseMinutes !== undefined ? match.exerciseMinutes : null,
        hasLog: !!match,
      };
    });
  }, [logs, timeRange]);

  // Scatter plot points: Sleep vs Mood correlation
  const correlationData = useMemo(() => {
    return logs
      .filter((l) => l.sleepHours !== null && l.mood !== null)
      .map((l) => ({
        sleep: l.sleepHours as number,
        mood: l.mood as number,
        date: l.date,
      }));
  }, [logs]);

  // Calculate simple correlation coefficient
  const correlationNote = useMemo(() => {
    if (correlationData.length < 3) return 'Log a few more days to view mood-vs-sleep patterns.';
    const n = correlationData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    correlationData.forEach((p) => {
      sumX += p.sleep;
      sumY += p.mood;
      sumXY += p.sleep * p.mood;
      sumX2 += p.sleep * p.sleep;
      sumY2 += p.mood * p.mood;
    });
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    if (!denominator) return 'Stable patterns observed.';
    const r = numerator / denominator;
    if (r > 0.4) return 'Strong positive correlation: longer sleep directly elevates your mood rating.';
    if (r > 0.1) return 'Mild positive correlation between sleep duration and daily mood.';
    if (r < -0.2) return 'Higher sleep hours show variance against your reported mood.';
    return 'Balanced relationship between sleep hours and daily emotional rating.';
  }, [correlationData]);

  // Consistency calendar heatmap: past 60 days
  const calendarHeatmap = useMemo(() => {
    const today = new Date();
    const days: { date: string; dayOfMonth: number; hasLog: boolean; isToday: boolean }[] = [];
    const logDates = new Set(logs.map((l) => l.date));

    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const str = getLocalDateString(d);
      days.push({
        date: str,
        dayOfMonth: d.getDate(),
        hasLog: logDates.has(str),
        isToday: i === 0,
      });
    }
    return days;
  }, [logs]);

  // Custom tooltips for Recharts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      if (val === null || val === undefined) return null;
      return (
        <div className="bg-slate-900/95 dark:bg-[#0d121f] text-white px-3 py-2 rounded-xl text-xs shadow-xl backdrop-blur-md border border-slate-700/50 dark:border-white/10">
          <p className="font-semibold text-slate-400 mb-0.5">{label}</p>
          <p className="font-bold text-teal-300">
            {val} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderDelta = (delta: { diff: number; pct: number } | null) => {
    if (!delta) return <span className="text-slate-400 dark:text-slate-500 text-xs">--</span>;
    if (delta.diff > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-emerald-500 dark:text-emerald-400 text-xs font-semibold">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>+{delta.pct}%</span>
        </span>
      );
    }
    if (delta.diff < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-rose-500 dark:text-rose-400 text-xs font-semibold">
          <ArrowDownRight className="w-3.5 h-3.5" />
          <span>{delta.pct}%</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-slate-400 dark:text-slate-500 text-xs font-semibold">
        <Minus className="w-3.5 h-3.5" />
        <span>0%</span>
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Header & Segmented 7 / 30 / 90 Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
            <span>Habit Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Wellness Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bento analytics and vector trends across your daily reflections.
          </p>
        </div>

        {/* 7 / 30 / 90 Segmented Control */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-white/[0.06] border border-slate-300/40 dark:border-white/10 self-start sm:self-auto shadow-inner">
          {([7, 30, 90] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === r
                  ? 'bg-white dark:bg-violet-600 text-violet-700 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r} Days
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        // Skeleton loader
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-white/40 dark:bg-[#111628]/40 border border-slate-200/60 dark:border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* BENTO GRID: Big Stat Cards with Sparklines & Deltas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Streak Card */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                  Active Streak
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                  Daily
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {streak}
                </span>
                <span className="text-xs text-slate-400 font-medium">consecutive days</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                {streak > 0 ? 'Ending today — keep going!' : 'Log today to activate streak.'}
              </p>
            </div>

            {/* Avg Sleep Card */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  Avg Sleep
                </span>
                {renderDelta(statsComparison.sleep)}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {averages.avgSleep !== null ? averages.avgSleep : '--'}
                </span>
                <span className="text-xs text-slate-400 font-medium">hours / night</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Across {averages.totalLogs} recorded check-ins
              </p>
            </div>

            {/* Avg Mood Card */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Smile className="w-4 h-4 text-teal-500" />
                  Avg Mood
                </span>
                {renderDelta(statsComparison.mood)}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {averages.avgMood !== null ? averages.avgMood : '--'}
                </span>
                <span className="text-xs text-slate-400 font-medium">out of 10</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Emotional score benchmark
              </p>
            </div>

            {/* Avg Water Card */}
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplets className="w-4 h-4 text-cyan-500" />
                  Avg Hydration
                </span>
                {renderDelta(statsComparison.water)}
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {averages.avgWater !== null ? averages.avgWater : '--'}
                </span>
                <span className="text-xs text-slate-400 font-medium">liters / day</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Target: 2.5L daily hydration
              </p>
            </div>
          </div>

          {/* BENTO ROW 2: Four Smooth Area Charts with Gradient Accents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Sleep Area Chart */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Sleep Duration (Hours)
                    </h3>
                    <span className="text-xs text-slate-400">Nightly rest curve</span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl">
                  {averages.avgSleep || '--'}h avg
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                    <YAxis domain={[0, 12]} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="hrs" />} />
                    <Area
                      type="monotone"
                      dataKey="sleepHours"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#sleepGrad)"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Mood Area Chart */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Smile className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Daily Mood (1-10)
                    </h3>
                    <span className="text-xs text-slate-400">Emotional rating trend</span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-xl">
                  {averages.avgMood || '--'}/10 avg
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="/10" />} />
                    <Area
                      type="monotone"
                      dataKey="mood"
                      stroke="#14b8a6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#moodGrad)"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Water Area Chart */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Water Hydration (Liters)
                    </h3>
                    <span className="text-xs text-slate-400">Daily fluid intake</span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-xl">
                  {averages.avgWater || '--'}L avg
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                    <YAxis domain={[0, 4.5]} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="L" />} />
                    <Area
                      type="monotone"
                      dataKey="waterLiters"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#waterGrad)"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 4. Exercise Area Chart */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Physical Activity (Minutes)
                    </h3>
                    <span className="text-xs text-slate-400">Workout and active movement</span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-xl">
                  {averages.avgExercise || '--'}m avg
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                    <YAxis domain={[0, 90]} tick={{ fontSize: 11, fill: '#888' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip unit="mins" />} />
                    <Area
                      type="monotone"
                      dataKey="exerciseMinutes"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#exGrad)"
                      connectNulls={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* BENTO ROW 3: Mood-vs-Sleep Scatter & Calendar Consistency Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mood vs Sleep Scatter Card */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Mood vs. Sleep Correlation
                    </h3>
                    <span className="text-xs text-slate-400">Hours slept (X) vs. Mood rating (Y)</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 bg-slate-100/70 dark:bg-white/[0.04] p-2.5 rounded-xl border border-slate-200/50 dark:border-white/5">
                {correlationNote}
              </p>

              <div className="h-56 w-full">
                {correlationData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No matching sleep and mood pairs yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        type="number"
                        dataKey="sleep"
                        name="Sleep (hrs)"
                        domain={[4, 11]}
                        tick={{ fontSize: 11, fill: '#888' }}
                        unit="h"
                      />
                      <YAxis
                        type="number"
                        dataKey="mood"
                        name="Mood (1-10)"
                        domain={[1, 10]}
                        tick={{ fontSize: 11, fill: '#888' }}
                      />
                      <ZAxis range={[60, 60]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(val: any) => [val, 'Value']}
                      />
                      <Scatter
                        name="Day Log"
                        data={correlationData}
                        fill="#8b5cf6"
                        shape="circle"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Calendar Consistency Heatmap (Past 60 Days) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                    <Grid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Logging Consistency Heatmap
                    </h3>
                    <span className="text-xs text-slate-400">Check-in rhythm across past 60 days</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                  {logs.length} logged
                </span>
              </div>

              <div className="mt-4">
                <div className="grid grid-cols-10 gap-2">
                  {calendarHeatmap.map((item, idx) => (
                    <div
                      key={idx}
                      title={`${item.date}: ${item.hasLog ? 'Logged' : 'No entry'}`}
                      className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-mono transition-transform hover:scale-110 cursor-pointer ${
                        item.hasLog
                          ? 'bg-gradient-to-tr from-violet-600 to-teal-400 text-white font-bold shadow-xs'
                          : 'bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-600'
                      } ${item.isToday ? 'ring-2 ring-violet-500' : ''}`}
                    >
                      {item.dayOfMonth}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 text-[11px] text-slate-400">
                  <span>60 days ago</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-white/[0.05]" /> Missed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-tr from-violet-600 to-teal-400" /> Logged
                    </span>
                  </div>
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

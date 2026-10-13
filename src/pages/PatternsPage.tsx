import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Orbit,
  Sparkles,
  Flame,
  Moon,
  Smile,
  Droplets,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  TrendingUp,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  ComposedChart,
} from 'recharts';
import { HabitLog, WeeklyInsight, InsightItem } from '../types';
import { getLogs, getInsights } from '../api';
import { FooterNote } from '../components/FooterNote';


export const PatternsPage: React.FC = () => {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Insights state
  const [insightsData, setInsightsData] = useState<WeeklyInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [selectedStar, setSelectedStar] = useState<HabitLog | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getLogs(90);
        setLogs(data);
      } catch (err) {
        console.error('Failed to load logs for patterns', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch AI Insights
  const handleFetchInsights = async () => {
    try {
      setLoadingInsights(true);
      const res = await getInsights();
      setInsightsData(res);
    } catch (e) {
      console.error('Failed to load insights', e);
    } finally {
      setLoadingInsights(false);
    }
  };

  // 1. CONSTELLATION GENERATION
  const constellationData = useMemo(() => {
    if (!logs.length) return { stars: [], lines: [], longestStreak: 0 };

    // Sort chronologically ascending
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const stars: Array<{
      log: HabitLog;
      x: number;
      y: number;
      radius: number;
      color: string;
      streakIndex: number;
    }> = [];

    const width = 800;
    const height = 300;
    const paddingX = 48;
    const paddingY = 48;

    const minTime = new Date(sorted[0].date + 'T12:00:00').getTime();
    const maxTime = new Date(sorted[sorted.length - 1].date + 'T12:00:00').getTime();
    const timeSpan = maxTime - minTime;

    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;
    let currentStreakId = 0;

    const streakGroups: number[][] = [];
    let currentGroup: number[] = [];

    sorted.forEach((log, idx) => {
      const d = new Date(log.date + 'T12:00:00');
      if (prevDate) {
        const diffDays = Math.round((d.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
          currentGroup.push(idx);
        } else {
          if (currentGroup.length > 0) streakGroups.push([...currentGroup]);
          currentGroup = [idx];
          currentStreak = 1;
          currentStreakId++;
        }
      } else {
        currentStreak = 1;
        currentGroup = [idx];
      }
      prevDate = d;
      longestStreak = Math.max(longestStreak, currentStreak);

      // Star positioning:
      // Spread across the full panel width by date
      const tTime =
        timeSpan > 0
          ? (d.getTime() - minTime) / timeSpan
          : sorted.length > 1
          ? idx / (sorted.length - 1)
          : 0.5;
      const x = paddingX + tTime * (width - 2 * paddingX);

      // Y based on mood normalized as (mood - 1) / 9
      // High mood = high in sky (low y value)
      const moodVal = log.mood ?? 6;
      const normMood = Math.max(0, Math.min(1, (moodVal - 1) / 9));
      const yRatio = 1 - normMood;
      const y = paddingY + yRatio * (height - 2 * paddingY);

      // Radius based on energy / exercise
      const exerciseM = log.exerciseMinutes ?? 15;
      const radius = Math.min(7.5, Math.max(4, 3.5 + (exerciseM / 60) * 3));

      // Color normalized as (mood - 1) / 9: low = cool blue, high = warm gold
      let color = '#38bdf8'; // cool blue
      if (normMood >= 0.75) color = '#fbbf24'; // warm gold (8-10)
      else if (normMood >= 0.55) color = '#f59e0b'; // amber-peach (6-7)
      else if (normMood >= 0.35) color = '#2dd4bf'; // teal (4-5)
      else if (normMood >= 0.15) color = '#818cf8'; // indigo (2-3)
      else color = '#38bdf8'; // cool blue (1)

      stars.push({ log, x, y, radius, color, streakIndex: currentStreakId });
    });

    if (currentGroup.length > 0) streakGroups.push(currentGroup);

    // Build line segments between consecutive days
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    streakGroups.forEach((group) => {
      for (let i = 0; i < group.length - 1; i++) {
        const s1 = stars[group[i]];
        const s2 = stars[group[i + 1]];
        if (s1 && s2) {
          lines.push({ x1: s1.x, y1: s1.y, x2: s2.x, y2: s2.y });
        }
      }
    });

    return { stars, lines, longestStreak };
  }, [logs]);

  // 2. YEAR IN PIXELS: 53 weeks columns, 7 weekdays rows
  const pixelWeeks = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const logMap = new Map(logs.map((l) => [l.date, l.mood]));

    // Align start to Sunday 52 weeks ago
    const startSunday = new Date(today);
    startSunday.setDate(today.getDate() - today.getDay() - 52 * 7);

    const weeks: Array<Array<{ date: string; mood: number | null; isFuture: boolean }>> = [];

    for (let w = 0; w < 53; w++) {
      const weekDays: Array<{ date: string; mood: number | null; isFuture: boolean }> = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startSunday);
        cellDate.setDate(startSunday.getDate() + w * 7 + d);
        const dStr = cellDate.toISOString().split('T')[0];
        const isFuture = cellDate > today;
        weekDays.push({
          date: dStr,
          mood: logMap.get(dStr) ?? null,
          isFuture,
        });
      }
      weeks.push(weekDays);
    }
    return weeks;
  }, [logs]);

  const pixelsScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the most recent week on mount
  useEffect(() => {
    if (pixelsScrollRef.current) {
      const el = pixelsScrollRef.current;
      setTimeout(() => {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      }, 100);
    }
  }, [pixelWeeks]);


  // 3. SLEEP VS MOOD SCATTER & TREND READING
  const scatterPoints = useMemo(() => {
    return logs
      .filter((l) => l.sleepHours != null && l.mood != null)
      .map((l) => ({
        sleep: l.sleepHours as number,
        mood: l.mood as number,
        date: l.date,
      }));
  }, [logs]);

  const sleepMoodInsight = useMemo(() => {
    if (scatterPoints.length < 3) {
      return 'Log at least 3 days with both sleep and mood to uncover your personal sleep-mood curve.';
    }
    // Calculate simple Pearson correlation
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = scatterPoints.length;
    scatterPoints.forEach((p) => {
      sumX += p.sleep;
      sumY += p.mood;
      sumXY += p.sleep * p.mood;
      sumX2 += p.sleep * p.sleep;
    });

    const avgSleep = sumX / n;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);

    if (slope > 0.15) {
      return `Strong positive link: each extra hour of sleep lifts your mood by ~${(slope * 10).toFixed(0)}%. You feel noticeably better on 7.5h+ rest.`;
    } else if (slope < -0.1) {
      return `Oversleeping may lead to lethargy for you. Your optimal rhythm appears to hover near ${avgSleep.toFixed(1)}h.`;
    } else {
      return `Balanced rest: your mood stays stable around ${avgSleep.toFixed(1)}h of nightly sleep.`;
    }
  }, [scatterPoints]);

  // 4. WEEK-OVER-WEEK DELTAS
  const weeklyDeltas = useMemo(() => {
    const now = new Date();
    const d7 = new Date();
    d7.setDate(now.getDate() - 7);
    const d14 = new Date();
    d14.setDate(now.getDate() - 14);

    const thisWeek = logs.filter((l) => new Date(l.date) >= d7);
    const lastWeek = logs.filter((l) => {
      const d = new Date(l.date);
      return d >= d14 && d < d7;
    });

    const avg = (arr: HabitLog[], field: keyof HabitLog) => {
      const vals = arr.map((l) => l[field] as number).filter((v) => typeof v === 'number');
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const delta = (curr: number | null, prev: number | null) => {
      if (curr == null || prev == null || prev === 0) return null;
      return Math.round(((curr - prev) / prev) * 100);
    };

    return {
      sleep: { val: avg(thisWeek, 'sleepHours'), delta: delta(avg(thisWeek, 'sleepHours'), avg(lastWeek, 'sleepHours')) },
      mood: { val: avg(thisWeek, 'mood'), delta: delta(avg(thisWeek, 'mood'), avg(lastWeek, 'mood')) },
      water: { val: avg(thisWeek, 'waterLiters'), delta: delta(avg(thisWeek, 'waterLiters'), avg(lastWeek, 'waterLiters')) },
      exercise: { val: avg(thisWeek, 'exerciseMinutes'), delta: delta(avg(thisWeek, 'exerciseMinutes'), avg(lastWeek, 'exerciseMinutes')) },
    };
  }, [logs]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 sm:py-6 safe-dock-pb flex flex-col justify-between min-h-[calc(100vh-140px)] select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-violet-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider font-sans-ui">
            <Orbit className="w-4 h-4" />
            <span>Living Rhythm & Science</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-editorial font-normal tracking-tight text-stone-900 dark:text-stone-50 mt-1">
            Patterns
          </h2>
          <p className="text-xs sm:text-sm font-sans-ui text-stone-600 dark:text-stone-300 mt-1">
            Constellations of consistency, year in pixels, and sleep-mood correlations.
          </p>
        </div>

        {/* Generate Insights Button */}
        <button
          onClick={handleFetchInsights}
          disabled={loadingInsights}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white dark:from-teal-500 dark:to-cyan-600 dark:text-slate-950 font-sans-ui font-semibold text-xs shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {loadingInsights ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>{loadingInsights ? 'Analyzing Memory…' : 'Synthesize AI Insights'}</span>
        </button>
      </div>

      {/* Week-over-Week Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <DeltaPill
          icon={Moon}
          label="Sleep"
          value={weeklyDeltas.sleep.val ? `${weeklyDeltas.sleep.val.toFixed(1)}h` : '—'}
          delta={weeklyDeltas.sleep.delta}
          color="text-indigo-500"
        />
        <DeltaPill
          icon={Smile}
          label="Mood"
          value={weeklyDeltas.mood.val ? `${weeklyDeltas.mood.val.toFixed(1)}/10` : '—'}
          delta={weeklyDeltas.mood.delta}
          color="text-amber-500"
        />
        <DeltaPill
          icon={Droplets}
          label="Water"
          value={weeklyDeltas.water.val ? `${weeklyDeltas.water.val.toFixed(1)}L` : '—'}
          delta={weeklyDeltas.water.delta}
          color="text-cyan-500"
        />
        <DeltaPill
          icon={Activity}
          label="Exercise"
          value={weeklyDeltas.exercise.val ? `${Math.round(weeklyDeltas.exercise.val)}m` : '—'}
          delta={weeklyDeltas.exercise.delta}
          color="text-emerald-500"
        />
      </div>

      {/* 1. Constellation Sky Panel */}
      <div className="p-6 rounded-3xl bg-slate-950/90 text-stone-100 border border-white/10 shadow-2xl relative overflow-hidden mb-8">
        <div className="flex items-center justify-between mb-2 z-10 relative">
          <div>
            <h3 className="text-xl font-editorial font-bold text-white flex items-center gap-2">
              <span>Constellation</span>
              <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
            </h3>
            <p className="text-xs text-stone-300 font-sans-ui">
              Each star is a logged day. Lines connect consecutive days into luminous constellations.
            </p>
          </div>
          {constellationData.longestStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Longest constellation: {constellationData.longestStreak} days</span>
            </div>
          )}
        </div>

        {/* Ambient celestial background particles */}
        <div className="absolute inset-0 bg-radial-gradient from-violet-950/30 via-transparent to-transparent pointer-events-none" />

        {/* Constellation SVG Canvas */}
        <div className="w-full overflow-x-auto no-scrollbar py-2">
          <svg
            viewBox="0 0 800 300"
            className="w-full min-w-[600px] h-[260px] overflow-visible"
          >
            {/* Constellation connective lines */}
            {constellationData.lines.map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(167, 139, 250, 0.6)"
                strokeWidth="1.8"
                strokeDasharray="4 3"
              />
            ))}

            {/* Stars for every logged day */}
            {constellationData.stars.map((star, i) => {
              const isSelected = selectedStar?.date === star.log.date;
              return (
                <g
                  key={i}
                  className="cursor-pointer group"
                  onClick={() => setSelectedStar(star.log)}
                >
                  {/* Outer pulse aura */}
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={star.radius + 5}
                    fill={star.color}
                    opacity={isSelected ? 0.5 : 0.2}
                    className="transition-all group-hover:opacity-70"
                  />
                  {/* Star core */}
                  <circle
                    cx={star.x}
                    cy={star.y}
                    r={star.radius}
                    fill={star.color}
                    className="transition-transform group-hover:scale-125"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected star preview tooltip */}
        {selectedStar && (
          <div className="mt-3 p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-between text-xs font-sans-ui animate-in fade-in">
            <span className="font-semibold text-white">
              {new Date(selectedStar.date + 'T12:00:00').toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
              : Mood {selectedStar.mood ?? '—'}/10, Sleep {selectedStar.sleepHours ?? '—'}h
            </span>
            <span className="text-stone-300 italic truncate max-w-xs">
              "{selectedStar.rawText || selectedStar.note}"
            </span>
          </div>
        )}
      </div>

      {/* 2. Year in Pixels & 3. Sleep vs Mood (Side-by-side on desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Year in Pixels: Weeks as columns, weekdays as rows */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-editorial font-bold text-stone-900 dark:text-stone-50">
                  Year in Pixels
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 font-sans-ui font-medium">
                  Last 365 days of mood vibrancy (weeks as columns, weekdays as rows).
                </p>
              </div>
              {/* Color Legend */}
              <div className="flex items-center gap-1 text-[10px] text-stone-600 dark:text-stone-300 font-sans-ui font-medium">
                <span>Low</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" title="Cool blue (1-3)" />
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400" title="Indigo (3-4)" />
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-400" title="Teal (5-7)" />
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" title="Warm gold (8-10)" />
                <span>High</span>
              </div>
            </div>

            {/* Horizontal scrollable pixel grid with weekday row labels */}
            <div
              ref={pixelsScrollRef}
              className="w-full overflow-x-auto overflow-y-hidden py-2 px-1 no-scrollbar scroll-smooth border border-stone-200/50 dark:border-white/5 rounded-2xl bg-stone-50/50 dark:bg-white/5"
            >
              <div className="flex items-start gap-1 min-w-max">
                {/* Weekday indicator column */}
                <div className="flex flex-col gap-1 pr-1 text-[9px] font-sans-ui font-semibold text-stone-500 dark:text-stone-400 select-none">
                  <span className="h-3 w-3 flex items-center justify-center">S</span>
                  <span className="h-3 w-3 flex items-center justify-center">M</span>
                  <span className="h-3 w-3 flex items-center justify-center">T</span>
                  <span className="h-3 w-3 flex items-center justify-center">W</span>
                  <span className="h-3 w-3 flex items-center justify-center">T</span>
                  <span className="h-3 w-3 flex items-center justify-center">F</span>
                  <span className="h-3 w-3 flex items-center justify-center">S</span>
                </div>

                {/* Week columns */}
                {pixelWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-1 flex-shrink-0">
                    {week.map((cell) => {
                      if (cell.isFuture) {
                        return (
                          <div
                            key={cell.date}
                            className="w-3 h-3 rounded-[2.5px] opacity-0 pointer-events-none"
                          />
                        );
                      }
                      // Color cell by normalized mood: (mood - 1) / 9
                      let colorClass = 'bg-stone-200/70 dark:bg-white/10';
                      if (cell.mood != null) {
                        const t = Math.max(0, Math.min(1, (cell.mood - 1) / 9));
                        if (t >= 0.75) colorClass = 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]';
                        else if (t >= 0.55) colorClass = 'bg-amber-300 shadow-[0_0_5px_rgba(252,211,77,0.5)]';
                        else if (t >= 0.35) colorClass = 'bg-teal-400 shadow-[0_0_5px_rgba(45,212,191,0.5)]';
                        else if (t >= 0.15) colorClass = 'bg-indigo-400 shadow-[0_0_5px_rgba(129,140,248,0.5)]';
                        else colorClass = 'bg-sky-400 shadow-[0_0_5px_rgba(56,189,248,0.5)]';
                      }

                      return (
                        <div
                          key={cell.date}
                          title={`${cell.date}: ${cell.mood != null ? `Mood ${cell.mood}/10` : 'No log'}`}
                          className={`w-3 h-3 rounded-[2.5px] transition-all hover:scale-150 cursor-pointer ${colorClass}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-2 font-sans-ui font-medium">
            Scroll horizontally to explore earlier weeks. Hover any pixel for date and mood.
          </p>
        </div>

        {/* Sleep vs Mood Scatter & Plain-Language Reading */}
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-editorial font-bold text-stone-900 dark:text-stone-50">
                Sleep vs Mood
              </h3>
              <span className="text-xs text-stone-600 dark:text-stone-400 font-sans-ui font-medium">
                {scatterPoints.length} {scatterPoints.length === 1 ? 'Data Point' : 'Data Points'}
              </span>
            </div>
            <p className="text-xs text-violet-700 dark:text-teal-300 font-sans-ui font-semibold bg-violet-50 dark:bg-teal-950/40 p-2.5 rounded-2xl border border-violet-100 dark:border-teal-900/50 mb-3">
              "{sleepMoodInsight}"
            </p>
          </div>

          <div className="h-44 w-full">
            {scatterPoints.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    type="number"
                    dataKey="sleep"
                    name="Sleep"
                    unit="h"
                    domain={[3, 11]}
                    tick={{ fontSize: 10, fill: '#888' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="mood"
                    name="Mood"
                    domain={[1, 10]}
                    ticks={[2, 4, 6, 8, 10]}
                    tick={{ fontSize: 10, fill: '#888' }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="p-2 rounded-xl bg-stone-900 text-white text-[11px] font-sans-ui shadow-lg">
                          <div>Date: {d.date}</div>
                          <div>Sleep: {d.sleep}h</div>
                          <div>Mood: {d.mood}/10</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter name="Days" data={scatterPoints} fill="#8b5cf6" />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-stone-500 font-medium font-sans-ui">
                Log a few days to view sleep-mood correlation
              </div>
            )}
          </div>
        </div>
      </div>


      {/* AI Synthesized Insights Cards */}
      {insightsData && (
        <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-lg animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-violet-600 dark:text-teal-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider font-sans-ui">
              Lyzr Health Synthesizer
            </span>
          </div>

          <p className="text-sm font-sans-ui text-stone-700 dark:text-stone-300 italic mb-5 leading-relaxed">
            "{insightsData.summary}"
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {insightsData.insights.map((item: InsightItem, idx: number) => {
              const Icon =
                item.type === 'positive'
                  ? CheckCircle2
                  : item.type === 'warning'
                  ? AlertTriangle
                  : Info;
              const color =
                item.type === 'positive'
                  ? 'text-emerald-500 bg-emerald-500/10'
                  : item.type === 'warning'
                  ? 'text-amber-500 bg-amber-500/10'
                  : 'text-violet-500 bg-violet-500/10';

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white/60 dark:bg-white/5 border border-stone-200/40 dark:border-white/5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`p-1.5 rounded-full ${color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 font-sans-ui">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300 font-sans-ui leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Required footer disclaimer above dock */}
      <FooterNote />
    </div>
  );
};



interface DeltaPillProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  delta: number | null;
  color: string;
}

const DeltaPill: React.FC<DeltaPillProps> = ({ icon: Icon, label, value, delta, color }) => {
  return (
    <div className="p-4 rounded-3xl bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-sm flex items-center justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-sans-ui font-medium">
          <Icon className={`w-3.5 h-3.5 ${color}`} />
          <span>{label}</span>
        </div>
        <div className="text-2xl font-editorial font-bold text-stone-900 dark:text-stone-50 mt-1">
          {value}
        </div>
      </div>

      {delta != null && (
        <div
          className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            delta > 0
              ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/50'
              : delta < 0
              ? 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-950/50'
              : 'text-stone-600 bg-stone-100 dark:text-stone-400 dark:bg-stone-800'
          }`}
        >
          {delta > 0 ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : delta < 0 ? (
            <ArrowDownRight className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          <span>{Math.abs(delta)}%</span>
        </div>
      )}
    </div>
  );
};

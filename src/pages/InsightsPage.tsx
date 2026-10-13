import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Moon,
  Smile,
  Droplets,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { WeeklyInsight, MetricChange } from '../types';
import { getInsights } from '../api';

export const InsightsPage: React.FC = () => {
  const [insight, setInsight] = useState<WeeklyInsight | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await getInsights();
      setInsight(data);
    } catch (e: any) {
      console.error('Failed to generate insights', e);
      setError(e?.message || 'Could not load insights. Please check connection and logs.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const renderChangeBadge = (metric: MetricChange) => {
    if (metric.thisWeek === null && metric.lastWeek === null) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
          <Minus className="w-3 h-3" />
          <span>No logs</span>
        </span>
      );
    }

    if (metric.lastWeek === null || metric.percentChange === null) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
          <span>Baseline week</span>
        </span>
      );
    }

    const isUp = metric.percentChange > 0;
    const isDown = metric.percentChange < 0;

    if (metric.percentChange === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
          <Minus className="w-3 h-3" />
          <span>0%</span>
        </span>
      );
    }

    if (isUp) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>+{metric.percentChange}%</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
        <ArrowDownRight className="w-3.5 h-3.5" />
        <span>{metric.percentChange}%</span>
      </span>
    );
  };

  const getInsightTypeConfig = (type: 'positive' | 'warning' | 'neutral') => {
    switch (type) {
      case 'positive':
        return {
          icon: CheckCircle2,
          containerBg: 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/30',
          iconColor: 'text-emerald-500',
          badgeText: 'Positive Trend',
          badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          containerBg: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 hover:border-amber-500/30',
          iconColor: 'text-amber-500',
          badgeText: 'Needs Attention',
          badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        };
      case 'neutral':
      default:
        return {
          icon: Info,
          containerBg: 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/30',
          iconColor: 'text-indigo-500',
          badgeText: 'Observation',
          badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        };
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header and Shimmer Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span>AI Pattern Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Weekly Insights
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Multivariate patterns between rest, mood, hydration, and movement.
          </p>
        </div>

        {/* Generate Insights Button with Shimmer State */}
        <button
          onClick={fetchInsights}
          disabled={isGenerating}
          className={`relative overflow-hidden px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
            isGenerating
              ? 'bg-violet-700 text-white cursor-wait'
              : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white shadow-violet-500/25 active:scale-98'
          }`}
        >
          {/* Shimmer sweep effect */}
          {isGenerating && (
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
          )}

          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Synthesizing...' : 'Generate Insights'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Week-over-Week Metric Badge Row */}
      {insight?.stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sleep */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                Sleep
              </span>
              {renderChangeBadge(insight.stats.sleep)}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {insight.stats.sleep.thisWeek !== null ? `${insight.stats.sleep.thisWeek}h` : '--'}
            </div>
            <span className="text-[10px] text-slate-400">vs {insight.stats.sleep.lastWeek || '--'}h prior</span>
          </div>

          {/* Mood */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-teal-500" />
                Mood
              </span>
              {renderChangeBadge(insight.stats.mood)}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {insight.stats.mood.thisWeek !== null ? `${insight.stats.mood.thisWeek}/10` : '--'}
            </div>
            <span className="text-[10px] text-slate-400">vs {insight.stats.mood.lastWeek || '--'} prior</span>
          </div>

          {/* Water */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                Water
              </span>
              {renderChangeBadge(insight.stats.water)}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {insight.stats.water.thisWeek !== null ? `${insight.stats.water.thisWeek}L` : '--'}
            </div>
            <span className="text-[10px] text-slate-400">vs {insight.stats.water.lastWeek || '--'}L prior</span>
          </div>

          {/* Exercise */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-violet-500" />
                Movement
              </span>
              {renderChangeBadge(insight.stats.exercise)}
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {insight.stats.exercise.thisWeek !== null ? `${insight.stats.exercise.thisWeek}m` : '--'}
            </div>
            <span className="text-[10px] text-slate-400">vs {insight.stats.exercise.lastWeek || '--'}m prior</span>
          </div>
        </div>
      )}

      {/* Synthesis Executive Summary */}
      {insight && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-500/10 via-indigo-500/10 to-teal-500/5 dark:from-violet-500/15 dark:to-teal-500/10 border border-violet-500/20 dark:border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-violet-800 dark:text-violet-200">
              Bi-Weekly Health Synthesis
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            "{insight.summary}"
          </p>
        </div>
      )}

      {/* Shimmer / Skeleton Loading State */}
      {isGenerating && !insight && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-white/40 dark:bg-[#111628]/40 border border-slate-200/60 dark:border-white/5 animate-pulse space-y-3"
            >
              <div className="w-32 h-4 bg-slate-200 dark:bg-white/10 rounded-md" />
              <div className="w-full h-10 bg-slate-200 dark:bg-white/10 rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Insights Cards List */}
      {insight?.insights && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
            Detected Lifestyle Correlations ({insight.insights.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insight.insights.map((item, idx) => {
              const config = getInsightTypeConfig(item.type);
              const Icon = config.icon;

              return (
                <div
                  key={idx}
                  className={`p-6 rounded-3xl border transition-all duration-200 hover:-translate-y-0.5 shadow-xs ${config.containerBg}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${config.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                    >
                      {config.badgeText}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isGenerating && !insight && !error && (
        <div className="p-12 text-center rounded-3xl bg-white/60 dark:bg-[#111628]/60 border border-dashed border-slate-300 dark:border-white/10 text-slate-500">
          <Sparkles className="w-8 h-8 text-violet-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
            Ready to generate patterns
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Dayline evaluates sleep, mood, hydration, and exercise trends over the last 14 days.
          </p>
          <button
            onClick={fetchInsights}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Run Pattern Analysis
          </button>
        </div>
      )}
    </div>
  );
};

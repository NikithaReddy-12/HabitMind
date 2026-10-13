import React, { useState, useEffect } from 'react';
import {
  User,
  Copy,
  Check,
  Download,
  Target,
  Sparkles,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  ExternalLink,
  ShieldCheck,
  Save,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { useTheme, AuroraMode } from '../context/ThemeContext';
import { DailyGoals } from '../types';
import { getDailyGoals, saveDailyGoals } from '../utils/goals';
import { getLogs } from '../api';
import { FooterNote } from '../components/FooterNote';


const AURORA_THEMES: {
  id: AuroraMode;
  name: string;
  palette: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'auto', name: 'Auto (Living Rhythm)', palette: 'Syncs with real world sunrise & sunset', icon: Sparkles },
  { id: 'dawn', name: 'Dawn', palette: 'Peach & Rose tones', icon: Sunrise },
  { id: 'day', name: 'Day', palette: 'Sky & Fresh Mint breezes', icon: Sun },
  { id: 'dusk', name: 'Dusk', palette: 'Warm Amber & Twilight Violet', icon: Sunset },
  { id: 'night', name: 'Night', palette: 'Deep Ocean Navy & Celestial Teal', icon: Moon },
];

export const YouPage: React.FC = () => {
  const { mode, activeAurora, setMode } = useTheme();

  // Daily goals state
  const [goals, setGoals] = useState<DailyGoals>(getDailyGoals);
  const [goalsSaved, setGoalsSaved] = useState(false);

  // Omi webhook state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/omi-webhook`);
    }
  }, []);

  const handleGoalChange = (field: keyof DailyGoals, value: number) => {
    setGoals((prev) => ({ ...prev, [field]: value }));
    setGoalsSaved(false);
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    saveDailyGoals(goals);
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 3000);
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const logs = await getLogs(365);
      if (logs.length === 0) {
        alert('No logs available to export yet.');
        return;
      }

      const headers = [
        'date',
        'sleep_hours',
        'mood',
        'water_liters',
        'exercise_minutes',
        'activity_type',
        'symptoms',
        'raw_text',
      ];

      const rows = logs.map((log) => [
        `"${log.date}"`,
        log.sleepHours ?? '',
        log.mood ?? '',
        log.waterLiters ?? '',
        log.exerciseMinutes ?? '',
        `"${(log.activityType || '').replace(/"/g, '""')}"`,
        `"${(log.symptoms || []).join('; ')}"`,
        `"${(log.rawText || log.note || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `dayline_wellness_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 sm:py-6 safe-dock-pb select-none flex flex-col justify-between min-h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-violet-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider font-sans-ui">
          <User className="w-4 h-4" />
          <span>Personal Settings</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-editorial font-normal tracking-tight text-stone-900 dark:text-stone-50 mt-1">
          You & Rhythm
        </h2>
        <p className="text-xs sm:text-sm font-sans-ui text-stone-600 dark:text-stone-300 mt-1">
          Manage your targets, Aurora atmosphere, hardware integrations, and export.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Daily Goals */}
        <section className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-teal-400">
                <Target className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-editorial font-bold text-stone-900 dark:text-stone-50">
                  Daily Targets
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-sans-ui">
                  These anchor your Mood Orb's orbiting satellites.
                </p>
              </div>
            </div>

            {goalsSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-sans-ui animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>

          <form onSubmit={handleSaveGoals} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Sleep Target */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-stone-200/40 dark:border-white/5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 font-sans-ui mb-1">
                  Sleep Target
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="3"
                    max="16"
                    value={goals.sleepHours}
                    onChange={(e) => handleGoalChange('sleepHours', parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-100 dark:bg-white/10 px-3 py-1.5 rounded-xl text-stone-900 dark:text-stone-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-400 font-sans-ui"
                  />
                  <span className="text-xs text-stone-500 font-sans-ui font-medium">hours</span>
                </div>
              </div>

              {/* Water Target */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-stone-200/40 dark:border-white/5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 font-sans-ui mb-1">
                  Water Target
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.2"
                    min="0.5"
                    max="10"
                    value={goals.waterLiters}
                    onChange={(e) => handleGoalChange('waterLiters', parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-100 dark:bg-white/10 px-3 py-1.5 rounded-xl text-stone-900 dark:text-stone-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-400 font-sans-ui"
                  />
                  <span className="text-xs text-stone-500 font-sans-ui font-medium">liters</span>
                </div>
              </div>

              {/* Exercise Target */}
              <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-white/5 border border-stone-200/40 dark:border-white/5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 font-sans-ui mb-1">
                  Movement Target
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="5"
                    min="5"
                    max="240"
                    value={goals.exerciseMinutes}
                    onChange={(e) => handleGoalChange('exerciseMinutes', parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-stone-100 dark:bg-white/10 px-3 py-1.5 rounded-xl text-stone-900 dark:text-stone-100 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-400 font-sans-ui"
                  />
                  <span className="text-xs text-stone-500 font-sans-ui font-medium">mins</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-900 text-xs font-semibold font-sans-ui hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Targets</span>
            </button>
          </form>
        </section>

        {/* Section 2: Aurora Atmosphere Mode */}
        <section className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="p-2 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-editorial font-bold text-stone-900 dark:text-stone-50">
                Aurora Atmosphere
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans-ui">
                Living gradient mesh reacting to time of day or your choice.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {AURORA_THEMES.map((theme) => {
              const Icon = theme.icon;
              const isSelected = mode === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setMode(theme.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl text-left transition-all ${
                    isSelected
                      ? 'bg-violet-500/15 dark:bg-teal-500/15 border-2 border-violet-500/60 dark:border-teal-400 shadow-sm'
                      : 'bg-white/50 dark:bg-white/5 border border-stone-200/40 dark:border-white/5 hover:bg-stone-100 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="p-2 rounded-xl bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900 dark:text-stone-100 font-sans-ui">
                        {theme.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-violet-600 dark:text-teal-400">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5 font-sans-ui">
                      {theme.palette}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Omi Wearable Integration */}
        <section className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-2 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Radio className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-editorial font-bold text-stone-900 dark:text-stone-50">
                Omi Wearable Integration
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans-ui">
                Send live conversation transcripts from your Omi necklace directly into Dayline memory.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-100/80 dark:bg-white/5 border border-stone-200/60 dark:border-white/5 flex items-center justify-between gap-2 mb-4">
            <code className="text-xs font-mono text-stone-800 dark:text-stone-200 truncate select-all">
              {webhookUrl || 'Loading webhook endpoint…'}
            </code>
            <button
              onClick={copyWebhook}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-900 text-stone-100 dark:bg-white dark:text-stone-900 text-xs font-semibold font-sans-ui hover:scale-105 transition-all shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1.5 font-sans-ui bg-stone-50 dark:bg-white/5 p-4 rounded-2xl">
            <div className="font-semibold text-stone-800 dark:text-stone-200 mb-1">
              Quick Setup Steps in the Omi App:
            </div>
            <p>1. Open the Omi companion app on iOS or Android.</p>
            <p>2. Tap your profile icon &rarr; go to <strong>Developer Settings</strong>.</p>
            <p>3. Paste this Webhook URL into the <strong>Real-time Transcript Webhook</strong> field.</p>
            <p>4. Your day's recordings will automatically sync to Dayline's vector memory!</p>
          </div>
        </section>

        {/* Section 4: Data Export */}
        <section className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 shadow-lg flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-editorial font-bold text-stone-900 dark:text-stone-50 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              <span>Export Memories</span>
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 font-sans-ui mt-0.5 font-medium">
              Download your complete lifetime logs in standard CSV format.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-900 text-xs font-semibold font-sans-ui hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting…' : 'Export CSV'}</span>
          </button>
        </section>
      </div>

      {/* Required footer disclaimer above dock */}
      <FooterNote />
    </div>
  );
};


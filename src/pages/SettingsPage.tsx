import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Copy,
  Check,
  Radio,
  Download,
  Moon,
  Sun,
  Target,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Droplets,
  Activity,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getDailyGoals, saveDailyGoals } from '../utils/goals';
import { DailyGoals, HabitLog } from '../types';
import { getLogs } from '../api';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [testPayload, setTestPayload] = useState(
    JSON.stringify(
      {
        transcript:
          'Slept 8 hours last night and mood was an 8. Drank 2.5 liters of water and completed a 35 minute morning jog.',
      },
      null,
      2
    )
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Goals state
  const [goals, setGoals] = useState<DailyGoals>(() => getDailyGoals());
  const [goalsSaved, setGoalsSaved] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/omi-webhook`);
    }
  }, []);

  const handleCopy = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    saveDailyGoals(goals);
    setGoalsSaved(true);
    setTimeout(() => setGoalsSaved(false), 3000);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const logs = await getLogs(90);
      if (logs.length === 0) {
        alert('No habit logs recorded yet to export.');
        return;
      }

      const headers = ['Date', 'Note', 'Sleep_Hours', 'Mood_1_to_10', 'Water_Liters', 'Exercise_Minutes', 'Activity_Type', 'Symptoms'];
      const rows = logs.map((l) => [
        `"${l.date}"`,
        `"${(l.note || '').replace(/"/g, '""')}"`,
        l.sleepHours !== null && l.sleepHours !== undefined ? l.sleepHours : '',
        l.mood !== null && l.mood !== undefined ? l.mood : '',
        l.waterLiters !== null && l.waterLiters !== undefined ? l.waterLiters : '',
        l.exerciseMinutes !== null && l.exerciseMinutes !== undefined ? l.exerciseMinutes : '',
        `"${(l.activityType || '').replace(/"/g, '""')}"`,
        `"${(l.symptoms || []).join('; ')}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `dayline-wellness-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendTestWebhook = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);

    try {
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(testPayload);
      } catch {
        throw new Error('Test payload is not valid JSON. Please check syntax.');
      }

      const res = await fetch('/api/omi-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedBody),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }

      setTestResult(data);
    } catch (err: any) {
      console.error('Test webhook failed', err);
      setTestError(err.message || 'Webhook request failed.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <SettingsIcon className="w-3.5 h-3.5 text-violet-500" />
          <span>Preferences & Integrations</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Dayline Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your experience, configure daily wellness targets, and connect external devices.
        </p>
      </div>

      {/* 1. APPEARANCE SECTION */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#111628]/90 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sun className="w-4 h-4 text-violet-500" />
            Appearance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose your preferred color theme. Dark mode is optimized for nighttime journaling.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              theme === 'dark'
                ? 'bg-violet-500/10 border-violet-500/40 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20 font-semibold'
                : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-violet-400 flex items-center justify-center border border-white/10">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold block">Dark Mode</span>
                <span className="text-xs text-slate-400">Deep indigo & calm ambient accents</span>
              </div>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-violet-500" />}
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              theme === 'light'
                ? 'bg-violet-500/10 border-violet-500/40 text-violet-700 ring-2 ring-violet-500/20 font-semibold'
                : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold block">Light Mode</span>
                <span className="text-xs text-slate-400">Crisp slate & bright daylight tones</span>
              </div>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-violet-500" />}
          </button>
        </div>
      </section>

      {/* 2. GOALS SECTION */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#111628]/90 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-500" />
              Daily Wellness Goals
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Set target goals for sleep, water hydration, and exercise saved in your browser.
            </p>
          </div>
          {goalsSaved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveGoals} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Sleep Target */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-indigo-500">
                  <Moon className="w-3.5 h-3.5" /> Sleep Target
                </span>
                <span>{goals.sleepHours} hrs</span>
              </div>
              <input
                type="number"
                min="4"
                max="12"
                step="0.5"
                value={goals.sleepHours}
                onChange={(e) =>
                  setGoals({ ...goals, sleepHours: parseFloat(e.target.value) || 8 })
                }
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Water Target */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-cyan-500">
                  <Droplets className="w-3.5 h-3.5" /> Water Target
                </span>
                <span>{goals.waterLiters} L</span>
              </div>
              <input
                type="number"
                min="1"
                max="6"
                step="0.1"
                value={goals.waterLiters}
                onChange={(e) =>
                  setGoals({ ...goals, waterLiters: parseFloat(e.target.value) || 2.5 })
                }
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            {/* Exercise Target */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-violet-500">
                  <Activity className="w-3.5 h-3.5" /> Movement Target
                </span>
                <span>{goals.exerciseMinutes} mins</span>
              </div>
              <input
                type="number"
                min="10"
                max="180"
                step="5"
                value={goals.exerciseMinutes}
                onChange={(e) =>
                  setGoals({ ...goals, exerciseMinutes: parseInt(e.target.value, 10) || 30 })
                }
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Save Target Goals
          </button>
        </form>
      </section>

      {/* 3. OMI INTEGRATION SECTION */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#111628]/90 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Omi Wearable Webhook
              </h2>
              <p className="text-xs text-slate-400">Stream audio transcripts from your Omi AI necklace directly into Dayline</p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Endpoint Live</span>
          </span>
        </div>

        {/* Webhook URL Input & Copy Button */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Your Dayline Webhook Target URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={webhookUrl || 'Loading webhook URL...'}
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 font-mono text-xs select-all outline-none"
            />
            <button
              onClick={handleCopy}
              className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-violet-600 hover:bg-violet-700 text-white shadow-xs'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy URL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Setup Steps for Omi App */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            How to configure in Omi App:
          </span>
          <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-slate-200/60 dark:border-white/5">
            <li>Open the <strong>Omi Mobile App</strong> on iOS or Android.</li>
            <li>Navigate to <strong>Settings</strong> &gt; <strong>Developer Settings</strong> &gt; <strong>Webhooks</strong>.</li>
            <li>Paste your Dayline Webhook URL into the <strong>Real-time Transcript Webhook</strong> field.</li>
            <li>Save settings. Every voice note recorded by Omi will be automatically sent to Dayline and indexed into Qdrant!</li>
          </ol>
        </div>

        {/* Test Webhook Section */}
        <div className="pt-4 border-t border-slate-200/60 dark:border-white/10 space-y-3">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            Test Omi Webhook Simulation:
          </span>
          <textarea
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200"
          />
          <button
            onClick={handleSendTestWebhook}
            disabled={isTesting}
            className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-white/10 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {isTesting ? 'Sending...' : 'Send Test Webhook'}
          </button>

          {testResult && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
              Status 200 OK: {JSON.stringify(testResult)}
            </div>
          )}

          {testError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-mono">
              Error: {testError}
            </div>
          )}
        </div>
      </section>

      {/* 4. DATA EXPORT SECTION */}
      <section className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-[#111628]/90 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-violet-500" />
              Data Export
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export all your daily health logs, metrics, and symptoms as a standard CSV spreadsheet file.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Generating CSV...' : 'Export Logs as CSV'}</span>
          </button>
        </div>

        {exportSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>CSV export generated and downloaded to your device!</span>
          </div>
        )}
      </section>
    </div>
  );
};

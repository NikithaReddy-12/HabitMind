import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Moon,
  Smile,
  Droplets,
  Activity,
  AlertCircle,
  Clock,
  Tag,
  ArrowUpDown,
} from 'lucide-react';
import { HabitLog } from '../types';
import { getLogs } from '../api';
import { MetricChips } from '../components/MetricChips';

type MetricFilter = 'all' | 'sleep' | 'mood' | 'water' | 'exercise' | 'symptoms';

export const TimelinePage: React.FC = () => {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<MetricFilter>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      try {
        const data = await getLogs(90);
        setLogs(data);
      } catch (err) {
        console.error('Failed to load timeline logs:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        // Metric filter
        if (selectedFilter === 'sleep' && log.sleepHours === null) return false;
        if (selectedFilter === 'mood' && log.mood === null) return false;
        if (selectedFilter === 'water' && log.waterLiters === null) return false;
        if (selectedFilter === 'exercise' && log.exerciseMinutes === null && !log.activityType) return false;
        if (selectedFilter === 'symptoms' && (!log.symptoms || log.symptoms.length === 0)) return false;

        // Search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchNote = log.note?.toLowerCase().includes(query);
          const matchDate = log.date.includes(query) || log.formattedDate?.toLowerCase().includes(query);
          const matchActivity = log.activityType?.toLowerCase().includes(query);
          const matchSymptoms = log.symptoms?.some((s) => s.toLowerCase().includes(query));
          const matchRaw = log.rawText?.toLowerCase().includes(query);
          return matchNote || matchDate || matchActivity || matchSymptoms || matchRaw;
        }

        return true;
      })
      .sort((a, b) => {
        return sortOrder === 'desc'
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date);
      });
  }, [logs, selectedFilter, searchQuery, sortOrder]);

  const getMoodEmoji = (mood: number | null) => {
    if (mood === null) return '✨';
    if (mood >= 8) return '🌟';
    if (mood >= 6) return '🌿';
    if (mood >= 4) return '🌤️';
    return '🌧️';
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Calendar className="w-3.5 h-3.5 text-violet-500" />
            <span>Daily History</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Wellness Timeline
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Chronological log of your physical and emotional reflections.
          </p>
        </div>

        {/* Count badge & sort */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>{sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}</span>
          </button>
          <span className="text-xs px-2.5 py-1.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold border border-violet-500/20">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl space-y-3 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes, symptoms, workout types, dates..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 dark:text-slate-500 font-medium px-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {(
            [
              { id: 'all', label: 'All Entries' },
              { id: 'sleep', label: 'Sleep' },
              { id: 'mood', label: 'Mood' },
              { id: 'water', label: 'Water' },
              { id: 'exercise', label: 'Exercise' },
              { id: 'symptoms', label: 'Symptoms' },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedFilter === filter.id
                  ? 'bg-violet-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      {isLoading ? (
        // Skeleton loader
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white/40 dark:bg-[#111628]/40 border border-slate-200/60 dark:border-white/5 animate-pulse flex flex-col gap-3"
            >
              <div className="flex justify-between items-center">
                <div className="w-32 h-4 bg-slate-200 dark:bg-white/10 rounded-md" />
                <div className="w-16 h-4 bg-slate-200 dark:bg-white/10 rounded-md" />
              </div>
              <div className="w-full h-8 bg-slate-200 dark:bg-white/10 rounded-md" />
              <div className="flex gap-2">
                <div className="w-20 h-6 bg-slate-200 dark:bg-white/10 rounded-full" />
                <div className="w-20 h-6 bg-slate-200 dark:bg-white/10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        // Empty state
        <div className="p-12 text-center rounded-3xl bg-white/60 dark:bg-[#111628]/60 border border-dashed border-slate-300 dark:border-white/10 text-slate-500">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
            No entries found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            {searchQuery || selectedFilter !== 'all'
              ? 'Try resetting your search query or filter to see more logs.'
              : 'Start by speaking your first daily reflection on the Voice Log page.'}
          </p>
          {(searchQuery || selectedFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-violet-500 before:via-indigo-500/40 before:to-transparent">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const moodEmoji = getMoodEmoji(log.mood);

            return (
              <div key={log.id} className="relative group">
                {/* Timeline Node Orb */}
                <div className="absolute -left-6 sm:-left-8 top-5 w-5 h-5 rounded-full bg-slate-900 dark:bg-[#0b0f19] border-2 border-violet-500 flex items-center justify-center shadow-md shadow-violet-500/30 group-hover:scale-125 transition-transform z-10">
                  <div className="w-2 h-2 rounded-full bg-violet-400" />
                </div>

                {/* Day Card */}
                <div
                  onClick={() => toggleExpand(log.id)}
                  className={`rounded-2xl p-5 bg-white/80 dark:bg-[#111628]/90 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                    isExpanded
                      ? 'border-violet-500/40 dark:border-violet-500/30 ring-2 ring-violet-500/10'
                      : 'border-slate-200/80 dark:border-white/10 hover:border-violet-500/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{moodEmoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {log.formattedDate || log.date}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                            {log.date}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {log.activityType && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                          {log.activityType}
                        </span>
                      )}
                      <button
                        aria-label={isExpanded ? 'Collapse entry' : 'Expand entry'}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Note preview / full text */}
                  <p
                    className={`text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3 ${
                      !isExpanded && 'line-clamp-2'
                    }`}
                  >
                    {log.note}
                  </p>

                  {/* Metric Chips */}
                  <div className="pt-1">
                    <MetricChips
                      sleepHours={log.sleepHours}
                      mood={log.mood}
                      waterLiters={log.waterLiters}
                      exerciseMinutes={log.exerciseMinutes}
                      activityType={log.activityType}
                      size="sm"
                    />
                  </div>

                  {/* Expanded Extra Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-3 animate-in fade-in duration-200">
                      {/* Symptoms */}
                      {log.symptoms && log.symptoms.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-rose-500" />
                            Reported Symptoms / Sensations:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {log.symptoms.map((symptom, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs font-medium"
                              >
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Raw text if different from note */}
                      {log.rawText && log.rawText !== log.note && (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-violet-400" />
                            Original Transcript:
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-200/40 dark:border-white/5">
                            "{log.rawText}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

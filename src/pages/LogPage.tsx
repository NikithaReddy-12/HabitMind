import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Calendar,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  Moon,
  Smile,
  Droplets,
  Activity,
  HeartPulse,
  Tag,
  Check,
  Plus,
} from 'lucide-react';
import { HabitLog, CreateLogInput, ExtractedHealthData } from '../types';
import { saveLog, getLogs, getLocalDateString } from '../api';
import { MetricChips } from '../components/MetricChips';

function extractHabitDataFromText(text: string): {
  sleepHours?: number;
  mood?: number;
  waterLiters?: number;
  exerciseMinutes?: number;
  activityType?: string;
} {
  const result: {
    sleepHours?: number;
    mood?: number;
    waterLiters?: number;
    exerciseMinutes?: number;
    activityType?: string;
  } = {};

  const sleepMatch = text.match(/(?:slept|sleep[:\s]+)\s*(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)?/i);
  if (sleepMatch) {
    const val = parseFloat(sleepMatch[1]);
    if (!isNaN(val) && val >= 1 && val <= 16) result.sleepHours = val;
  }

  const moodMatch = text.match(/(?:mood(?:\s*was|\s*is)?[:\s]+|feeling(?:\s*like)?\s*(?:an?)?\s*)(\d+)(?:\s*\/\s*10|\s*out of 10)?/i);
  if (moodMatch) {
    const val = parseInt(moodMatch[1], 10);
    if (!isNaN(val) && val >= 1 && val <= 10) result.mood = val;
  }

  const waterMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:liters|litres|l)\s*(?:of\s*water)?/i);
  if (waterMatch) {
    const val = parseFloat(waterMatch[1]);
    if (!isNaN(val) && val >= 0.2 && val <= 8) result.waterLiters = val;
  }

  const exMatch = text.match(/(\d+)\s*(?:min|mins|minutes)\s*(?:of\s*)?([a-zA-Z\s]+)?/i);
  if (exMatch) {
    const val = parseInt(exMatch[1], 10);
    if (!isNaN(val) && val >= 1 && val <= 300) {
      result.exerciseMinutes = val;
      if (exMatch[2]) {
        const act = exMatch[2].trim();
        if (act && act.length < 30 && !act.match(/^(of|and|the|a|sleep|water)$/i)) {
          result.activityType = act;
        }
      }
    }
  }

  return result;
}

interface LogPageProps {
  onLogSaved?: () => void;
}

export const LogPage: React.FC<LogPageProps> = ({ onLogSaved }) => {
  // Speech recognition transcripts state (Bug Fix #8 requirement)
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  // Extracted metrics state (editable before final confirmation)
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [mood, setMood] = useState<number>(7);
  const [waterLiters, setWaterLiters] = useState<number>(2.0);
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(30);
  const [activityType, setActivityType] = useState<string>('Daily Movement');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [showAdjustMetrics, setShowAdjustMetrics] = useState(false);

  // Status state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [lastSavedSummary, setLastSavedSummary] = useState<HabitLog | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);

  // Speech Recognition ref and listening tracker
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

  // Computed combined display text
  const fullDisplayText =
    finalTranscript +
    (finalTranscript && interimTranscript && !finalTranscript.endsWith(' ') ? ' ' : '') +
    interimTranscript;

  // Refresh recent logs
  const refreshLogs = async () => {
    try {
      const data = await getLogs(30);
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
      setLogs(sorted.slice(0, 5));
    } catch (err) {
      console.error('Error fetching logs', err);
    }
  };

  // Helper to extract habits from text
  const parseAndApplyMetrics = (text: string) => {
    if (!text.trim()) return;
    const extracted = extractHabitDataFromText(text);
    if (extracted.sleepHours !== undefined) setSleepHours(extracted.sleepHours);
    if (extracted.mood !== undefined) setMood(extracted.mood);
    if (extracted.waterLiters !== undefined) setWaterLiters(extracted.waterLiters);
    if (extracted.exerciseMinutes !== undefined) setExerciseMinutes(extracted.exerciseMinutes);
    if (extracted.activityType !== undefined) setActivityType(extracted.activityType);
  };

  // Synchronize metric extraction with live combined text
  useEffect(() => {
    if (fullDisplayText.trim()) {
      parseAndApplyMetrics(fullDisplayText);
    }
  }, [finalTranscript, interimTranscript]);

  // Initialize SpeechRecognition once with useRef and cleanup on unmount
  useEffect(() => {
    refreshLogs();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let newFinalChunk = '';
        let localInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            newFinalChunk += res[0].transcript;
          } else {
            localInterim += res[0].transcript;
          }
        }

        // Append final chunk once only to finalTranscript
        if (newFinalChunk) {
          setFinalTranscript((prev) => {
            const trimmedPrev = prev.trim();
            const trimmedChunk = newFinalChunk.trim();
            return trimmedPrev ? `${trimmedPrev} ${trimmedChunk}` : trimmedChunk;
          });
        }

        // Replace interimTranscript (never append!)
        setInterimTranscript(localInterim);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please enable mic access or type manually.');
          isListeningRef.current = false;
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Keep listening or allow user to resume
        } else {
          setSpeechError(`Speech recognition note: ${event.error}`);
        }
      };

      recognition.onend = () => {
        // If the user hasn't pressed stop (still "listening"), restart recognition so it doesn't cut off silently
        if (isListeningRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn('Speech recognition restart failed:', e);
            isListeningRef.current = false;
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to initialize Speech Recognition:', e);
      setIsSpeechSupported(false);
    }

    return () => {
      // On unmount, call recognition.stop() and remove handlers
      isListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleListening = () => {
    setSpeechError(null);
    if (!isSpeechSupported || !recognitionRef.current) return;

    if (isListening) {
      // User pressed stop:
      // Merge interim text into final text and clear interim state
      isListeningRef.current = false;
      setIsListening(false);

      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }

      setFinalTranscript((prev) => {
        const trimmedInterim = interimTranscript.trim();
        if (!trimmedInterim) return prev;
        const trimmedPrev = prev.trim();
        return trimmedPrev ? `${trimmedPrev} ${trimmedInterim}` : trimmedInterim;
      });
      setInterimTranscript('');
    } else {
      // User pressed start:
      isListeningRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Start recognition error:', e);
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  };

  // Manual typing updates finalTranscript and clears interimTranscript, mic continues from there
  const handleManualTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFinalTranscript(val);
    setInterimTranscript('');
    parseAndApplyMetrics(val);
  };

  // Append quick chip tag to transcript
  const appendQuickChip = (phrase: string) => {
    setFinalTranscript((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${phrase}` : phrase;
    });
    parseAndApplyMetrics(fullDisplayText + ' ' + phrase);
  };

  const handleSave = async () => {
    const textToSave = (
      finalTranscript + (interimTranscript ? (finalTranscript ? ' ' : '') + interimTranscript : '')
    ).trim();

    if (!textToSave) return;

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const input: CreateLogInput = {
        text: textToSave,
        note: textToSave,
        sleepHours,
        mood,
        waterLiters,
        exerciseMinutes,
        activityType,
      };

      const extracted = await saveLog(input);
      setLastSavedSummary(extracted);
      setFinalTranscript('');
      setInterimTranscript('');
      setSaveSuccess('Log analyzed by Dayline AI and indexed in Qdrant memory.');
      await refreshLogs();
      if (onLogSaved) onLogSaved();
    } catch (err: any) {
      console.error('Failed to save log:', err);
      setSaveError(err.message || 'Failed to process and save log via /api/log.');
    } finally {
      setIsSaving(false);
    }
  };

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Check if today has already been logged
  const todayStr = getLocalDateString(new Date());
  const todayLog = logs.find((l) => l.date === todayStr);
  const isTodayLogged = !!todayLog;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Top Greeting & Today's Check-in Ring */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-3xl bg-white/70 dark:bg-[#111628]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />
            <span>Voice-First Check-in</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {getGreeting()}, how are you feeling?
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Speak naturally about sleep, mood, hydration, and energy. Dayline structures it all.
          </p>
        </div>

        {/* Today's Check-in Progress Ring */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5 self-start sm:self-auto">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* SVG Ring */}
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200 dark:text-white/10"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={isTodayLogged ? 'text-teal-400' : 'text-violet-500'}
                strokeDasharray={isTodayLogged ? '100, 100' : '30, 100'}
                strokeLinecap="round"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isTodayLogged ? (
                <Check className="w-5 h-5 text-teal-400" />
              ) : (
                <Calendar className="w-4 h-4 text-violet-500" />
              )}
            </div>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              {isTodayLogged ? 'Logged Today' : "Today's Check-in"}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Mic Warning Banners */}
      {!isSpeechSupported && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="font-semibold block mb-0.5">Voice Input Fallback</strong>
            Speech recognition is unavailable in this browser window. You can type directly in the notes area below.
          </div>
        </div>
      )}

      {speechError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>{speechError}</div>
        </div>
      )}

      {/* Central Voice Recording Hub */}
      <div className="relative rounded-3xl p-6 sm:p-10 bg-white/80 dark:bg-[#111628]/90 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-lg transition-all text-center">
        {/* Animated Central Mic Orb */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative">
            {/* Pulsing ripples & waveform rings when listening */}
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping duration-1000 scale-150 pointer-events-none" />
                <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-violet-600/30 via-indigo-600/30 to-teal-400/30 animate-pulse pointer-events-none blur-md" />
                <div className="absolute -inset-8 rounded-full border border-violet-500/20 animate-spin duration-3000 pointer-events-none" />
              </>
            )}

            <button
              onClick={toggleListening}
              disabled={!isSpeechSupported}
              title={
                !isSpeechSupported
                  ? 'Speech recognition unavailable'
                  : isListening
                  ? 'Tap to stop recording'
                  : 'Tap to start speaking'
              }
              aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
              className={`relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer shadow-2xl ${
                !isSpeechSupported
                  ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                  : isListening
                  ? 'bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white shadow-rose-500/40 scale-105 ring-4 ring-rose-500/20'
                  : 'bg-gradient-to-tr from-violet-600 via-indigo-600 to-teal-400 text-white shadow-violet-500/30 hover:scale-105 hover:shadow-violet-500/40 ring-4 ring-violet-500/10'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-10 h-10 animate-pulse" />
                  <span className="text-[10px] font-extrabold mt-1 uppercase tracking-widest">
                    Stop
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-10 h-10" />
                  <span className="text-[10px] font-extrabold mt-1 uppercase tracking-widest">
                    {isSpeechSupported ? 'Tap & Speak' : 'Voice Off'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Listening State & Live Waveform Animation */}
          <div className="mt-5 flex flex-col items-center">
            {isListening ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5 h-6">
                  {/* Live Waveform Bars */}
                  {[40, 75, 55, 90, 60, 85, 45, 95, 65, 50].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 bg-gradient-to-t from-violet-500 to-teal-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 120}ms`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>Listening live... Speak freely</span>
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                Tap the orb to start recording, or type your daily notes below.
              </p>
            )}
          </div>
        </div>

        {/* Live Transcript Appearing Beneath Orb */}
        <div className="space-y-3 mt-6 text-left">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span className="font-semibold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Volume2 className="w-3.5 h-3.5 text-violet-500" />
              <span>Voice Transcript & Daily Reflection</span>
            </span>
            {fullDisplayText && (
              <button
                onClick={() => {
                  setFinalTranscript('');
                  setInterimTranscript('');
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer text-xs"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Textarea container with styled interim preview overlay */}
          <div className="relative min-h-[120px] rounded-2xl bg-slate-50 dark:bg-black/25 border border-slate-200/80 dark:border-white/10 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all overflow-hidden">
            {/* Visual backdrop that renders interim text in lighter gray */}
            {interimTranscript ? (
              <div
                aria-hidden="true"
                className="absolute inset-0 p-4 pointer-events-none text-sm leading-relaxed whitespace-pre-wrap break-words select-none overflow-y-auto font-sans"
              >
                <span className="text-slate-900 dark:text-slate-100">{finalTranscript}</span>
                {finalTranscript && !finalTranscript.endsWith(' ') && ' '}
                <span className="text-slate-400 dark:text-slate-500 italic">
                  {interimTranscript}
                </span>
              </div>
            ) : null}

            <textarea
              value={fullDisplayText}
              onChange={handleManualTextChange}
              rows={4}
              placeholder="e.g. Slept 8 hours, felt well-rested (mood 8). Drank 2.5L water and did 35 minutes of morning yoga."
              className={`relative z-10 w-full p-4 outline-none text-sm leading-relaxed resize-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent ${
                interimTranscript ? 'text-transparent caret-violet-500' : 'text-slate-900 dark:text-slate-100'
              }`}
            />
          </div>

          {/* Live partial streaming badge */}
          {interimTranscript && isListening && (
            <div className="flex items-center gap-1.5 text-xs text-violet-700 dark:text-violet-300 bg-violet-500/10 px-3 py-1.5 rounded-xl border border-violet-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping" />
              <span className="font-semibold">Transcribing:</span>
              <span className="italic truncate max-w-md">"{interimTranscript}"</span>
            </div>
          )}

          {/* Quick-Add Chips below orb */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 block mb-2">
              Quick-add tags:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Slept well', text: 'Slept 8 hours and felt refreshed' },
                { label: 'Skipped workout', text: 'Skipped workout today, rested body' },
                { label: 'Felt anxious', text: 'Felt slight anxiety in the afternoon' },
                { label: 'Drank 2L water', text: 'Drank 2 liters of water' },
                { label: 'High energy', text: 'Energy was a solid 9 out of 10' },
                { label: 'Walked 30 mins', text: 'Went for a 30 minute outdoor walk' },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => appendQuickChip(chip.text)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 text-slate-700 dark:text-slate-300 hover:text-violet-700 dark:hover:text-violet-300 border border-slate-200/60 dark:border-white/5 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-violet-500" />
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Extracted Metrics / Sliders Tuning */}
        <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-violet-500/5 via-indigo-500/5 to-teal-500/5 dark:from-white/[0.02] dark:to-white/[0.04] border border-violet-500/20 dark:border-white/10 text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                Extracted Metrics
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                (Preview before saving)
              </span>
            </div>

            <button
              onClick={() => setShowAdjustMetrics(!showAdjustMetrics)}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showAdjustMetrics ? 'Close Sliders' : 'Fine-Tune Sliders'}</span>
            </button>
          </div>

          <MetricChips
            sleepHours={sleepHours}
            mood={mood}
            waterLiters={waterLiters}
            exerciseMinutes={exerciseMinutes}
            activityType={activityType}
          />

          {/* Fine-tune Sliders */}
          {showAdjustMetrics && (
            <div className="mt-4 pt-4 border-t border-violet-500/20 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
              <div className="p-3 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200/60 dark:border-white/10">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1 text-indigo-500">
                    <Moon className="w-3.5 h-3.5" /> Sleep Duration
                  </span>
                  <span>{sleepHours} hours</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200/60 dark:border-white/10">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1 text-teal-500">
                    <Smile className="w-3.5 h-3.5" /> Mood (1-10)
                  </span>
                  <span>{mood} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={mood}
                  onChange={(e) => setMood(parseInt(e.target.value, 10))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200/60 dark:border-white/10">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1 text-cyan-500">
                    <Droplets className="w-3.5 h-3.5" /> Hydration
                  </span>
                  <span>{waterLiters} Liters</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={waterLiters}
                  onChange={(e) => setWaterLiters(parseFloat(e.target.value))}
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-[#0b0f19] border border-slate-200/60 dark:border-white/10">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  <span className="flex items-center gap-1 text-violet-500">
                    <Activity className="w-3.5 h-3.5" /> Movement
                  </span>
                  <span>{exerciseMinutes} Minutes</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(parseInt(e.target.value, 10))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Toasts / Notifications */}
        {saveSuccess && (
          <div className="mt-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-start justify-between gap-3 text-left animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm block">Entry Indexed Successfully!</strong>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">{saveSuccess}</p>
              </div>
            </div>
            <button
              onClick={() => setSaveSuccess(null)}
              className="text-emerald-500 hover:text-emerald-700 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {saveError && (
          <div className="mt-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 flex items-start justify-between gap-3 text-left animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm block">Error saving log</strong>
                <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5 break-all">{saveError}</p>
              </div>
            </div>
            <button
              onClick={() => setSaveError(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Last Saved Parsed Summary Card */}
        {lastSavedSummary && (
          <div className="mt-5 p-5 rounded-2xl bg-violet-500/10 dark:bg-violet-500/15 border border-violet-500/30 text-left animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2 text-violet-800 dark:text-violet-200 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span>Parsed Summary from Lyzr Agent</span>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200 font-medium mb-3">
              "{lastSavedSummary.note}"
            </p>
            <MetricChips
              sleepHours={lastSavedSummary.sleepHours}
              mood={lastSavedSummary.mood}
              waterLiters={lastSavedSummary.waterLiters}
              exerciseMinutes={lastSavedSummary.exerciseMinutes}
              activityType={lastSavedSummary.activityType || undefined}
              size="sm"
            />
          </div>
        )}

        {/* Primary Save Action Button */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/60 dark:border-white/10">
          <p className="text-xs text-slate-400 dark:text-slate-500 text-left">
            {isSaving
              ? 'Lyzr AI agent analyzing text and embedding vector in Qdrant...'
              : 'Save log will parse your entry and update your Dayline timeline.'}
          </p>

          <button
            onClick={handleSave}
            disabled={!fullDisplayText.trim() || isSaving}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              !fullDisplayText.trim() || isSaving
                ? 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white shadow-violet-500/30 active:scale-98'
            }`}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing & Saving...
              </span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Save log</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recent Logs Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-violet-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Recent Logs (Last 5)
            </h2>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {logs.length} entries recorded
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 sm:p-10 text-center rounded-3xl bg-white/60 dark:bg-[#111628]/60 border border-dashed border-slate-300 dark:border-white/10 text-slate-500">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-1">
              No logs recorded yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Tap the microphone orb above to record your first daily check-in.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="rounded-2xl p-5 bg-white/70 dark:bg-[#111628]/80 border border-slate-200/70 dark:border-white/10 shadow-xs hover:border-violet-500/30 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {log.formattedDate || log.date}
                    </span>
                    {log.activityType && (
                      <span className="text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
                        {log.activityType}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
                  {log.note}
                </p>

                <MetricChips
                  sleepHours={log.sleepHours}
                  mood={log.mood}
                  waterLiters={log.waterLiters}
                  exerciseMinutes={log.exerciseMinutes}
                  activityType={log.activityType}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

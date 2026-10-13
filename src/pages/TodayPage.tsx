import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
  RotateCcw,
  Sliders,
  HelpCircle,
  Volume2,
} from 'lucide-react';
import { MoodOrb } from '../components/MoodOrb';
import { MetricChips } from '../components/MetricChips';
import { HabitLog, DailyGoals, CreateLogInput, ExtractedHealthData } from '../types';
import { saveLog, getLogs, askQuestion, getLocalDateString } from '../api';
import { getDailyGoals } from '../utils/goals';
import { ActiveAurora } from '../context/ThemeContext';
import { FooterNote } from '../components/FooterNote';

interface TodayPageProps {
  onLogSaved?: (newLog: HabitLog) => void;
  activeAurora: ActiveAurora;
}

interface QuickExtractedData {
  sleepHours: number | null;
  mood: number | null;
  waterLiters: number | null;
  exerciseMinutes: number | null;
  activityType?: string;
  symptoms: string[];
}

// Client-side quick extractor for immediate visual preview before saveLog
function extractQuickHealthData(text: string): QuickExtractedData {
  const result: QuickExtractedData = {
    sleepHours: null,
    mood: null,
    waterLiters: null,
    exerciseMinutes: null,
    activityType: undefined,
    symptoms: [],
  };

  const sleepMatch = text.match(/(?:slept|sleep|slept for)\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)?/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours?)\s*(?:of\s*)?sleep/i);
  if (sleepMatch) {
    const val = parseFloat(sleepMatch[1]);
    if (val >= 0 && val <= 24) result.sleepHours = val;
  }

  const moodScale = text.match(/mood\s*(?:is|was|at|of)?\s*(\d+(?:\.\d+)?)(?:\/10|\/5|\s+out of (?:10|5))?/i);
  if (moodScale) {
    let val = parseFloat(moodScale[1]);
    if (text.includes('/5') || text.includes('out of 5')) {
      val = val * 2;
    }
    if (val >= 1 && val <= 10) result.mood = Math.round(val);
  } else if (/great|amazing|wonderful|ecstatic|joyful|fantastic/i.test(text)) {
    result.mood = 9;
  } else if (/good|happy|fine|energized|positive|refreshed/i.test(text)) {
    result.mood = 8;
  } else if (/okay|neutral|so-so|alright|average/i.test(text)) {
    result.mood = 6;
  } else if (/low|tired|stressed|sad|exhausted|meh/i.test(text)) {
    result.mood = 4;
  } else if (/terrible|awful|horrible|depressed|miserable/i.test(text)) {
    result.mood = 2;
  }

  const waterMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|liters|litres)\s*(?:of\s*)?water/i) ||
    text.match(/drank\s*(\d+(?:\.\d+)?)\s*(?:l|liter|liters|litres)?/i);
  if (waterMatch) {
    const val = parseFloat(waterMatch[1]);
    if (val > 0 && val <= 10) result.waterLiters = val;
  }

  const exMatch = text.match(/(\d+)\s*(?:min|mins|minutes?)\s*(?:of\s*)?([a-zA-Z\s]+)?/i) ||
    text.match(/(?:ran|walked|gym|yoga|cycling|workout)\s*(?:for\s*)?(\d+)\s*(?:min|mins|minutes?)?/i);
  if (exMatch) {
    const val = parseInt(exMatch[1], 10);
    if (val > 0 && val <= 360) result.exerciseMinutes = val;
    if (exMatch[2]) result.activityType = exMatch[2].trim().slice(0, 20);
  }

  const symptomList = ['headache', 'back pain', 'anxious', 'insomnia', 'fatigue', 'sore throat', 'cramps', 'brain fog'];
  symptomList.forEach((s) => {
    if (new RegExp(`\\b${s}\\b`, 'i').test(text)) {
      result.symptoms.push(s);
    }
  });

  return result;
}

export const TodayPage: React.FC<TodayPageProps> = ({ onLogSaved, activeAurora }) => {
  // Speech Recognition state
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // Today log & recent state
  const [todayLog, setTodayLog] = useState<HabitLog | null>(null);
  const [streak, setStreak] = useState(0);
  const [goals, setGoals] = useState<DailyGoals>(getDailyGoals);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sheet states for Omnibox responses
  const [askResult, setAskResult] = useState<{ question: string; answer: string; sources: { date: string }[] } | null>(null);
  const [logPreview, setLogPreview] = useState<{
    text: string;
    extracted: QuickExtractedData;
    savedLog?: HabitLog;
  } | null>(null);

  // Initialize Speech Recognition once
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser environment');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let currentFinal = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptChunk = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          currentFinal += transcriptChunk + ' ';
        } else {
          currentInterim += transcriptChunk;
        }
      }

      if (currentFinal) {
        setFinalTranscript((prev) => (prev ? `${prev.trim()} ${currentFinal.trim()}` : currentFinal.trim()));
      }
      setInterimTranscript(currentInterim);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      // Auto-restart if user has not explicitly clicked stop
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          isListeningRef.current = false;
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Fetch recent logs to calculate streak & today check-in
  const loadData = async () => {
    try {
      const logs = await getLogs(14);
      const todayStr = getLocalDateString();
      const foundToday = logs.find((l) => l.date === todayStr);
      if (foundToday) setTodayLog(foundToday);

      // Calculate streak
      let currentStreak = 0;
      const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
      let checkDate = new Date();

      for (let i = 0; i < 30; i++) {
        const dStr = checkDate.toISOString().split('T')[0];
        const hasLog = sorted.some((l) => l.date === dStr);
        if (hasLog) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (i === 0) {
          // Not logged today yet; check yesterday
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      setStreak(currentStreak);
    } catch (e) {
      console.warn('Failed to fetch initial logs', e);
    }
  };

  useEffect(() => {
    loadData();
    setGoals(getDailyGoals());
  }, []);

  // Mic toggle handler
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type in the omnibox.');
      return;
    }

    if (isListening) {
      isListeningRef.current = false;
      setIsListening(false);
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      // Merge any interim text into final transcript
      if (interimTranscript) {
        setFinalTranscript((prev) =>
          prev ? `${prev.trim()} ${interimTranscript.trim()}` : interimTranscript.trim()
        );
        setInterimTranscript('');
      }
    } else {
      isListeningRef.current = true;
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  };

  // Full omnibox text value (final + interim)
  const fullText = useMemo(() => {
    if (finalTranscript && interimTranscript) {
      return `${finalTranscript} ${interimTranscript}`;
    }
    return finalTranscript || interimTranscript;
  }, [finalTranscript, interimTranscript]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFinalTranscript(e.target.value);
    setInterimTranscript('');
  };

  // Auto-detect intent: Ask or Log
  const isQuestionIntent = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.endsWith('?')) return true;
    return /^(how|what|when|why|did|do|am|is|which|can|could|where)\b/i.test(trimmed);
  };

  // Submit omnibox
  const handleSubmit = async (textToSubmit?: string) => {
    const text = (textToSubmit || fullText).trim();
    if (!text) return;

    // Stop mic if running
    if (isListening) {
      toggleListening();
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const isQuestion = isQuestionIntent(text);

    if (isQuestion) {
      try {
        const res = await askQuestion(text);
        setAskResult({
          question: text,
          answer: res.answer,
          sources: (res.relevantLogDates || []).map((d) => ({ date: d })),
        });
        setLogPreview(null);
        setFinalTranscript('');
        setInterimTranscript('');
      } catch (err: any) {
        setStatusMessage(err.message || 'Failed to answer question. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Save log intent
      try {
        const quick = extractQuickHealthData(text);
        const input: CreateLogInput = {
          text,
          date: getLocalDateString(),
          sleepHours: quick.sleepHours ?? undefined,
          mood: quick.mood ?? undefined,
          waterLiters: quick.waterLiters ?? undefined,
          exerciseMinutes: quick.exerciseMinutes ?? undefined,
          activityType: quick.activityType,
        };

        const saved = await saveLog(input);
        setTodayLog(saved);
        if (onLogSaved) onLogSaved(saved);

        setLogPreview({
          text,
          extracted: {
            sleepHours: saved.sleepHours,
            mood: saved.mood,
            waterLiters: saved.waterLiters,
            exerciseMinutes: saved.exerciseMinutes,
            activityType: saved.activityType,
            symptoms: saved.symptoms || [],
          },
          savedLog: saved,
        });
        setAskResult(null);
        setFinalTranscript('');
        setInterimTranscript('');
        setStatusMessage('Logged to your Dayline memory.');
      } catch (err: any) {
        setStatusMessage(err.message || 'Failed to save daily log.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Time-of-day suggestions
  const suggestions = useMemo(() => {
    switch (activeAurora) {
      case 'dawn':
        return [
          'Slept 8 hours, woke up calm and refreshed',
          'How did I sleep this week?',
          'Morning stretch and 500ml warm water',
        ];
      case 'day':
        return [
          'Drank 2L water, feeling energized',
          'Did I work out yesterday?',
          'Walked for 35 minutes outside, mood 8/10',
        ];
      case 'dusk':
      case 'night':
      default:
        return [
          'Log today: 7.5h sleep, 2L water, 30m run, felt calm',
          'When was my best mood day this month?',
          'Winding down with tea, mood 9/10',
        ];
    }
  }, [activeAurora]);

  // Greeting and Daily Whisper
  const greeting = useMemo(() => {
    switch (activeAurora) {
      case 'dawn':
        return 'Good morning';
      case 'day':
        return 'Good afternoon';
      case 'dusk':
        return 'Good evening';
      case 'night':
      default:
        return 'Peaceful night';
    }
  }, [activeAurora]);

  const dailyWhisper = useMemo(() => {
    const whispers = [
      'Your rhythm is steady. Small daily moments shape lasting wellbeing.',
      'Listen closely to what your body and mind are asking for today.',
      'Progress lives in quiet consistency, not perfection.',
      'Notice the subtle link between your rest, hydration, and peace.',
      'Take a deep breath. Today is a fresh page in your journey.',
    ];
    if (streak > 3) {
      return `${streak} days in harmony. You are building quiet strength each day.`;
    }
    return whispers[new Date().getDate() % whispers.length];
  }, [streak]);

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center justify-between min-h-[calc(100vh-140px)] px-4 py-2 sm:py-6 select-none safe-dock-pb">
      {/* Top Greeting & Daily Whisper */}
      <div className="text-center w-full mb-3 sm:mb-6 animate-in fade-in duration-500">
        <h2 className="text-3xl sm:text-5xl font-editorial tracking-tight text-stone-900 dark:text-stone-50 font-normal">
          {greeting}.
        </h2>
        <p className="mt-2 text-xs sm:text-sm font-sans-ui text-stone-600 dark:text-stone-300 max-w-md mx-auto italic opacity-90">
          "{dailyWhisper}"
        </p>
      </div>

      {/* Central Interactive Mood Orb with Orbiting Satellites */}
      <div className="my-auto w-full flex flex-col items-center justify-center">
        <MoodOrb
          mood={todayLog?.mood ?? (logPreview?.extracted.mood ?? null)}
          sleepHours={todayLog?.sleepHours ?? (logPreview?.extracted.sleepHours ?? null)}
          waterLiters={todayLog?.waterLiters ?? (logPreview?.extracted.waterLiters ?? null)}
          exerciseMinutes={todayLog?.exerciseMinutes ?? (logPreview?.extracted.exerciseMinutes ?? null)}
          goals={goals}
          isListening={isListening}
          onClickOrb={toggleListening}
        />

        {/* Status notification toast */}
        {statusMessage && (
          <div className="mt-3 px-4 py-1.5 rounded-full bg-stone-900/90 text-stone-100 dark:bg-white/95 dark:text-stone-900 text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 dark:text-teal-500" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Bottom Area: Suggestions & Omnibox */}
      <div className="w-full mt-4 sm:mt-6 pb-2">
        {/* Dynamic suggestion chips with edge fade mask */}
        <div className="carousel-mask w-full overflow-hidden px-2">
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 no-scrollbar px-6">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setFinalTranscript(suggestion);
                  setInterimTranscript('');
                  handleSubmit(suggestion);
                }}
                className="flex-shrink-0 text-xs font-sans-ui px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 text-stone-800 dark:text-stone-200 border border-stone-200/60 dark:border-white/10 shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-95 font-medium"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Wide Pill Omnibox */}
        <div className="relative mt-2 w-full max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="relative flex items-center rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-stone-200/80 dark:border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-all focus-within:ring-2 focus-within:ring-violet-400 dark:focus-within:ring-teal-400"
          >
            {/* Mic button inside Omnibox */}
            <button
              type="button"
              onClick={toggleListening}
              className={`flex-shrink-0 p-3 ml-1.5 rounded-full transition-all focus:outline-none ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md'
                  : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10'
              }`}
              aria-label={isListening ? 'Stop listening' : 'Start speaking to log or ask'}
              title={isListening ? 'Stop mic' : 'Voice mic: speak or ask'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Input / display area */}
            <div className="flex-1 relative py-3 px-2">
              <input
                type="text"
                value={fullText}
                onChange={handleTextChange}
                placeholder={
                  isListening
                    ? 'Listening... say what you did or ask a question...'
                    : 'Speak or type: "7h sleep, 2L water" or "How was my sleep?"'
                }
                className="w-full bg-transparent border-none outline-none text-sm sm:text-base text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 font-sans-ui pr-2"
              />
            </div>

            {/* Submit Arrow Button */}
            <button
              type="submit"
              disabled={isSubmitting || !fullText.trim()}
              className="flex-shrink-0 p-2.5 mr-1.5 rounded-full bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-900 disabled:opacity-30 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all shadow-md focus:outline-none"
              aria-label="Send query or save log"
            >
              {isSubmitting ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </form>

          {/* Real-time hint under omnibox with increased contrast */}
          <div className="mt-1.5 px-4 flex justify-between items-center text-[11px] text-stone-600 dark:text-stone-400 font-sans-ui font-medium">
            <span>
              {fullText.trim() ? (
                isQuestionIntent(fullText) ? (
                  <span className="text-violet-600 dark:text-violet-400 font-semibold">
                    Question detected — querying vector memory
                  </span>
                ) : (
                  <span className="text-teal-600 dark:text-teal-400 font-semibold">
                    Journal log detected — extracting wellness metrics
                  </span>
                )
              ) : (
                'Auto-detects queries (ends in ?) vs lifestyle logs'
              )}
            </span>
            {isListening && (
              <span className="flex items-center gap-1 text-rose-500 font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Live recording
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Required footer disclaimer above dock */}
      <FooterNote />

      {/* Floating Bottom Sheet: Ask Result */}
      {askResult && (
        <div
          role="dialog"
          aria-labelledby="ask-sheet-title"
          className="fixed inset-x-0 bottom-24 z-40 max-w-2xl mx-auto px-4 animate-in slide-in-from-bottom-8 duration-300"
        >
          <div className="p-5 sm:p-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-stone-200/80 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.25)] text-stone-900 dark:text-stone-100">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-violet-600 dark:text-teal-400">
                <Sparkles className="w-4 h-4" />
                <span id="ask-sheet-title" className="text-xs font-semibold uppercase tracking-wider font-sans-ui">
                  Memory Reflection
                </span>
              </div>
              <button
                onClick={() => setAskResult(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                aria-label="Close reflection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <h4 className="mt-2 text-base font-medium text-stone-800 dark:text-stone-200 font-editorial italic">
              "{askResult.question}"
            </h4>

            <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300 font-sans-ui">
              {askResult.answer}
            </p>

            {askResult.sources && askResult.sources.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-200/60 dark:border-white/10 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
                  Referenced logs:
                </span>
                {askResult.sources.map((src, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-white/10 text-stone-700 dark:text-stone-300 font-sans-ui font-medium"
                  >
                    <Calendar className="w-3 h-3 text-stone-400" />
                    {src.date}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Sheet: Parsed Log Result & Confirmation */}
      {logPreview && (
        <div
          role="dialog"
          aria-labelledby="log-sheet-title"
          className="fixed inset-x-0 bottom-24 z-40 max-w-2xl mx-auto px-4 animate-in slide-in-from-bottom-8 duration-300"
        >
          <div className="p-5 sm:p-6 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-stone-200/80 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.25)] text-stone-900 dark:text-stone-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="w-4 h-4" />
                <span id="log-sheet-title" className="text-xs font-semibold uppercase tracking-wider font-sans-ui">
                  Saved to Daily Memory
                </span>
              </div>
              <button
                onClick={() => setLogPreview(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors"
                aria-label="Close summary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-stone-600 dark:text-stone-300 italic font-sans-ui bg-stone-50 dark:bg-white/5 p-3 rounded-2xl border border-stone-200/40 dark:border-white/5">
              "{logPreview.text}"
            </p>

            <div className="mt-4">
              <span className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider font-semibold">
                Extracted Metrics
              </span>
              <div className="mt-2">
                <MetricChips
                  sleepHours={logPreview.extracted.sleepHours}
                  mood={logPreview.extracted.mood}
                  waterLiters={logPreview.extracted.waterLiters}
                  exerciseMinutes={logPreview.extracted.exerciseMinutes}
                  activityType={logPreview.extracted.activityType}
                  symptoms={logPreview.extracted.symptoms}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

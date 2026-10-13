import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareQuote,
  Send,
  Sparkles,
  Calendar,
  Mic,
  MicOff,
  X,
  Clock,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { HabitLog } from '../types';
import { askQuestion, getLogs } from '../api';
import { MetricChips } from '../components/MetricChips';
import { FooterNote } from '../components/FooterNote';


interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  relevantDates?: string[];
  timestamp: number;
}

const SUGGESTED_QUESTIONS = [
  'How was my sleep this week?',
  'When did I last feel anxious?',
  'Best mood day this month?',
  'Am I drinking enough water?',
  'Did I exercise more last week or this week?',
];

export const AskPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello. I'm Dayline's conversational memory. Ask me anything about your recorded rest, mood shifts, symptoms, or habits. I query your personal vector index to find grounded answers.",
      relevantDates: [],
      timestamp: Date.now(),
    },
  ]);

  // Speech Recognition state (Fixed pattern: final + interim)
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  const [isLoading, setIsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<HabitLog[]>([]);
  const [selectedLogPreview, setSelectedLogPreview] = useState<HabitLog | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition once with persistent useRef
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

  // Fetch recent logs for preview drawer
  useEffect(() => {
    async function loadLogs() {
      try {
        const logs = await getLogs(90);
        setAllLogs(logs);
      } catch (e) {
        console.error('Failed to load logs', e);
      }
    }
    loadLogs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
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

  const currentInput = finalTranscript + (interimTranscript ? ` ${interimTranscript}` : '');

  const handleSend = async (queryToSend?: string) => {
    const q = (queryToSend || currentInput).trim();
    if (!q || isLoading) return;

    if (isListening) {
      toggleListening();
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setFinalTranscript('');
    setInterimTranscript('');
    setIsLoading(true);

    try {
      const response = await askQuestion(q);
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.answer,
        relevantDates: response.relevantLogDates || [],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `assistant-err-${Date.now()}`,
        sender: 'assistant',
        text: `I had trouble accessing your health logs: ${err.message || 'Please try again.'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (dateStr: string) => {
    const found = allLogs.find((l) => l.date === dateStr);
    if (found) {
      setSelectedLogPreview(found);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-3 select-none flex flex-col h-[calc(100vh-90px)] safe-dock-pb justify-between">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-2 text-violet-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider font-sans-ui">
          <MessageSquareQuote className="w-4 h-4" />
          <span>Conversational Search</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-editorial font-normal tracking-tight text-stone-900 dark:text-stone-50 mt-0.5">
          Ask Memory
        </h2>
        <p className="text-xs sm:text-sm font-sans-ui text-stone-700 dark:text-stone-300 mt-0.5 font-medium">
          Grounded semantic reflection over all your journaled days.
        </p>
      </div>

      {/* Suggested prompts carousel with edge fade mask */}
      <div className="carousel-mask w-full overflow-hidden mb-2">
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-4 no-scrollbar">
          {SUGGESTED_QUESTIONS.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              className="flex-shrink-0 text-xs font-sans-ui px-3.5 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 text-stone-800 dark:text-stone-200 border border-stone-200/60 dark:border-white/10 shadow-sm transition-all hover:scale-[1.02] font-medium"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Chat scroll area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-2 no-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 sm:p-5 rounded-3xl font-sans-ui text-sm sm:text-base leading-relaxed shadow-md ${
                  isUser
                    ? 'bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-950 rounded-br-none'
                    : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl text-stone-800 dark:text-stone-100 border border-stone-200/60 dark:border-white/10 rounded-bl-none'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1.5 text-violet-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Dayline Memory</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Referenced Date Chips */}
                {msg.relevantDates && msg.relevantDates.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-200/60 dark:border-white/10 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">
                      Sources:
                    </span>
                    {msg.relevantDates.map((dateStr, i) => (
                      <button
                        key={i}
                        onClick={() => handleDateClick(dateStr)}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-violet-500/10 dark:bg-teal-500/15 text-violet-700 dark:text-teal-300 hover:scale-105 transition-all font-semibold"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{dateStr}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-stone-200/60 dark:border-white/10 w-fit text-xs text-stone-600 dark:text-stone-300 font-sans-ui animate-pulse font-medium">
            <Sparkles className="w-4 h-4 text-violet-500 dark:text-teal-400 animate-spin" />
            <span>Consulting semantic vector memories…</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Pill Input Bar placed cleanly above the dock */}
      <div className="relative w-full pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-stone-200/80 dark:border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] transition-all focus-within:ring-2 focus-within:ring-violet-400 dark:focus-within:ring-teal-400"
        >
          {/* Mic button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`flex-shrink-0 p-3 ml-1.5 rounded-full transition-all focus:outline-none ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-md'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10'
            }`}
            aria-label={isListening ? 'Stop recording voice' : 'Speak your question'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={currentInput}
            onChange={(e) => {
              setFinalTranscript(e.target.value);
              setInterimTranscript('');
            }}
            placeholder={
              isListening
                ? 'Listening... ask your question...'
                : 'Ask anything about your health, sleep, or mood…'
            }
            className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 font-sans-ui px-2 py-3"
          />

          <button
            type="submit"
            disabled={!currentInput.trim() || isLoading}
            className="flex-shrink-0 p-2.5 mr-1.5 rounded-full bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-900 disabled:opacity-30 disabled:pointer-events-none hover:scale-105 active:scale-95 transition-all shadow-md focus:outline-none"
            aria-label="Send question"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Required footer disclaimer above dock */}
      <FooterNote />


      {/* Date Inspection Drawer */}
      {selectedLogPreview && (
        <div
          role="dialog"
          aria-labelledby="ask-preview-title"
          className="fixed inset-x-0 bottom-24 z-50 max-w-xl mx-auto px-4 animate-in slide-in-from-bottom-6 duration-200"
        >
          <div className="p-5 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-stone-200/80 dark:border-white/10 shadow-2xl text-stone-900 dark:text-stone-100">
            <div className="flex items-center justify-between mb-2">
              <span id="ask-preview-title" className="text-xs font-semibold text-violet-600 dark:text-teal-400 font-sans-ui uppercase">
                Source Log: {selectedLogPreview.date}
              </span>
              <button
                onClick={() => setSelectedLogPreview(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"
                aria-label="Close log source"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <MetricChips
              sleepHours={selectedLogPreview.sleepHours}
              mood={selectedLogPreview.mood}
              waterLiters={selectedLogPreview.waterLiters}
              exerciseMinutes={selectedLogPreview.exerciseMinutes}
              activityType={selectedLogPreview.activityType}
              symptoms={selectedLogPreview.symptoms}
            />
            <p className="mt-3 text-xs text-stone-600 dark:text-stone-300 italic font-sans-ui bg-stone-50 dark:bg-white/5 p-2.5 rounded-xl border border-stone-200/40 dark:border-white/5">
              "{selectedLogPreview.rawText || selectedLogPreview.note}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

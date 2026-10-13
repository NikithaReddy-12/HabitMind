import React from 'react';
import { ShieldAlert, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-14 mb-20 md:mb-8 pt-8 border-t border-slate-200/60 dark:border-white/5 text-center transition-colors">
      <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-200/60 dark:border-white/10 shadow-xs backdrop-blur-md">
        <ShieldAlert className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 shrink-0" />
        <span>Dayline is for lifestyle tracking, not medical advice.</span>
      </div>
      <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1">
        <span>Powered by Lyzr AI Agent & Qdrant Vector Cloud</span>
      </div>
    </footer>
  );
};

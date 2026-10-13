import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuroraMesh } from './components/AuroraMesh';
import { AuroraHeader } from './components/AuroraHeader';
import { FloatingDock, AuroraRoute } from './components/FloatingDock';
import { TodayPage } from './pages/TodayPage';
import { JourneyPage } from './pages/JourneyPage';
import { PatternsPage } from './pages/PatternsPage';
import { AskPage } from './pages/AskPage';
import { YouPage } from './pages/YouPage';
import { getLogs, getLocalDateString } from './api';
import { HabitLog } from './types';

const MainApp: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<AuroraRoute>('today');
  const [streak, setStreak] = useState(0);
  const { activeAurora } = useTheme();

  // Load streak for header badge
  useEffect(() => {
    async function loadStreak() {
      try {
        const logs = await getLogs(30);
        const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
        let count = 0;
        let checkDate = new Date();

        for (let i = 0; i < 30; i++) {
          const dStr = checkDate.toISOString().split('T')[0];
          const found = sorted.some((l) => l.date === dStr);
          if (found) {
            count++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (i === 0) {
            // Check if logged yesterday
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
        setStreak(count);
      } catch {
        // ignore
      }
    }
    loadStreak();
  }, []);

  const handleLogSaved = (newLog: HabitLog) => {
    if (newLog.date === getLocalDateString()) {
      setStreak((prev) => Math.max(1, prev));
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between selection:bg-violet-500/20 selection:text-violet-700 dark:selection:text-teal-200">
      {/* Dynamic Animated Ambient Mesh */}
      <AuroraMesh aurora={activeAurora} />

      {/* Top Header with Brand and Atmosphere Menu */}
      <AuroraHeader streak={streak} />

      {/* Main Screen Body */}
      <main className="flex-1 w-full flex flex-col justify-start">
        {currentRoute === 'today' && (
          <TodayPage onLogSaved={handleLogSaved} activeAurora={activeAurora} />
        )}
        {currentRoute === 'journey' && <JourneyPage />}
        {currentRoute === 'patterns' && <PatternsPage />}
        {currentRoute === 'ask' && <AskPage />}
        {currentRoute === 'you' && <YouPage />}
      </main>

      {/* macOS-style Centered Bottom Floating Dock */}
      <FloatingDock currentRoute={currentRoute} onRouteChange={setCurrentRoute} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
};

export default App;

import { DailyGoals } from '../types';

const DEFAULT_GOALS: DailyGoals = {
  sleepHours: 8,
  waterLiters: 2.5,
  exerciseMinutes: 30,
};

const GOALS_STORAGE_KEY = 'dayline_goals';

export function getDailyGoals(): DailyGoals {
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sleepHours: typeof parsed.sleepHours === 'number' ? parsed.sleepHours : DEFAULT_GOALS.sleepHours,
        waterLiters: typeof parsed.waterLiters === 'number' ? parsed.waterLiters : DEFAULT_GOALS.waterLiters,
        exerciseMinutes: typeof parsed.exerciseMinutes === 'number' ? parsed.exerciseMinutes : DEFAULT_GOALS.exerciseMinutes,
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_GOALS;
}

export function saveDailyGoals(goals: DailyGoals): void {
  try {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  } catch (err) {
    console.warn('Could not save goals to localStorage:', err);
  }
}

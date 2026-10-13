export interface HabitLog {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  formattedDate: string; // e.g. "Mon, Oct 12"
  timestamp: number;
  note: string;
  sleepHours: number | null; // e.g. 7.5 or null
  mood: number | null; // 1 to 10 or null
  energy?: number | null; // 1 to 10 or null
  waterLiters: number | null; // in liters, e.g. 2.4 or null
  exerciseMinutes: number | null; // in minutes, e.g. 45 or null
  activityType?: string; // e.g. "Morning Run", "Yoga"
  symptoms?: string[];
  rawText?: string;
}

export interface ExtractedHealthData {
  date: string;
  sleep_hours: number | null;
  mood: number | null;
  energy: number | null;
  water_liters: number | null;
  exercise_minutes: number | null;
  exercise_type: string | null;
  symptoms: string[];
  notes: string;
}

export interface CreateLogInput {
  text?: string;
  note?: string;
  sleepHours?: number;
  mood?: number;
  waterLiters?: number;
  exerciseMinutes?: number;
  activityType?: string;
  date?: string;
}

export interface AskResponse {
  id: string;
  question: string;
  answer: string;
  relevantLogDates: string[];
  metricsHighlighted?: {
    label: string;
    value: string;
  }[];
  timestamp: number;
}

export interface MetricChange {
  thisWeek: number | null;
  lastWeek: number | null;
  diff: number | null;
  percentChange: number | null;
}

export interface InsightItem {
  title: string;
  detail: string;
  type: 'positive' | 'warning' | 'neutral';
}

export interface WeeklyInsight {
  summary: string;
  insights: InsightItem[];
  stats: {
    sleep: MetricChange;
    mood: MetricChange;
    water: MetricChange;
    exercise: MetricChange;
  };
  totalLogsCount?: number;
  generatedAt: string;
}

export type TimeRange = 7 | 30 | 90;

export interface DailyGoals {
  sleepHours: number;
  waterLiters: number;
  exerciseMinutes: number;
}

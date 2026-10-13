import { AskResponse, CreateLogInput, HabitLog, WeeklyInsight, ExtractedHealthData } from './types';

const STORAGE_KEY = 'habitmind_logs_v1';
const INSIGHTS_KEY = 'habitmind_insights_v1';

// Pre-seeded initial logs to make the dashboard and queries rich right away
const INITIAL_LOGS: HabitLog[] = [
  {
    id: 'log-1',
    date: '2026-10-12',
    formattedDate: 'Today, Oct 12',
    timestamp: Date.now(),
    note: 'Slept 7.8 hours, woke up feeling refreshed. Drank 2.6L water and completed a 45 min brisk walk through the park.',
    sleepHours: 7.8,
    mood: 8,
    waterLiters: 2.6,
    exerciseMinutes: 45,
    activityType: 'Walking',
  },
  {
    id: 'log-2',
    date: '2026-10-11',
    formattedDate: 'Sun, Oct 11',
    timestamp: Date.now() - 86400000 * 1,
    note: 'Great recovery Sunday. 8.5 hours of sleep, mood 9/10. Drank 2.8L water and enjoyed 30 mins gentle yoga.',
    sleepHours: 8.5,
    mood: 9,
    waterLiters: 2.8,
    exerciseMinutes: 30,
    activityType: 'Yoga',
  },
  {
    id: 'log-3',
    date: '2026-10-10',
    formattedDate: 'Sat, Oct 10',
    timestamp: Date.now() - 86400000 * 2,
    note: 'Late night with friends, slept 6.2 hours. Drank 2.2L of water and did a quick 20 min core workout.',
    sleepHours: 6.2,
    mood: 7,
    waterLiters: 2.2,
    exerciseMinutes: 20,
    activityType: 'Workout',
  },
  {
    id: 'log-4',
    date: '2026-10-09',
    formattedDate: 'Fri, Oct 9',
    timestamp: Date.now() - 86400000 * 3,
    note: 'Slept 7.5 hours. Focused Friday workday. Water was 3.0 liters and went on a 40 min cycling session.',
    sleepHours: 7.5,
    mood: 8,
    waterLiters: 3.0,
    exerciseMinutes: 40,
    activityType: 'Cycling',
  },
  {
    id: 'log-5',
    date: '2026-10-08',
    formattedDate: 'Thu, Oct 8',
    timestamp: Date.now() - 86400000 * 4,
    note: 'Tired morning with 6.8 hours sleep, but mood improved to 7 by afternoon. Drank 2.4L water, 35 min jog.',
    sleepHours: 6.8,
    mood: 7,
    waterLiters: 2.4,
    exerciseMinutes: 35,
    activityType: 'Running',
  },
  {
    id: 'log-6',
    date: '2026-10-07',
    formattedDate: 'Wed, Oct 7',
    timestamp: Date.now() - 86400000 * 5,
    note: 'Deep 8.0 hours sleep. High energy all day, mood 9. Drank 2.7L water and did 50 min gym session.',
    sleepHours: 8.0,
    mood: 9,
    waterLiters: 2.7,
    exerciseMinutes: 50,
    activityType: 'Gym / Weights',
  },
  {
    id: 'log-7',
    date: '2026-10-06',
    formattedDate: 'Tue, Oct 6',
    timestamp: Date.now() - 86400000 * 6,
    note: 'Slept 7.2 hours. Stressful meetings so mood hovered around 6. Hydrated well with 2.5L and did 25 min walk.',
    sleepHours: 7.2,
    mood: 6,
    waterLiters: 2.5,
    exerciseMinutes: 25,
    activityType: 'Walking',
  },
  {
    id: 'log-8',
    date: '2026-10-05',
    formattedDate: 'Mon, Oct 5',
    timestamp: Date.now() - 86400000 * 7,
    note: 'Slept 7.6 hours, mood 8. Kept water bottle filled (2.4L) and did 30 min morning mobility workout.',
    sleepHours: 7.6,
    mood: 8,
    waterLiters: 2.4,
    exerciseMinutes: 30,
    activityType: 'Yoga',
  },
  {
    id: 'log-9',
    date: '2026-10-04',
    formattedDate: 'Sun, Oct 4',
    timestamp: Date.now() - 86400000 * 8,
    note: 'Restful 8.2 hours sleep. Mood 9. Outdoor trail walk for 60 minutes. Drank 3.1 liters of water.',
    sleepHours: 8.2,
    mood: 9,
    waterLiters: 3.1,
    exerciseMinutes: 60,
    activityType: 'Walking',
  },
  {
    id: 'log-10',
    date: '2026-10-03',
    formattedDate: 'Sat, Oct 3',
    timestamp: Date.now() - 86400000 * 9,
    note: 'Slept 7.0 hours, mood 7. Drank 2.1L water and did 45 mins strength workout at home.',
    sleepHours: 7.0,
    mood: 7,
    waterLiters: 2.1,
    exerciseMinutes: 45,
    activityType: 'Gym / Weights',
  },
  {
    id: 'log-11',
    date: '2026-10-02',
    formattedDate: 'Fri, Oct 2',
    timestamp: Date.now() - 86400000 * 10,
    note: 'Slept 6.5 hours. Felt busy at work, mood 6. Water 2.0L, 20 min evening stroll to decompress.',
    sleepHours: 6.5,
    mood: 6,
    waterLiters: 2.0,
    exerciseMinutes: 20,
    activityType: 'Walking',
  },
  {
    id: 'log-12',
    date: '2026-10-01',
    formattedDate: 'Thu, Oct 1',
    timestamp: Date.now() - 86400000 * 11,
    note: 'Solid 7.9 hours sleep, feeling positive (mood 8). 2.8L water and 40 min run.',
    sleepHours: 7.9,
    mood: 8,
    waterLiters: 2.8,
    exerciseMinutes: 40,
    activityType: 'Running',
  },
];

function getStoredLogs(): HabitLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_LOGS;
  } catch {
    return INITIAL_LOGS;
  }
}

function setStoredLogs(logs: HabitLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save logs to storage', e);
  }
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes the streak (consecutive days with a log, ending today).
 * If today has not been logged yet, streak is 0.
 */
export function computeStreak(logs: { date: string }[]): number {
  if (!logs || logs.length === 0) return 0;
  const loggedDates = new Set(logs.map((l) => l.date));
  const todayStr = getLocalDateString(new Date());

  if (!loggedDates.has(todayStr)) {
    return 0;
  }

  let streak = 0;
  const check = new Date();
  while (true) {
    const key = getLocalDateString(check);
    if (loggedDates.has(key)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Computes client averages across non-null habit metrics.
 */
export function computeAverages(logs: HabitLog[]) {
  const validSleep = logs
    .map((l) => l.sleepHours)
    .filter((v): v is number => v !== null && !isNaN(v));
  const validMood = logs
    .map((l) => l.mood)
    .filter((v): v is number => v !== null && !isNaN(v));
  const validWater = logs
    .map((l) => l.waterLiters)
    .filter((v): v is number => v !== null && !isNaN(v));
  const validExercise = logs
    .map((l) => l.exerciseMinutes)
    .filter((v): v is number => v !== null && !isNaN(v));

  return {
    avgSleep: validSleep.length
      ? (validSleep.reduce((a, b) => a + b, 0) / validSleep.length).toFixed(1)
      : null,
    avgMood: validMood.length
      ? (validMood.reduce((a, b) => a + b, 0) / validMood.length).toFixed(1)
      : null,
    avgWater: validWater.length
      ? (validWater.reduce((a, b) => a + b, 0) / validWater.length).toFixed(1)
      : null,
    avgExercise: validExercise.length
      ? Math.round(validExercise.reduce((a, b) => a + b, 0) / validExercise.length)
      : null,
    totalLogs: logs.length,
  };
}

/**
 * Fetch logs by calling GET /api/logs with optional date range.
 * Connects directly to real Qdrant backend data.
 */
export async function getLogs(days?: number, fromDate?: string, toDate?: string): Promise<HabitLog[]> {
  let url = '/api/logs';
  const params = new URLSearchParams();

  if (fromDate && toDate) {
    params.set('from', fromDate);
    params.set('to', toDate);
  } else if (days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    params.set('from', getLocalDateString(start));
    params.set('to', getLocalDateString(end));
  }

  const queryStr = params.toString();
  if (queryStr) {
    url += `?${queryStr}`;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`GET /api/logs failed with status: ${res.status}`);
      return [];
    }

    const payloads: any[] = await res.json();
    if (!Array.isArray(payloads)) return [];

    return payloads.map((item, index) => {
      const dateParts = item.date.split('-');
      let formattedDate = item.date;
      if (dateParts.length === 3) {
        const d = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
        formattedDate = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }

      return {
        id: `log-${item.date}-${item.ts || index}`,
        date: item.date,
        formattedDate,
        timestamp: item.ts ? item.ts * 1000 : new Date(item.date).getTime(),
        note: item.notes || item.raw_text || 'Daily log recorded.',
        sleepHours: item.sleep_hours !== undefined && item.sleep_hours !== null ? Number(item.sleep_hours) : null,
        mood: item.mood !== undefined && item.mood !== null ? Number(item.mood) : null,
        energy: item.energy !== undefined && item.energy !== null ? Number(item.energy) : null,
        waterLiters: item.water_liters !== undefined && item.water_liters !== null ? Number(item.water_liters) : null,
        exerciseMinutes: item.exercise_minutes !== undefined && item.exercise_minutes !== null ? Number(item.exercise_minutes) : null,
        activityType: item.exercise_type || undefined,
        symptoms: item.symptoms || [],
        rawText: item.raw_text,
      };
    });
  } catch (error) {
    console.error('Error in getLogs:', error);
    return [];
  }
}

/**
 * Save a new voice or text habit log by calling POST /api/log.
 * This triggers the Lyzr AI agent for health data extraction
 * and upserts the vector + payload into Qdrant.
 */
export async function saveLog(logData: CreateLogInput): Promise<HabitLog> {
  const textToSend = logData.text || logData.note || '';
  const dateToSend = logData.date;

  let response: Response;
  try {
    response = await fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textToSend,
        date: dateToSend,
      }),
    });
  } catch (netErr: any) {
    throw new Error(`Network error connecting to /api/log: ${netErr.message || 'Server unreachable'}`);
  }

  if (!response.ok) {
    let errorDetail = `Server responded with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.hint) {
        errorDetail = `${errJson.error} (${errJson.hint})`;
      } else if (errJson.error) {
        errorDetail = errJson.error + (errJson.details ? `: ${errJson.details}` : '');
      }
    } catch {
      const errText = await response.text().catch(() => '');
      if (errText) errorDetail = errText;
    }
    throw new Error(errorDetail);
  }

  const extracted: ExtractedHealthData = await response.json();

  const dateStr = extracted.date || dateToSend || getLocalDateString(new Date());
  const dateObj = new Date(dateStr);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : 'Today';

  const newLog: HabitLog = {
    id: `log-${Date.now()}`,
    date: dateStr,
    formattedDate,
    timestamp: Date.now(),
    note: extracted.notes || textToSend,
    sleepHours: extracted.sleep_hours !== null && extracted.sleep_hours !== undefined ? extracted.sleep_hours : null,
    mood: extracted.mood !== null && extracted.mood !== undefined ? extracted.mood : null,
    energy: extracted.energy !== null && extracted.energy !== undefined ? extracted.energy : null,
    waterLiters: extracted.water_liters !== null && extracted.water_liters !== undefined ? extracted.water_liters : null,
    exerciseMinutes: extracted.exercise_minutes !== null && extracted.exercise_minutes !== undefined ? extracted.exercise_minutes : null,
    activityType: extracted.exercise_type || logData.activityType || 'Active Check-in',
    symptoms: extracted.symptoms || [],
    rawText: textToSend,
  };

  return newLog;
}

/**
 * Ask a conversational question against habit logs by calling POST /api/ask.
 * Grounded on real Qdrant vector logs with Lyzr AI agent.
 */
export async function askQuestion(question: string): Promise<AskResponse> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  if (!res.ok) {
    let errMessage = `Error ${res.status} processing question`;
    try {
      const errJson = await res.json();
      if (errJson.hint) {
        errMessage = `${errJson.error} (${errJson.hint})`;
      } else if (errJson.error) {
        errMessage = errJson.error + (errJson.details ? `: ${errJson.details}` : '');
      }
    } catch {
      const txt = await res.text().catch(() => '');
      if (txt) errMessage = txt;
    }
    throw new Error(errMessage);
  }

  const data: { answer: string; sources: { date: string }[] } = await res.json();
  const relevantDates = (data.sources || []).map((s) => s.date).filter(Boolean);

  return {
    id: `ask-${Date.now()}`,
    question,
    answer: data.answer || 'No response returned.',
    relevantLogDates: relevantDates,
    timestamp: Date.now(),
  };
}

/**
 * Generate weekly habit insights by calling GET /api/insights.
 * Computes week-over-week changes and extracts patterns with Lyzr AI agent.
 */
export async function getInsights(): Promise<WeeklyInsight> {
  const res = await fetch('/api/insights');
  if (!res.ok) {
    let errMessage = `Error ${res.status} generating insights`;
    try {
      const errJson = await res.json();
      if (errJson.error) errMessage = errJson.error;
    } catch {
      // ignore
    }
    throw new Error(errMessage);
  }

  const data: WeeklyInsight = await res.json();
  return data;
}

import type { Request, Response } from 'express';
import crypto from 'crypto';

interface HabitLogPayload {
  date: string;
  sleep_hours: number | null;
  mood: number | null;
  energy: number | null;
  water_liters: number | null;
  exercise_minutes: number | null;
  exercise_type: string | null;
  symptoms: string[];
  notes: string;
  raw_text?: string;
  ts: number;
}

interface MetricChange {
  thisWeek: number | null;
  lastWeek: number | null;
  diff: number | null;
  percentChange: number | null;
}

interface InsightItem {
  title: string;
  detail: string;
  type: 'positive' | 'warning' | 'neutral';
}

function mergeLogsForDate(date: string, entries: HabitLogPayload[]): HabitLogPayload {
  if (entries.length === 1) return entries[0];

  const averageNumeric = (field: keyof HabitLogPayload): number | null => {
    const validValues = entries
      .map((e) => e[field])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (validValues.length === 0) return null;
    const sum = validValues.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / validValues.length) * 10) / 10;
  };

  const notesList = entries.map((e) => e.notes?.trim()).filter(Boolean);
  const rawList = entries.map((e) => e.raw_text?.trim()).filter(Boolean);
  const exerciseTypes = Array.from(new Set(entries.map((e) => e.exercise_type?.trim()).filter(Boolean)));
  const allSymptoms = Array.from(new Set(entries.flatMap((e) => e.symptoms || []).filter(Boolean)));
  const ts = Math.max(...entries.map((e) => e.ts || 0));

  return {
    date,
    sleep_hours: averageNumeric('sleep_hours'),
    mood: averageNumeric('mood'),
    energy: averageNumeric('energy'),
    water_liters: averageNumeric('water_liters'),
    exercise_minutes: averageNumeric('exercise_minutes'),
    exercise_type: exerciseTypes.length > 0 ? exerciseTypes.join(', ') : null,
    symptoms: allSymptoms,
    notes: notesList.length > 0 ? notesList.join(' • ') : 'Daily log recorded.',
    raw_text: rawList.length > 0 ? rawList.join('\n') : undefined,
    ts: ts > 0 ? ts : Math.floor(Date.now() / 1000),
  };
}

function computeMetricChange(
  thisWeekItems: HabitLogPayload[],
  lastWeekItems: HabitLogPayload[],
  field: keyof HabitLogPayload
): MetricChange {
  const getAvg = (list: HabitLogPayload[]) => {
    const vals = list
      .map((item) => item[field])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));
    if (vals.length === 0) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  };

  const thisWeekAvg = getAvg(thisWeekItems);
  const lastWeekAvg = getAvg(lastWeekItems);

  if (thisWeekAvg === null && lastWeekAvg === null) {
    return { thisWeek: null, lastWeek: null, diff: null, percentChange: null };
  }

  const diff =
    thisWeekAvg !== null && lastWeekAvg !== null
      ? Math.round((thisWeekAvg - lastWeekAvg) * 10) / 10
      : null;

  let percentChange: number | null = null;
  if (thisWeekAvg !== null && lastWeekAvg !== null && lastWeekAvg > 0) {
    percentChange = Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100);
  }

  return {
    thisWeek: thisWeekAvg,
    lastWeek: lastWeekAvg,
    diff,
    percentChange,
  };
}

/**
 * Strips markdown code fences (```json ... ```) and parses the inner JSON string safely.
 */
function cleanAndParseJSON<T>(rawStr: string, fallback: T): T {
  try {
    let cleaned = rawStr.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');

    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1);
    }
    return JSON.parse(cleaned) as T;
  } catch (err) {
    return fallback;
  }
}

/**
 * Vercel Serverless Function & Express Route Handler
 * GET /api/insights
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const qdrantUrlRaw = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;
    const lyzrApiKey = process.env.LYZR_API_KEY;
    const lyzrAgentId = process.env.LYZR_AGENT_ID;
    const lyzrUserId = process.env.LYZR_USER_ID;

    // 14 days time window: today back to 13 days ago
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 13);
    startDate.setUTCHours(0, 0, 0, 0);

    const fromTs = Math.floor(startDate.getTime() / 1000);
    const toTs = Math.floor(new Date().setUTCHours(23, 59, 59, 999) / 1000);

    let mergedLogs: HabitLogPayload[] = [];

    if (qdrantUrlRaw) {
      const qdrantUrl = qdrantUrlRaw.replace(/\/+$/, '');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (qdrantApiKey) {
        headers['api-key'] = qdrantApiKey;
      }

      const scrollBody = {
        limit: 200,
        with_payload: true,
        with_vector: false,
        filter: {
          must: [
            {
              key: 'ts',
              range: {
                gte: fromTs,
                lte: toTs,
              },
            },
          ],
        },
      };

      try {
        const scrollRes = await fetch(`${qdrantUrl}/collections/habit_logs/points/scroll`, {
          method: 'POST',
          headers,
          body: JSON.stringify(scrollBody),
        });

        if (scrollRes.ok) {
          const scrollData = await scrollRes.json();
          const points: any[] = scrollData?.result?.points || [];
          const rawPayloads: HabitLogPayload[] = points
            .map((p) => p.payload as HabitLogPayload)
            .filter((p): p is HabitLogPayload => !!p && !!p.date);

          // Group and merge by date
          const dateGroups = new Map<string, HabitLogPayload[]>();
          for (const item of rawPayloads) {
            if (!dateGroups.has(item.date)) {
              dateGroups.set(item.date, []);
            }
            dateGroups.get(item.date)!.push(item);
          }

          for (const [date, entries] of dateGroups.entries()) {
            mergedLogs.push(mergeLogsForDate(date, entries));
          }

          mergedLogs.sort((a, b) => a.date.localeCompare(b.date));
        }
      } catch (qdrantErr) {
        console.warn('Qdrant scroll error in insights:', qdrantErr);
      }
    }

    // Split into This Week (last 7 days: day 0 to 6) vs Last Week (prior 7 days: day 7 to 13)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const cutoffDateStr = sevenDaysAgo.toISOString().split('T')[0];

    const thisWeekLogs = mergedLogs.filter((l) => l.date >= cutoffDateStr);
    const lastWeekLogs = mergedLogs.filter((l) => l.date < cutoffDateStr);

    // Compute simple stats on server for sleep, mood, water, exercise
    const stats = {
      sleep: computeMetricChange(thisWeekLogs, lastWeekLogs, 'sleep_hours'),
      mood: computeMetricChange(thisWeekLogs, lastWeekLogs, 'mood'),
      water: computeMetricChange(thisWeekLogs, lastWeekLogs, 'water_liters'),
      exercise: computeMetricChange(thisWeekLogs, lastWeekLogs, 'exercise_minutes'),
    };

    const generatedAt = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // If no logs found or Lyzr is not configured, return supportive default insights
    if (mergedLogs.length === 0 || !lyzrApiKey || !lyzrAgentId || !lyzrUserId) {
      return res.status(200).json({
        summary:
          mergedLogs.length === 0
            ? 'No habit logs were found in the past 14 days. Start recording daily check-ins to receive tailored behavioral patterns!'
            : 'Insights ready. Keep logging consistently each day to build continuous habit correlations.',
        insights: [
          {
            title: 'Consistent Daily Logging',
            detail: 'Logging your health habits right after waking up or before bed creates a reliable baseline for sleep and mood tracking.',
            type: 'positive' as const,
          },
          {
            title: 'Hydration & Daytime Energy',
            detail: 'Tracking your water intake helps identify whether midday sluggishness is linked to mild dehydration.',
            type: 'neutral' as const,
          },
          {
            title: 'Active Movement Momentum',
            detail: 'Even 20–30 minutes of gentle physical activity or walking can positively influence your evening sleep quality.',
            type: 'positive' as const,
          },
        ],
        stats,
        totalLogsCount: mergedLogs.length,
        generatedAt,
      });
    }

    // Prepare data payload for Lyzr agent
    const dataPayload = {
      week_over_week_stats: stats,
      total_days_logged: mergedLogs.length,
      recent_daily_logs: mergedLogs.map((l) => ({
        date: l.date,
        sleep_hours: l.sleep_hours,
        mood: l.mood,
        water_liters: l.water_liters,
        exercise_minutes: l.exercise_minutes,
        exercise_type: l.exercise_type,
        notes: l.notes,
      })),
    };

    const message = `Return ONLY JSON: {summary: string, insights: [{title, detail, type: 'positive'|'warning'|'neutral'}]}. Find 3 to 5 patterns, such as the link between sleep and mood, and week-over-week changes. Be supportive, not diagnostic. Data: ${JSON.stringify(
      dataPayload
    )}`;

    const lyzrRes = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': lyzrApiKey,
      },
      body: JSON.stringify({
        user_id: lyzrUserId,
        agent_id: lyzrAgentId,
        session_id: crypto.randomUUID(),
        message,
      }),
    });

    if (!lyzrRes.ok) {
      const errText = await lyzrRes.text();
      throw new Error(`Lyzr API error (${lyzrRes.status}): ${errText}`);
    }

    const lyzrData = await lyzrRes.json();
    let contentToParse = '';
    if (typeof lyzrData === 'string') contentToParse = lyzrData;
    else if (lyzrData && typeof lyzrData.response === 'string') contentToParse = lyzrData.response;
    else if (lyzrData && typeof lyzrData.message === 'string') contentToParse = lyzrData.message;
    else if (lyzrData && typeof lyzrData.output === 'string') contentToParse = lyzrData.output;
    else if (lyzrData && typeof lyzrData.response === 'object') contentToParse = JSON.stringify(lyzrData.response);
    else contentToParse = JSON.stringify(lyzrData);

    const fallbackResponse = {
      summary: 'Your habit rhythm over the last 14 days shows solid engagement and healthy self-reflection.',
      insights: [
        {
          title: 'Sleep and Daytime Well-being',
          detail: 'Days with sufficient sleep duration consistently correlate with higher mood and energy scores.',
          type: 'positive' as const,
        },
        {
          title: 'Hydration Target Balance',
          detail: 'Maintaining consistent water intake supports sustained mental clarity throughout the week.',
          type: 'neutral' as const,
        },
      ],
    };

    const parsed = cleanAndParseJSON<{ summary: string; insights: InsightItem[] }>(
      contentToParse,
      fallbackResponse
    );

    return res.status(200).json({
      summary: parsed.summary || fallbackResponse.summary,
      insights: Array.isArray(parsed.insights) && parsed.insights.length > 0 ? parsed.insights : fallbackResponse.insights,
      stats,
      totalLogsCount: mergedLogs.length,
      generatedAt,
    });
  } catch (error: any) {
    console.error('Error generating insights in /api/insights:', error);
    return res.status(500).json({
      error: 'Failed to generate weekly insights.',
      details: error.message || String(error),
    });
  }
}

import type { Request, Response } from 'express';

export interface HabitLogPayload {
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

/**
 * Merges multiple log entries that belong to the same calendar date.
 * - Averages numeric fields across non-null entries
 * - Concatenates notes and raw_text
 * - Combines exercise types and symptoms
 */
function mergeLogsForDate(date: string, entries: HabitLogPayload[]): HabitLogPayload {
  if (entries.length === 1) {
    return entries[0];
  }

  const averageNumeric = (field: keyof HabitLogPayload): number | null => {
    const validValues = entries
      .map((e) => e[field])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    if (validValues.length === 0) return null;
    const sum = validValues.reduce((acc, curr) => acc + curr, 0);
    return Math.round((sum / validValues.length) * 10) / 10;
  };

  // Concatenate notes
  const notesList = entries
    .map((e) => e.notes?.trim())
    .filter(Boolean);
  const mergedNotes = notesList.length > 0 ? notesList.join(' • ') : 'Daily log recorded.';

  // Concatenate raw text
  const rawList = entries
    .map((e) => e.raw_text?.trim())
    .filter(Boolean);
  const mergedRaw = rawList.length > 0 ? rawList.join('\n') : undefined;

  // Combine exercise types
  const exerciseTypes = Array.from(
    new Set(entries.map((e) => e.exercise_type?.trim()).filter(Boolean))
  );
  const mergedExerciseType = exerciseTypes.length > 0 ? exerciseTypes.join(', ') : null;

  // Deduplicate symptoms
  const allSymptoms = Array.from(
    new Set(entries.flatMap((e) => e.symptoms || []).filter(Boolean))
  );

  // Latest ts or earliest ts
  const ts = Math.max(...entries.map((e) => e.ts || 0));

  return {
    date,
    sleep_hours: averageNumeric('sleep_hours'),
    mood: averageNumeric('mood'),
    energy: averageNumeric('energy'),
    water_liters: averageNumeric('water_liters'),
    exercise_minutes: averageNumeric('exercise_minutes'),
    exercise_type: mergedExerciseType,
    symptoms: allSymptoms,
    notes: mergedNotes,
    raw_text: mergedRaw,
    ts: ts > 0 ? ts : Math.floor(Date.now() / 1000),
  };
}

/**
 * Vercel Serverless Function & Express Route Handler
 * GET /api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const qdrantUrlRaw = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    // If Qdrant is not yet configured, return empty list gracefully so frontend displays empty state
    if (!qdrantUrlRaw) {
      return res.status(200).json([]);
    }

    const qdrantUrl = qdrantUrlRaw.replace(/\/+$/, '');
    const { from, to } = req.query as { from?: string; to?: string };

    // Build filter for 'ts' range if from/to provided
    const mustFilters: any[] = [];

    if (from && typeof from === 'string') {
      const fromDate = new Date(`${from}T00:00:00Z`);
      if (!isNaN(fromDate.getTime())) {
        mustFilters.push({
          key: 'ts',
          range: {
            gte: Math.floor(fromDate.getTime() / 1000),
          },
        });
      }
    }

    if (to && typeof to === 'string') {
      const toDate = new Date(`${to}T23:59:59Z`);
      if (!isNaN(toDate.getTime())) {
        mustFilters.push({
          key: 'ts',
          range: {
            lte: Math.floor(toDate.getTime() / 1000),
          },
        });
      }
    }

    const scrollBody: any = {
      limit: 200,
      with_payload: true,
      with_vector: false,
    };

    if (mustFilters.length > 0) {
      scrollBody.filter = {
        must: mustFilters,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (qdrantApiKey) {
      headers['api-key'] = qdrantApiKey;
    }

    const scrollRes = await fetch(`${qdrantUrl}/collections/habit_logs/points/scroll`, {
      method: 'POST',
      headers,
      body: JSON.stringify(scrollBody),
    });

    // If collection does not exist yet (404), return empty array
    if (scrollRes.status === 404) {
      return res.status(200).json([]);
    }

    if (!scrollRes.ok) {
      const errText = await scrollRes.text();
      console.warn(`Qdrant scroll error (${scrollRes.status}):`, errText);
      // Return empty array on initial empty collection states or error
      return res.status(200).json([]);
    }

    const scrollData = await scrollRes.json();
    const points: any[] = scrollData?.result?.points || [];

    // Extract payloads
    const rawPayloads: HabitLogPayload[] = points
      .map((p) => p.payload as HabitLogPayload)
      .filter((p): p is HabitLogPayload => !!p && !!p.date);

    // Group by date
    const dateGroups = new Map<string, HabitLogPayload[]>();
    for (const item of rawPayloads) {
      const dateKey = item.date;
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(item);
    }

    // Merge multiple logs for the same date
    const mergedList: HabitLogPayload[] = [];
    for (const [date, entries] of dateGroups.entries()) {
      mergedList.push(mergeLogsForDate(date, entries));
    }

    // Sort by date ascending (YYYY-MM-DD comparison)
    mergedList.sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json(mergedList);
  } catch (error: any) {
    console.error('Error fetching logs in /api/logs:', error);
    // Return empty list so client can display friendly empty state
    return res.status(200).json([]);
  }
}

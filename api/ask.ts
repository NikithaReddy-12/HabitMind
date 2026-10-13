import type { Request, Response } from 'express';
import crypto from 'crypto';

interface DateRangeResult {
  from: string | null;
  to: string | null;
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
 * Helper to call Lyzr agent inference
 */
async function callLyzrAgent(
  apiKey: string,
  userId: string,
  agentId: string,
  message: string
): Promise<string> {
  const res = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      user_id: userId,
      agent_id: agentId,
      session_id: crypto.randomUUID(),
      message,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Lyzr API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (typeof data === 'string') return data;
  if (data && typeof data.response === 'string') return data.response;
  if (data && typeof data.message === 'string') return data.message;
  if (data && typeof data.output === 'string') return data.output;
  if (data && typeof data.response === 'object') return JSON.stringify(data.response);
  return JSON.stringify(data);
}

/**
 * Vercel Serverless Function & Express Route Handler
 * POST /api/ask
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { question } = req.body || {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'question' in request body." });
    }

    const trimmedQuestion = question.trim();

    // Verify required environment variables
    const lyzrApiKey = process.env.LYZR_API_KEY;
    const lyzrAgentId = process.env.LYZR_AGENT_ID;
    const lyzrUserId = process.env.LYZR_USER_ID;
    const qdrantUrlRaw = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;

    const missingVars: string[] = [];
    if (!lyzrApiKey) missingVars.push('LYZR_API_KEY');
    if (!lyzrAgentId) missingVars.push('LYZR_AGENT_ID');
    if (!lyzrUserId) missingVars.push('LYZR_USER_ID');
    if (!qdrantUrlRaw) missingVars.push('QDRANT_URL');

    if (missingVars.length > 0) {
      return res.status(500).json({
        error: `Missing required environment variables: ${missingVars.join(', ')}`,
        hint: 'Please configure these secrets in your environment or .env file.',
      });
    }

    const qdrantUrl = qdrantUrlRaw!.replace(/\/+$/, '');
    const today = new Date().toISOString().split('T')[0];

    // Step 1: Call Lyzr agent to extract date range from question
    const dateExtractionPrompt = `Today is ${today}. From this question, return ONLY JSON: {from: 'YYYY-MM-DD'|null, to: 'YYYY-MM-DD'|null} for any time range mentioned (e.g. 'last week'). Question: ${trimmedQuestion}`;

    let dateRange: DateRangeResult = { from: null, to: null };
    try {
      const dateLyzrOutput = await callLyzrAgent(
        lyzrApiKey!,
        lyzrUserId!,
        lyzrAgentId!,
        dateExtractionPrompt
      );
      dateRange = cleanAndParseJSON<DateRangeResult>(dateLyzrOutput, { from: null, to: null });
    } catch (dateErr) {
      console.warn('Date extraction note:', dateErr);
    }

    // Step 2: Search Qdrant using Cloud Inference vector query
    const mustFilters: any[] = [];
    if (dateRange.from && typeof dateRange.from === 'string') {
      const fromDate = new Date(`${dateRange.from}T00:00:00Z`);
      if (!isNaN(fromDate.getTime())) {
        mustFilters.push({
          key: 'ts',
          range: { gte: Math.floor(fromDate.getTime() / 1000) },
        });
      }
    }
    if (dateRange.to && typeof dateRange.to === 'string') {
      const toDate = new Date(`${dateRange.to}T23:59:59Z`);
      if (!isNaN(toDate.getTime())) {
        mustFilters.push({
          key: 'ts',
          range: { lte: Math.floor(toDate.getTime() / 1000) },
        });
      }
    }

    const queryBody: any = {
      query: {
        text: trimmedQuestion,
        model: 'sentence-transformers/all-minilm-l6-v2',
      },
      limit: 8,
      with_payload: true,
    };

    if (mustFilters.length > 0) {
      queryBody.filter = {
        must: mustFilters,
      };
    }

    const qdrantHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (qdrantApiKey) {
      qdrantHeaders['api-key'] = qdrantApiKey;
    }

    let points: any[] = [];
    try {
      const qdrantRes = await fetch(`${qdrantUrl}/collections/habit_logs/points/query`, {
        method: 'POST',
        headers: qdrantHeaders,
        body: JSON.stringify(queryBody),
      });

      if (qdrantRes.ok) {
        const queryData = await qdrantRes.json();
        points = Array.isArray(queryData?.result)
          ? queryData.result
          : queryData?.result?.points || [];
      } else {
        const errText = await qdrantRes.text();
        console.warn(`Qdrant query note (${qdrantRes.status}):`, errText);
      }
    } catch (qdrantErr) {
      console.warn('Qdrant search error:', qdrantErr);
    }

    // Step 3: Build a context string from the results sorted by date
    // Sort points by date ascending
    const sortedPoints = [...points].sort((a, b) => {
      const dateA = a.payload?.date || '';
      const dateB = b.payload?.date || '';
      return dateA.localeCompare(dateB);
    });

    const contextLines = sortedPoints.map((p) => {
      const pl = p.payload || {};
      const metricsList = [
        pl.sleep_hours !== null && pl.sleep_hours !== undefined ? `Sleep: ${pl.sleep_hours} hrs` : null,
        pl.mood !== null && pl.mood !== undefined ? `Mood: ${pl.mood}/10` : null,
        pl.energy !== null && pl.energy !== undefined ? `Energy: ${pl.energy}/10` : null,
        pl.water_liters !== null && pl.water_liters !== undefined ? `Water: ${pl.water_liters}L` : null,
        pl.exercise_minutes !== null && pl.exercise_minutes !== undefined
          ? `Exercise: ${pl.exercise_minutes} mins${pl.exercise_type ? ` (${pl.exercise_type})` : ''}`
          : null,
        pl.symptoms && pl.symptoms.length ? `Symptoms: ${pl.symptoms.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(', ');

      return `Date: ${pl.date}\nMetrics: ${metricsList || 'None'}\nNotes: ${pl.notes || ''}\nRaw: ${pl.raw_text || ''}`;
    });

    const context = contextLines.length > 0 ? contextLines.join('\n---\n') : 'No matching habit logs found.';

    // Extract unique source dates
    const uniqueDates = Array.from(
      new Set(sortedPoints.map((p) => p.payload?.date).filter((d): d is string => Boolean(d)))
    );
    const sources = uniqueDates.map((date) => ({ date }));

    // Step 4: Call Lyzr again to generate the answer grounded on the logs
    const answerPrompt = `Answer the question using ONLY these health logs. Be concise and specific, mention dates, and never give medical diagnoses. If the logs don't contain the answer, say so. Logs: ${context} Question: ${trimmedQuestion}`;

    const rawAnswer = await callLyzrAgent(
      lyzrApiKey!,
      lyzrUserId!,
      lyzrAgentId!,
      answerPrompt
    );

    // Clean any leading/trailing quotes or backticks
    let finalAnswer = rawAnswer.trim();
    if (finalAnswer.startsWith('"') && finalAnswer.endsWith('"') && finalAnswer.length > 2) {
      finalAnswer = finalAnswer.slice(1, -1);
    }

    // Step 5: Return { answer, sources: [{date}] }
    return res.status(200).json({
      answer: finalAnswer,
      sources,
    });
  } catch (error: any) {
    console.error('Error in /api/ask handler:', error);
    return res.status(500).json({
      error: 'Failed to process question with Lyzr and Qdrant.',
      details: error.message || String(error),
    });
  }
}

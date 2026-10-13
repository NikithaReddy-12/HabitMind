import type { Request, Response } from 'express';
import crypto from 'crypto';

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

/**
 * Strips markdown code blocks (```json ... ```) and parses the inner JSON string safely.
 */
function cleanAndParseJSON(rawStr: string): ExtractedHealthData {
  let cleaned = rawStr.trim();

  // Strip markdown code fences if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');

  // Extract from the first '{' to the last '}'
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  const parsed = JSON.parse(cleaned);

  // Normalize fields to ensure contract
  return {
    date: typeof parsed.date === 'string' && parsed.date ? parsed.date : new Date().toISOString().split('T')[0],
    sleep_hours: parsed.sleep_hours !== undefined && parsed.sleep_hours !== null ? Number(parsed.sleep_hours) : null,
    mood: parsed.mood !== undefined && parsed.mood !== null ? Number(parsed.mood) : null,
    energy: parsed.energy !== undefined && parsed.energy !== null ? Number(parsed.energy) : null,
    water_liters: parsed.water_liters !== undefined && parsed.water_liters !== null ? Number(parsed.water_liters) : null,
    exercise_minutes: parsed.exercise_minutes !== undefined && parsed.exercise_minutes !== null ? Number(parsed.exercise_minutes) : null,
    exercise_type: typeof parsed.exercise_type === 'string' ? parsed.exercise_type : null,
    symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms.map(String) : [],
    notes: typeof parsed.notes === 'string' ? parsed.notes : 'Daily habit log recorded.',
  };
}

/**
 * Ensures Qdrant collection 'habit_logs' exists with cosine distance and size 384.
 * Creates payload indexes for 'date' (keyword) and 'ts' (integer) if creating the collection.
 */
async function ensureQdrantCollection(qdrantUrl: string, apiKey?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['api-key'] = apiKey;
  }

  const collectionUrl = `${qdrantUrl}/collections/habit_logs`;

  // Check if collection exists
  const checkRes = await fetch(collectionUrl, {
    method: 'GET',
    headers,
  });

  if (checkRes.status === 404 || !checkRes.ok) {
    // Create collection
    const createRes = await fetch(collectionUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        vectors: {
          size: 384,
          distance: 'Cosine',
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create Qdrant collection 'habit_logs': ${createRes.status} ${errText}`);
    }

    // Create payload index for 'date' (keyword)
    await fetch(`${collectionUrl}/index`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        field_name: 'date',
        field_schema: 'keyword',
      }),
    });

    // Create payload index for 'ts' (integer)
    await fetch(`${collectionUrl}/index`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        field_name: 'ts',
        field_schema: 'integer',
      }),
    });
  }
}

/**
 * Upserts a point into Qdrant using Cloud Inference vectorization.
 */
async function upsertQdrantPoint(
  qdrantUrl: string,
  apiKey: string | undefined,
  rawText: string,
  extracted: ExtractedHealthData
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['api-key'] = apiKey;
  }

  // Calculate unix timestamp in seconds for the date
  let tsSeconds = Math.floor(Date.now() / 1000);
  if (extracted.date) {
    const parsedDate = new Date(extracted.date);
    if (!isNaN(parsedDate.getTime())) {
      tsSeconds = Math.floor(parsedDate.getTime() / 1000);
    }
  }

  const pointId = crypto.randomUUID();
  const upsertUrl = `${qdrantUrl}/collections/habit_logs/points?wait=true`;

  const pointPayload = {
    ...extracted,
    raw_text: rawText,
    ts: tsSeconds,
  };

  const body = {
    points: [
      {
        id: pointId,
        vector: {
          text: rawText,
          model: 'sentence-transformers/all-minilm-l6-v2',
        },
        payload: pointPayload,
      },
    ],
  };

  const res = await fetch(upsertUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upsert point into Qdrant: ${res.status} ${errorText}`);
  }

  return await res.json();
}

/**
 * Core processing function: calls Lyzr agent to extract structured health data,
 * ensures Qdrant collection exists, and upserts point with cloud inference vector.
 */
export async function processLogAndSaveToQdrant(
  rawText: string,
  date?: string
): Promise<ExtractedHealthData> {
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
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const qdrantUrl = qdrantUrlRaw!.replace(/\/+$/, '');
  const todayStr = date || new Date().toISOString().split('T')[0];

  // Step 1: Call Lyzr agent
  const promptMessage = `Today's date is ${todayStr}. Extract health data from this daily log. Return ONLY valid JSON, no markdown: {date: 'YYYY-MM-DD' (resolve words like 'yesterday', default today), sleep_hours: number|null, mood: number 1-10|null, energy: number 1-10|null, water_liters: number|null, exercise_minutes: number|null, exercise_type: string|null, symptoms: string[], notes: string (one sentence)}. Log: ${rawText}`;

  const lyzrResponse = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': lyzrApiKey!,
    },
    body: JSON.stringify({
      user_id: lyzrUserId!,
      agent_id: lyzrAgentId!,
      session_id: crypto.randomUUID(),
      message: promptMessage,
    }),
  });

  if (!lyzrResponse.ok) {
    const errBody = await lyzrResponse.text();
    throw new Error(`Lyzr API error (${lyzrResponse.status}): ${errBody}`);
  }

  const lyzrData = await lyzrResponse.json();

  let contentToParse = '';
  if (typeof lyzrData === 'string') {
    contentToParse = lyzrData;
  } else if (lyzrData && typeof lyzrData.response === 'string') {
    contentToParse = lyzrData.response;
  } else if (lyzrData && typeof lyzrData.message === 'string') {
    contentToParse = lyzrData.message;
  } else if (lyzrData && typeof lyzrData.output === 'string') {
    contentToParse = lyzrData.output;
  } else if (lyzrData && typeof lyzrData.response === 'object') {
    contentToParse = JSON.stringify(lyzrData.response);
  } else {
    contentToParse = JSON.stringify(lyzrData);
  }

  const extracted = cleanAndParseJSON(contentToParse);

  // Step 2: Ensure Qdrant collection 'habit_logs' exists with payload indexes
  await ensureQdrantCollection(qdrantUrl, qdrantApiKey);

  // Step 3: Upsert point to Qdrant via REST with cloud inference vector
  await upsertQdrantPoint(qdrantUrl, qdrantApiKey, rawText, extracted);

  return extracted;
}

/**
 * Vercel Serverless Function & Express Route Handler
 * POST /api/log
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { text, date } = req.body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'text' in request body." });
    }

    const rawText = text.trim();
    const extracted = await processLogAndSaveToQdrant(rawText, date);

    return res.status(200).json(extracted);
  } catch (error: any) {
    console.error('Error processing log in /api/log:', error);
    return res.status(500).json({
      error: 'Error while processing daily log.',
      details: error.message || String(error),
    });
  }
}

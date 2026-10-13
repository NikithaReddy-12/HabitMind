import type { Request, Response } from 'express';
import { processLogAndSaveToQdrant } from './log';

/**
 * Extracts full transcript text from various Omi webhook payload structures:
 * - Direct "transcript" string
 * - Direct "text" string
 * - "segments" array by joining segment texts
 * - "transcript_segments" array
 * - Memory object containing transcript or segments
 */
export function extractTranscriptFromPayload(body: any): string {
  if (!body) return '';

  // 1. Direct transcript string
  if (typeof body.transcript === 'string' && body.transcript.trim()) {
    return body.transcript.trim();
  }

  // 2. Direct text string
  if (typeof body.text === 'string' && body.text.trim()) {
    return body.text.trim();
  }

  // 3. Segments array (body.segments or body.transcript_segments)
  const segments =
    (Array.isArray(body.segments) && body.segments) ||
    (Array.isArray(body.transcript_segments) && body.transcript_segments) ||
    (body.memory && Array.isArray(body.memory.transcript_segments) && body.memory.transcript_segments) ||
    (body.memory && Array.isArray(body.memory.segments) && body.memory.segments);

  if (segments && segments.length > 0) {
    const textPieces = segments
      .map((seg: any) => {
        if (typeof seg === 'string') return seg.trim();
        if (seg && typeof seg.text === 'string') return seg.text.trim();
        if (seg && typeof seg.content === 'string') return seg.content.trim();
        return '';
      })
      .filter(Boolean);

    if (textPieces.length > 0) {
      return textPieces.join(' ');
    }
  }

  // 4. Nested memory transcript string
  if (body.memory && typeof body.memory.transcript === 'string' && body.memory.transcript.trim()) {
    return body.memory.transcript.trim();
  }

  return '';
}

/**
 * Vercel Serverless Function & Express Route Handler
 * POST /api/omi-webhook
 * Public webhook endpoint for Omi wearable transcripts.
 */
export default async function handler(req: Request, res: Response) {
  // Allow HEAD or GET for quick endpoint verification
  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.status(200).json({
      status: 'active',
      service: 'HabitMind Omi Webhook',
      endpoint: '/api/omi-webhook',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    const transcriptText = extractTranscriptFromPayload(body);

    // Ignore empty transcripts
    if (!transcriptText || !transcriptText.trim()) {
      return res.status(200).json({
        status: 'ignored',
        message: 'No transcript text found in webhook payload. Ignored.',
      });
    }

    // Reuse the exact same extraction and Qdrant upsert logic as /api/log
    const extractedData = await processLogAndSaveToQdrant(transcriptText);

    // Return 200 OK
    return res.status(200).json({
      status: 'success',
      message: 'Omi transcript processed and saved to Qdrant.',
      data: extractedData,
    });
  } catch (error: any) {
    console.error('Error handling Omi webhook:', error);
    // Return 200 or 500 with descriptive error
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to process Omi transcript webhook.',
    });
  }
}

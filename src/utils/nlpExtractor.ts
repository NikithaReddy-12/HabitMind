export interface ExtractedHabitData {
  sleepHours?: number;
  mood?: number;
  waterLiters?: number;
  exerciseMinutes?: number;
  activityType?: string;
}

export function extractHabitDataFromText(text: string): ExtractedHabitData {
  const lower = text.toLowerCase();
  const result: ExtractedHabitData = {};

  // 1. Sleep: e.g. "slept 7.5 hours", "8 hrs of sleep", "sleep: 7", "6h sleep"
  const sleepMatch =
    lower.match(/(?:slept|sleep(?:ing)?|rested)\s*(?:for|around|about)?\s*(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)?/i) ||
    lower.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)\s*(?:of)?\s*(?:sleep|rest)/i);
  if (sleepMatch && sleepMatch[1]) {
    const val = parseFloat(sleepMatch[1]);
    if (val >= 0 && val <= 24) {
      result.sleepHours = val;
    }
  }

  // 2. Mood: e.g. "mood 8", "mood was 9/10", "feeling like an 8", "mood of 7"
  const moodMatch =
    lower.match(/mood\s*(?:is|was|feels like|at)?\s*(?:a|an)?\s*(\d+(?:\.\d+)?)(?:\/10|\s*out of 10)?/i) ||
    lower.match(/(?:feeling|felt)\s*(?:like\s*(?:a|an)?)?\s*(\d+)(?:\/10|\s*out of 10)/i) ||
    lower.match(/(\d+)\s*(?:\/10|out of 10)\s*mood/i);
  if (moodMatch && moodMatch[1]) {
    const val = Math.round(parseFloat(moodMatch[1]));
    if (val >= 1 && val <= 10) {
      result.mood = val;
    }
  } else {
    // Keyword sentiment indicators if numeric not found
    if (lower.includes('feeling great') || lower.includes('fantastic') || lower.includes('energetic') || lower.includes('amazing day')) {
      result.mood = 9;
    } else if (lower.includes('feeling good') || lower.includes('happy') || lower.includes('productive') || lower.includes('calm')) {
      result.mood = 8;
    } else if (lower.includes('feeling okay') || lower.includes('neutral') || lower.includes('average day')) {
      result.mood = 6;
    } else if (lower.includes('feeling tired') || lower.includes('exhausted') || lower.includes('stressed') || lower.includes('low energy')) {
      result.mood = 4;
    }
  }

  // 3. Water: e.g. "drank 2.5 liters", "3 litres of water", "water 2L", "8 glasses of water" (~2L)
  const waterLitersMatch =
    lower.match(/(?:drank|drink|hydrated|water)\s*(?:about|around)?\s*(\d+(?:\.\d+)?)\s*(?:liters|litres|liter|litre|l\b)/i) ||
    lower.match(/(\d+(?:\.\d+)?)\s*(?:liters|litres|liter|litre|l)\s*(?:of)?\s*water/i);
  if (waterLitersMatch && waterLitersMatch[1]) {
    const val = parseFloat(waterLitersMatch[1]);
    if (val >= 0 && val <= 10) {
      result.waterLiters = val;
    }
  } else {
    // Glasses check: 1 glass approx 0.25 L
    const glassMatch = lower.match(/(\d+)\s*(?:glasses|cups|bottles)\s*(?:of)?\s*water/i);
    if (glassMatch && glassMatch[1]) {
      const glasses = parseInt(glassMatch[1], 10);
      result.waterLiters = Math.min(8, Math.round((glasses * 0.3) * 10) / 10);
    }
  }

  // 4. Exercise: e.g. "walked 45 mins", "exercised 30 minutes", "ran for 40 min", "workout 50 minutes"
  const exerciseMatch =
    lower.match(/(?:worked out|workout|exercised|ran|run|jogged|walked|gym|yoga|cycling|biked|trained|lifted)\s*(?:for|about|around)?\s*(\d+)\s*(?:mins|min|minutes|minute)/i) ||
    lower.match(/(\d+)\s*(?:mins|min|minutes|minute)\s*(?:of)?\s*(?:workout|exercise|running|walking|gym|yoga|cycling|cardio)/i);
  if (exerciseMatch && exerciseMatch[1]) {
    const val = parseInt(exerciseMatch[1], 10);
    if (val >= 0 && val <= 360) {
      result.exerciseMinutes = val;
    }
  } else if (lower.match(/(?:1|one)\s*hour\s*(?:of)?\s*(?:workout|exercise|gym|run|yoga)/i)) {
    result.exerciseMinutes = 60;
  }

  // Activity type detection
  if (lower.includes('yoga') || lower.includes('stretching')) {
    result.activityType = 'Yoga';
  } else if (lower.includes('running') || lower.includes('ran') || lower.includes('jog')) {
    result.activityType = 'Running';
  } else if (lower.includes('walking') || lower.includes('walk')) {
    result.activityType = 'Walking';
  } else if (lower.includes('gym') || lower.includes('lift') || lower.includes('weights')) {
    result.activityType = 'Gym / Weights';
  } else if (lower.includes('cycling') || lower.includes('biked') || lower.includes('bike')) {
    result.activityType = 'Cycling';
  } else if (lower.includes('swim') || lower.includes('swimming')) {
    result.activityType = 'Swimming';
  } else if (result.exerciseMinutes && result.exerciseMinutes > 0) {
    result.activityType = 'Workout';
  }

  return result;
}

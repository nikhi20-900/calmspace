import { RiskRoute } from '../types';

export interface MoodTrendInputItem {
  day?: string | null;
  mood?: number | null;
  route?: RiskRoute;
}

export interface DailyMoodPoint {
  day: string;
  mood: number;
  count: number;
}

/**
 * Aggregates check-in mood entries by their existing `day` key, preserving
 * chronological order and computing the daily average mood (rounded to 1 decimal).
 * Invalid or missing entries are safely skipped.
 */
export function aggregateDailyMoodTrend(
  moodTrend: readonly MoodTrendInputItem[] | null | undefined
): DailyMoodPoint[] {
  if (!Array.isArray(moodTrend) || moodTrend.length === 0) {
    return [];
  }

  const dailyBuckets = new Map<string, { sum: number; count: number }>();

  for (const entry of moodTrend) {
    if (!entry || typeof entry.day !== 'string') {
      continue;
    }
    const dayKey = entry.day.trim();
    if (!dayKey) {
      continue;
    }
    if (typeof entry.mood !== 'number' || !Number.isFinite(entry.mood)) {
      continue;
    }

    const existing = dailyBuckets.get(dayKey);
    if (existing) {
      existing.sum += entry.mood;
      existing.count += 1;
    } else {
      dailyBuckets.set(dayKey, { sum: entry.mood, count: 1 });
    }
  }

  const result: DailyMoodPoint[] = [];
  for (const [day, { sum, count }] of dailyBuckets.entries()) {
    const average = Math.round((sum / count) * 10) / 10;
    result.push({ day, mood: average, count });
  }

  return result;
}

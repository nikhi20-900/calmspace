export const WELLNESS_STORAGE_KEYS = {
  HIGHLIGHTS_READ: 'calmspace_daily_highlights_read_v1',
  EXPLORE_LIKES: 'calmspace_explore_likes_v1',
  EXPLORE_BOOKMARKS: 'calmspace_explore_bookmarks_v1',
  CHALLENGES_STATE: 'calmspace_daily_challenges_v1',
  SOUND_FAVOURITES: 'calmspace_sound_favourites_v1',
  SOUND_VOLUME: 'calmspace_sound_volume_v1',
  BREATHING_STATS: 'calmspace_breathing_stats_v1',
} as const;

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentWeekDateKeys(referenceDate: Date = new Date()): string[] {
  const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  // Start week on Monday (0 = Sun -> 6, 1 = Mon -> 0, ...)
  const dayOfWeek = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayOfWeek);

  const keys: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    keys.push(getLocalDateKey(cur));
  }
  return keys;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota / private-mode errors safely
  }
}

// ---------------------------------------------------------------------------
// Feature 1: Daily Highlights (auto-resets when local date changes)
// ---------------------------------------------------------------------------
interface StoredHighlightsRead {
  date: string;
  readIds: string[];
}

export function loadReadHighlightIds(dateKey: string = getLocalDateKey()): string[] {
  const stored = readJson<StoredHighlightsRead | null>(WELLNESS_STORAGE_KEYS.HIGHLIGHTS_READ, null);
  if (!stored || stored.date !== dateKey || !Array.isArray(stored.readIds)) {
    return [];
  }
  return stored.readIds.filter((id) => typeof id === 'string');
}

export function saveReadHighlightIds(readIds: string[], dateKey: string = getLocalDateKey()): void {
  const unique = Array.from(new Set(readIds));
  writeJson(WELLNESS_STORAGE_KEYS.HIGHLIGHTS_READ, { date: dateKey, readIds: unique });
}

// ---------------------------------------------------------------------------
// Feature 3: Explore & Relax (Likes & Bookmarks)
// ---------------------------------------------------------------------------
export function loadExploreLikes(): string[] {
  const raw = readJson<unknown>(WELLNESS_STORAGE_KEYS.EXPLORE_LIKES, []);
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
}

export function saveExploreLikes(ids: string[]): void {
  writeJson(WELLNESS_STORAGE_KEYS.EXPLORE_LIKES, Array.from(new Set(ids)));
}

export function loadExploreBookmarks(): string[] {
  const raw = readJson<unknown>(WELLNESS_STORAGE_KEYS.EXPLORE_BOOKMARKS, []);
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
}

export function saveExploreBookmarks(ids: string[]): void {
  writeJson(WELLNESS_STORAGE_KEYS.EXPLORE_BOOKMARKS, Array.from(new Set(ids)));
}

// ---------------------------------------------------------------------------
// Feature 4: Daily Challenges (Completed Dates + Optional Journal Responses)
// ---------------------------------------------------------------------------
export interface StoredChallengesState {
  completedDates: Record<string, string>; // dateKey -> challengeId
  responses: Record<string, string>; // dateKey -> optional journal text
}

export function loadChallengesState(): StoredChallengesState {
  const raw = readJson<Partial<StoredChallengesState> | null>(
    WELLNESS_STORAGE_KEYS.CHALLENGES_STATE,
    null
  );
  if (!raw || typeof raw !== 'object') {
    return { completedDates: {}, responses: {} };
  }
  return {
    completedDates:
      raw.completedDates && typeof raw.completedDates === 'object' ? raw.completedDates : {},
    responses: raw.responses && typeof raw.responses === 'object' ? raw.responses : {},
  };
}

export function markChallengeCompleted(
  dateKey: string,
  challengeId: string,
  responseText?: string
): StoredChallengesState {
  const current = loadChallengesState();
  // Prevent duplicate completion for the same day
  if (current.completedDates[dateKey]) {
    return current;
  }
  const next: StoredChallengesState = {
    completedDates: { ...current.completedDates, [dateKey]: challengeId },
    responses: { ...current.responses },
  };
  if (typeof responseText === 'string' && responseText.trim()) {
    next.responses[dateKey] = responseText.trim();
  }
  writeJson(WELLNESS_STORAGE_KEYS.CHALLENGES_STATE, next);
  return next;
}

export function countWeeklyCompletedChallenges(
  completedDates: Record<string, string>,
  referenceDate: Date = new Date()
): number {
  const weekKeys = getCurrentWeekDateKeys(referenceDate);
  let count = 0;
  for (const key of weekKeys) {
    if (completedDates[key]) {
      count += 1;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Feature 5: Sound Lounge (Favourites & Volume)
// ---------------------------------------------------------------------------
export function loadSoundFavourites(): string[] {
  const raw = readJson<unknown>(WELLNESS_STORAGE_KEYS.SOUND_FAVOURITES, []);
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : [];
}

export function saveSoundFavourites(ids: string[]): void {
  writeJson(WELLNESS_STORAGE_KEYS.SOUND_FAVOURITES, Array.from(new Set(ids)));
}

export function loadSoundVolume(): number {
  try {
    const raw = localStorage.getItem(WELLNESS_STORAGE_KEYS.SOUND_VOLUME);
    if (raw === null) return 0.6;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return 0.6;
    return parsed;
  } catch {
    return 0.6;
  }
}

export function saveSoundVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  try {
    localStorage.setItem(WELLNESS_STORAGE_KEYS.SOUND_VOLUME, String(clamped));
  } catch {
    // Ignore storage errors safely
  }
}

// ---------------------------------------------------------------------------
// Feature 2: Breathing Bubble Stats
// ---------------------------------------------------------------------------
export interface BreathingStats {
  sessionsCompleted: number;
  totalMinutes: number;
  bestSyncStreak: number;
}

export function loadBreathingStats(): BreathingStats {
  const raw = readJson<Partial<BreathingStats> | null>(
    WELLNESS_STORAGE_KEYS.BREATHING_STATS,
    null
  );
  if (!raw || typeof raw !== 'object') {
    return { sessionsCompleted: 0, totalMinutes: 0, bestSyncStreak: 0 };
  }
  return {
    sessionsCompleted:
      typeof raw.sessionsCompleted === 'number' && Number.isFinite(raw.sessionsCompleted)
        ? Math.max(0, Math.floor(raw.sessionsCompleted))
        : 0,
    totalMinutes:
      typeof raw.totalMinutes === 'number' && Number.isFinite(raw.totalMinutes)
        ? Math.max(0, Math.floor(raw.totalMinutes))
        : 0,
    bestSyncStreak:
      typeof raw.bestSyncStreak === 'number' && Number.isFinite(raw.bestSyncStreak)
        ? Math.max(0, Math.floor(raw.bestSyncStreak))
        : 0,
  };
}

export function recordBreathingCompletion(
  minutes: number,
  syncStreak: number
): BreathingStats {
  const current = loadBreathingStats();
  const next: BreathingStats = {
    sessionsCompleted: current.sessionsCompleted + 1,
    totalMinutes: current.totalMinutes + Math.max(1, Math.floor(minutes)),
    bestSyncStreak: Math.max(current.bestSyncStreak, Math.max(0, Math.floor(syncStreak))),
  };
  writeJson(WELLNESS_STORAGE_KEYS.BREATHING_STATS, next);
  return next;
}

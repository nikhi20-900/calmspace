import { build } from 'esbuild';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const tempOutDir = mkdtempSync(path.join(tmpdir(), 'calmspace-fe-tests-'));

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

// Install minimal browser globals before importing compiled frontend modules
globalThis.localStorage = createMemoryStorage();
globalThis.sessionStorage = createMemoryStorage();
globalThis.window = {
  setTimeout: globalThis.setTimeout.bind(globalThis),
  clearTimeout: globalThis.clearTimeout.bind(globalThis),
};

await build({
  entryPoints: [
    path.join(frontendRoot, 'src/services/checkinState.ts'),
    path.join(frontendRoot, 'src/services/api.ts'),
    path.join(frontendRoot, 'src/utils/moodTrend.ts'),
    path.join(frontendRoot, 'src/utils/wellnessStorage.ts'),
    path.join(frontendRoot, 'src/data/wellnessContent.ts'),
  ],
  outbase: path.join(frontendRoot, 'src'),
  outdir: tempOutDir,
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  mainFields: ['module', 'main'],
  define: {
    'import.meta.env': JSON.stringify({ VITE_API_BASE_URL: '/api' }),
  },
  outExtension: { '.js': '.mjs' },
});

const checkinState = await import(pathToFileURL(path.join(tempOutDir, 'services/checkinState.mjs')).href);
const apiModule = await import(pathToFileURL(path.join(tempOutDir, 'services/api.mjs')).href);
const moodTrendModule = await import(pathToFileURL(path.join(tempOutDir, 'utils/moodTrend.mjs')).href);
const wellnessStorage = await import(pathToFileURL(path.join(tempOutDir, 'utils/wellnessStorage.mjs')).href);
const wellnessContent = await import(pathToFileURL(path.join(tempOutDir, 'data/wellnessContent.mjs')).href);

test.after(() => {
  rmSync(tempOutDir, { recursive: true, force: true });
});

function makeCheckInResponse(route) {
  return {
    record: {
      id: `rec-${route.toLowerCase()}`,
      session_id: 'student-12345678',
      timestamp: '2026-11-26T09:00:00Z',
      mood: route === 'HIGH' ? 1 : route === 'MEDIUM' ? 2 : 4,
      stress: route === 'HIGH' ? 5 : route === 'MEDIUM' ? 4 : 2,
      sleep_hours: route === 'HIGH' ? 3 : 7.5,
      route,
    },
    safety: {
      route,
      score: route === 'HIGH' ? 10 : route === 'MEDIUM' ? 5 : 1,
      crisis_flag: route === 'HIGH',
      status_label: route,
      status_summary: `${route} summary`,
      requires_human_escalation: route === 'HIGH',
      ai_eligible: route !== 'HIGH',
      reasons: [],
    },
    guidance:
      route === 'HIGH'
        ? null
        : {
            message: 'Steady supportive message.',
            suggestion_chips: ['Breathe'],
            disclaimer: 'Supportive guidance only.',
            generated_by_ai: false,
            fallback_used: true,
          },
    support_contacts: [],
  };
}

test('Safe Exit sequence: LOW -> MEDIUM -> HIGH -> Safe Exit -> failed submit -> new LOW check-in', () => {
  globalThis.sessionStorage.clear();

  // 1. LOW check-in succeeds and resolves to render
  const lowResp = makeCheckInResponse('LOW');
  checkinState.persistSuccessfulCheckIn(lowResp);
  assert.equal(globalThis.sessionStorage.getItem(checkinState.HIGH_RISK_EXITED_KEY), null);
  assert.deepEqual(checkinState.resolveCheckInResultState(undefined), {
    action: 'render',
    result: lowResp,
  });

  // 2. MEDIUM check-in succeeds and resolves to render
  const medResp = makeCheckInResponse('MEDIUM');
  checkinState.persistSuccessfulCheckIn(medResp);
  assert.deepEqual(checkinState.resolveCheckInResultState(undefined), {
    action: 'render',
    result: medResp,
  });

  // 3. HIGH check-in succeeds, then user triggers Safe Exit
  const highResp = makeCheckInResponse('HIGH');
  checkinState.persistSuccessfulCheckIn(highResp);
  checkinState.executeSafeExitState();
  assert.equal(globalThis.sessionStorage.getItem(checkinState.LATEST_CHECKIN_KEY), null);
  assert.equal(globalThis.sessionStorage.getItem(checkinState.HIGH_RISK_EXITED_KEY), 'true');

  // Even if browser history retains location.state, Safe Exit blocks re-opening HIGH screen
  assert.deepEqual(checkinState.resolveCheckInResultState(highResp), {
    action: 'redirect_overview',
  });

  // 4. Failed new check-in submission must NOT clear the sticky Safe Exit flag
  // (persistSuccessfulCheckIn is only called after api.submitCheckIn resolves)
  assert.equal(globalThis.sessionStorage.getItem(checkinState.HIGH_RISK_EXITED_KEY), 'true');
  assert.deepEqual(checkinState.resolveCheckInResultState(undefined), {
    action: 'redirect_overview',
  });

  // 5. Subsequent successful LOW check-in clears sticky flag and renders new result
  checkinState.persistSuccessfulCheckIn(lowResp);
  assert.equal(globalThis.sessionStorage.getItem(checkinState.HIGH_RISK_EXITED_KEY), null);
  assert.deepEqual(checkinState.resolveCheckInResultState(undefined), {
    action: 'render',
    result: lowResp,
  });
});

test('clearCheckInSessionState removes both cached check-in and Safe Exit flag', () => {
  globalThis.sessionStorage.clear();
  checkinState.persistSuccessfulCheckIn(makeCheckInResponse('HIGH'));
  checkinState.executeSafeExitState();
  assert.equal(globalThis.sessionStorage.getItem(checkinState.HIGH_RISK_EXITED_KEY), 'true');

  checkinState.clearCheckInSessionState();
  assert.equal(globalThis.sessionStorage.getItem(checkinState.LATEST_CHECKIN_KEY), null);
  assert.equal(globalThis.sessionStorage.getItem(checkinState.HIGH_RISK_EXITED_KEY), null);
  assert.deepEqual(checkinState.resolveCheckInResultState(undefined), {
    action: 'redirect_checkin',
  });
});

test('api methods use AbortSignal timeout, send X-Session-ID, and surface AbortError cleanly', async () => {
  globalThis.localStorage.clear();
  const seenCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, opts) => {
    seenCalls.push({ url, opts });
    return {
      ok: true,
      json: async () => [],
    };
  };

  try {
    await apiModule.api.getCheckInHistory();
    await apiModule.api.getInsights(7);
    await apiModule.api.getTasks();
    await apiModule.api.getSupportResources();
    await apiModule.api.getSettings();

    assert.equal(seenCalls.length, 5);
    for (const call of seenCalls) {
      assert.ok(call.opts.signal instanceof AbortSignal, `Expected AbortSignal on ${call.url}`);
      assert.match(call.opts.headers['X-Session-ID'], /^student-[a-z0-9]{8}$/i);
    }

    // Timeout / AbortError handling
    globalThis.fetch = async () => {
      const abortErr = new Error('The operation was aborted.');
      abortErr.name = 'AbortError';
      throw abortErr;
    };

    await assert.rejects(
      () => apiModule.api.getSettings(),
      /Request timed out\. Please verify your connection and retry\./
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('api.getSupportResources throws during outage and recovers when backend returns', async () => {
  const originalFetch = globalThis.fetch;
  let backendUp = false;

  globalThis.fetch = async () => {
    if (!backendUp) {
      return { ok: false, status: 503, json: async () => ({ detail: 'Unavailable' }) };
    }
    return {
      ok: true,
      json: async () => [
        {
          id: 'tele-manas',
          name: 'Tele-MANAS',
          category: 'helpline',
          description: '24/7 helpline',
          contact_number: '14416',
          display_phone: '14416',
          hours: '24/7',
          is_urgent: true,
          verification_source: 'MoHFW',
          last_verified_date: '2026-01-01',
          badge_label: 'National Helpline',
          is_active: true,
        },
      ],
    };
  };

  try {
    await assert.rejects(() => apiModule.api.getSupportResources(), /Failed to fetch support resources/);
    backendUp = true;
    const recovered = await apiModule.api.getSupportResources();
    assert.equal(recovered.length, 1);
    assert.equal(recovered[0].id, 'tele-manas');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('UI source contracts verify Safe Exit destination, Planner editNotice, and Settings retry guard', () => {
  const resultPage = readFileSync(
    path.join(frontendRoot, 'src/pages/CheckInResultPage.tsx'),
    'utf8'
  );
  assert.ok(!resultPage.includes("navigate('/'"), 'CheckInResultPage must not navigate to landing page /');
  assert.ok(resultPage.includes("navigate('/app'"), 'CheckInResultPage must navigate to /app');

  const plannerPage = readFileSync(
    path.join(frontendRoot, 'src/pages/PlannerPage.tsx'),
    'utf8'
  );
  assert.ok(plannerPage.includes('{editNotice && ('), 'PlannerPage must render editNotice inside edit dialog');
  assert.ok(
    !plannerPage.includes('Backend PATCH persistence endpoint is coordinated'),
    'PlannerPage must not retain outdated placeholder note'
  );

  const settingsPage = readFileSync(
    path.join(frontendRoot, 'src/pages/SettingsPage.tsx'),
    'utf8'
  );
  assert.ok(!settingsPage.includes('Your Cryptographic Identity'));
  assert.ok(settingsPage.includes('disabled={Boolean(loadError)}'));
  assert.ok(settingsPage.includes('onClick={loadSettings}'));

  const overviewPage = readFileSync(
    path.join(frontendRoot, 'src/pages/OverviewPage.tsx'),
    'utf8'
  );
  assert.ok(overviewPage.includes('aggregateDailyMoodTrend'));
  assert.ok(overviewPage.includes('filterAndAggregateMoodHistory'));
  assert.ok(overviewPage.includes('computeMoodTrendSummary'));
  assert.ok(overviewPage.includes('data={dailyMoodTrend}'));
  assert.ok(overviewPage.includes('Period Average'));
  assert.ok(overviewPage.includes('Highest Day'));
  assert.ok(overviewPage.includes('Lowest Day'));

  const insightsPage = readFileSync(
    path.join(frontendRoot, 'src/pages/InsightsPage.tsx'),
    'utf8'
  );
  assert.ok(insightsPage.includes('7h Reference'));
});

test('aggregateDailyMoodTrend merges repeated same-day check-ins and preserves chronological order', () => {
  const { aggregateDailyMoodTrend } = moodTrendModule;

  assert.deepEqual(aggregateDailyMoodTrend(null), []);
  assert.deepEqual(aggregateDailyMoodTrend(undefined), []);
  assert.deepEqual(aggregateDailyMoodTrend([]), []);

  // Multiple check-ins on the same day + multi-day chronological ordering
  const aggregated = aggregateDailyMoodTrend([
    { day: 'Wed 25', mood: 3, route: 'MEDIUM' },
    { day: 'Thu 26', mood: 4, route: 'LOW' },
    { day: 'Fri 27', mood: 2, route: 'MEDIUM' },
    { day: 'Fri 27', mood: 4, route: 'LOW' },
    { day: 'Fri 27', mood: 5, route: 'LOW' },
  ]);

  assert.deepEqual(aggregated, [
    { day: 'Wed 25', mood: 3, count: 1 },
    { day: 'Thu 26', mood: 4, count: 1 },
    { day: 'Fri 27', mood: 3.7, count: 3 },
  ]);
});

test('aggregateDailyMoodTrend safely ignores missing or invalid entries', () => {
  const { aggregateDailyMoodTrend } = moodTrendModule;

  const aggregated = aggregateDailyMoodTrend([
    { day: '', mood: 4 },
    { day: null, mood: 3 },
    { day: 'Mon 23', mood: Number.NaN },
    { day: 'Mon 23', mood: null },
    { day: 'Mon 23', mood: 0 },
    { day: 'Mon 23', mood: 6 },
    { day: 'Tue 24', mood: 4 },
    { day: 'Tue 24', mood: 5 },
  ]);

  assert.deepEqual(aggregated, [{ day: 'Tue 24', mood: 4.5, count: 2 }]);
});

test('computeMoodTrendSummary calculates average, highest/lowest days, counts, and handles empty/single-day states', () => {
  const { computeMoodTrendSummary } = moodTrendModule;

  assert.deepEqual(computeMoodTrendSummary([]), {
    overallAverage: null,
    highestDay: null,
    lowestDay: null,
    totalCheckIns: 0,
    dayCount: 0,
  });

  // Single-day state
  assert.deepEqual(computeMoodTrendSummary([{ day: 'Fri 27', mood: 3.7, count: 3 }]), {
    overallAverage: 3.7,
    highestDay: { day: 'Fri 27', mood: 3.7 },
    lowestDay: { day: 'Fri 27', mood: 3.7 },
    totalCheckIns: 3,
    dayCount: 1,
  });

  // Multi-day state
  assert.deepEqual(
    computeMoodTrendSummary([
      { day: 'Wed 25', mood: 2.5, count: 2 },
      { day: 'Thu 26', mood: 4.5, count: 1 },
      { day: 'Fri 27', mood: 3.7, count: 3 },
    ]),
    {
      overallAverage: 3.6,
      highestDay: { day: 'Thu 26', mood: 4.5 },
      lowestDay: { day: 'Wed 25', mood: 2.5 },
      totalCheckIns: 6,
      dayCount: 3,
    }
  );
});

test('filterAndAggregateMoodHistory filters 7/14/30-day ranges, preserves chronological order, and skips invalid records', () => {
  const { filterAndAggregateMoodHistory } = moodTrendModule;
  const refDate = new Date('2026-11-28T12:00:00Z');

  const records = [
    // 25 days ago (within 30d, outside 14d & 7d)
    { id: '1', session_id: 's', timestamp: '2026-11-03T10:00:00Z', mood: 2, stress: 4, sleep_hours: 6, route: 'MEDIUM' },
    // 10 days ago (within 14d & 30d, outside 7d) - out of order intentionally
    { id: '2', session_id: 's', timestamp: '2026-11-18T10:00:00Z', mood: 5, stress: 1, sleep_hours: 8, route: 'LOW' },
    // 2 days ago (within 7d, 14d, 30d) - two entries on same day
    { id: '3', session_id: 's', timestamp: '2026-11-26T08:00:00Z', mood: 3, stress: 3, sleep_hours: 7, route: 'LOW' },
    { id: '4', session_id: 's', timestamp: '2026-11-26T20:00:00Z', mood: 4, stress: 2, sleep_hours: 7, route: 'LOW' },
    // Today
    { id: '5', session_id: 's', timestamp: '2026-11-28T09:00:00Z', mood: 4, stress: 2, sleep_hours: 7.5, route: 'LOW' },
    // Invalid records
    { id: '6', session_id: 's', timestamp: 'not-a-date', mood: 4, stress: 2, sleep_hours: 7, route: 'LOW' },
    { id: '7', session_id: 's', timestamp: '2026-11-28T10:00:00Z', mood: 99, stress: 2, sleep_hours: 7, route: 'LOW' },
    // Too old (> 30 days)
    { id: '8', session_id: 's', timestamp: '2026-10-15T10:00:00Z', mood: 1, stress: 5, sleep_hours: 4, route: 'HIGH' },
  ];

  const r7 = filterAndAggregateMoodHistory(records, 7, refDate);
  assert.deepEqual(r7, [
    { day: 'Thu 26', mood: 3.5, count: 2 },
    { day: 'Sat 28', mood: 4, count: 1 },
  ]);

  const r14 = filterAndAggregateMoodHistory(records, 14, refDate);
  assert.deepEqual(r14, [
    { day: 'Wed 18', mood: 5, count: 1 },
    { day: 'Thu 26', mood: 3.5, count: 2 },
    { day: 'Sat 28', mood: 4, count: 1 },
  ]);

  const r30 = filterAndAggregateMoodHistory(records, 30, refDate);
  assert.deepEqual(r30, [
    { day: 'Tue 03', mood: 2, count: 1 },
    { day: 'Wed 18', mood: 5, count: 1 },
    { day: 'Thu 26', mood: 3.5, count: 2 },
    { day: 'Sat 28', mood: 4, count: 1 },
  ]);
});

test('Wellness features: Daily Highlights, Explore, Daily Challenges, and Sound Lounge persistence', () => {
  globalThis.localStorage.clear();

  // 1. Daily Highlights: 5 categories & date-based read reset
  const highlights = wellnessContent.getDailyHighlightsForDate('2026-11-28');
  assert.equal(highlights.length, 5);
  wellnessStorage.saveReadHighlightIds([highlights[0].id], '2026-11-28');
  assert.deepEqual(wellnessStorage.loadReadHighlightIds('2026-11-28'), [highlights[0].id]);
  assert.deepEqual(wellnessStorage.loadReadHighlightIds('2026-11-29'), []);

  // 2. Explore & Relax: Likes & Bookmarks persistence
  wellnessStorage.saveExploreLikes(['exp-mindful-grounding']);
  wellnessStorage.saveExploreBookmarks(['exp-sleep-buffer']);
  assert.deepEqual(wellnessStorage.loadExploreLikes(), ['exp-mindful-grounding']);
  assert.deepEqual(wellnessStorage.loadExploreBookmarks(), ['exp-sleep-buffer']);

  // 3. Daily Challenges: no duplicate same-day completion + weekly progress count
  const ch = wellnessContent.getDailyChallengeForDate('2026-11-28');
  assert.ok(ch.title.length > 0);
  const s1 = wellnessStorage.markChallengeCompleted('2026-11-28', ch.id, 'Grateful for calm');
  assert.equal(s1.completedDates['2026-11-28'], ch.id);
  assert.equal(s1.responses['2026-11-28'], 'Grateful for calm');
  // Second attempt on same day does not overwrite
  const s2 = wellnessStorage.markChallengeCompleted('2026-11-28', 'other-id', 'Different');
  assert.equal(s2.completedDates['2026-11-28'], ch.id);
  assert.equal(
    wellnessStorage.countWeeklyCompletedChallenges(s2.completedDates, new Date(2026, 10, 28)),
    1
  );

  // 4. Sound Lounge: exact 3 tracks + favourites & volume persistence
  assert.deepEqual(
    wellnessContent.SOUND_LOUNGE_TRACKS.map((t) => t.title),
    ['Meditation Calm', 'Ocean Waves', 'Night Calm']
  );
  wellnessStorage.saveSoundFavourites(['meditation']);
  wellnessStorage.saveSoundVolume(0.45);
  assert.deepEqual(wellnessStorage.loadSoundFavourites(), ['meditation']);
  assert.equal(wellnessStorage.loadSoundVolume(), 0.45);

  // 5. Breathing Bubble stats persistence
  assert.deepEqual(wellnessStorage.loadBreathingStats(), {
    sessionsCompleted: 0,
    totalMinutes: 0,
    bestSyncStreak: 0,
  });
  const b1 = wellnessStorage.recordBreathingCompletion(3, 5);
  assert.deepEqual(b1, { sessionsCompleted: 1, totalMinutes: 3, bestSyncStreak: 5 });
  const b2 = wellnessStorage.recordBreathingCompletion(1, 2);
  assert.deepEqual(b2, { sessionsCompleted: 2, totalMinutes: 4, bestSyncStreak: 5 });
});
test('api companion methods send X-Session-ID and AbortSignal', async () => {
  globalThis.localStorage.clear();
  const seenCalls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, opts) => {
    seenCalls.push({ url, opts });
    return {
      ok: true,
      json: async () => ({
        conversation_id: 'conv-123456',
        greeting: 'Hey!',
        reply: 'Hello!',
        blob_state: 'idle',
        reminders: [],
      }),
    };
  };

  try {
    await apiModule.api.startCompanion();
    await apiModule.api.sendCompanionTurn({
      conversation_id: 'conv-123456',
      message: 'Hi',
      consent_ai_processing: false,
      input_mode: 'text',
    });
    await apiModule.api.confirmCompanionAction({
      conversation_id: 'conv-123456',
      action_id: 'act-123456',
      approved: true,
    });
    await apiModule.api.getReminders();
    await apiModule.api.completeReminder('rem-123');
    await apiModule.api.snoozeReminder('rem-123', 10);
    await apiModule.api.endCompanionSession('conv-123456');

    assert.equal(seenCalls.length, 7);
    for (const call of seenCalls) {
      assert.ok(call.opts.signal instanceof AbortSignal, `Expected AbortSignal on ${call.url}`);
      assert.match(call.opts.headers['X-Session-ID'], /^student-[a-z0-9]{8}$/i);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Calm voice companion & 3D blob contracts cover all states, fallbacks, and safety controls', () => {
  const blobAnim = readFileSync(
    path.join(frontendRoot, 'src/components/mascot/BlobAnimations.ts'),
    'utf8'
  );
  for (const state of ['idle', 'listening', 'thinking', 'speaking', 'breathing', 'support', 'error']) {
    assert.ok(blobAnim.includes(`'${state}'`), `BlobAnimations must support state '${state}'`);
  }

  const voiceService = readFileSync(
    path.join(frontendRoot, 'src/services/voiceService.ts'),
    'utf8'
  );
  assert.ok(voiceService.includes('track.stop()'), 'voiceService must release mic tracks on stop');
  assert.ok(voiceService.includes('window.speechSynthesis.cancel()'), 'voiceService must cancel TTS on stop');

  const hookSrc = readFileSync(
    path.join(frontendRoot, 'src/hooks/useVoiceCompanion.ts'),
    'utf8'
  );
  assert.ok(hookSrc.includes('speechInRef.current.abort()'), 'Must stop STT before TTS to avoid self-listening');
  assert.ok(hookSrc.includes('endConversation'), 'Must expose endConversation cleanup');

  const companionPage = readFileSync(
    path.join(frontendRoot, 'src/pages/CompanionPage.tsx'),
    'utf8'
  );
  assert.ok(companionPage.includes('companion-text-input'), 'Must include text-input fallback');
  assert.ok(companionPage.includes('14416'), 'Must include accessible emergency 14416 helpline');
  assert.ok(companionPage.includes('Interrupt & Speak'), 'Must allow interrupting Calm');

  const appLayout = readFileSync(
    path.join(frontendRoot, 'src/components/layout/AppLayout.tsx'),
    'utf8'
  );
  assert.ok(appLayout.includes('useReminderScheduler'), 'AppLayout must run live reminder scheduler');
  assert.ok(appLayout.includes('Snooze 10m'), 'AppLayout must support snoozing due reminders');
});

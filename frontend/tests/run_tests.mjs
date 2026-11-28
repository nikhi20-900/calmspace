import { build } from 'esbuild';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  ],
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

const checkinState = await import(path.join(tempOutDir, 'checkinState.mjs'));
const apiModule = await import(path.join(tempOutDir, 'api.mjs'));

test.after(() => {
  rmSync(tempOutDir, { recursive: true, force: true });
});

function makeCheckInResponse(route) {
  return {
    record: {
      id: `rec-${route.toLowerCase()}`,
      session_id: '11111111-2222-4333-8444-555555555555',
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

test('api bootstraps Bearer session once, removes legacy ID, and sends AbortSignal timeout', async () => {
  globalThis.localStorage.clear();
  globalThis.localStorage.setItem('calmspace_anonymous_session_id', 'student-legacy01');
  const seenCalls = [];
  let sessionBootstrapCalls = 0;
  const originalFetch = globalThis.fetch;

  const futureExpiry = new Date(Date.now() + 86_400_000).toISOString();
  globalThis.fetch = async (url, opts) => {
    seenCalls.push({ url, opts });
    if (url === '/api/sessions') {
      sessionBootstrapCalls += 1;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          session_id: '11111111-2222-4333-8444-555555555555',
          session_secret: 'secret-token-value-with-256-bit-entropy-1234',
          expires_at: futureExpiry,
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => [],
    };
  };

  try {
    // Concurrent initial requests deduplicate into a single POST /api/sessions call
    await Promise.all([
      apiModule.api.getCheckInHistory(),
      apiModule.api.getInsights(7),
      apiModule.api.getTasks(),
      apiModule.api.getSettings(),
    ]);
    await apiModule.api.getSupportResources();

    assert.equal(sessionBootstrapCalls, 1);
    assert.equal(globalThis.localStorage.getItem('calmspace_anonymous_session_id'), null);
    assert.equal(apiModule.getAnonymousSessionId(), '11111111-2222-4333-8444-555555555555');

    const authedCalls = seenCalls.filter(
      (c) => c.url !== '/api/sessions' && c.url !== '/api/support/resources'
    );
    assert.equal(authedCalls.length, 4);
    for (const call of authedCalls) {
      assert.ok(call.opts.signal instanceof AbortSignal, `Expected AbortSignal on ${call.url}`);
      assert.equal(
        call.opts.headers.Authorization,
        'Bearer 11111111-2222-4333-8444-555555555555.secret-token-value-with-256-bit-entropy-1234'
      );
      assert.equal(call.opts.headers['X-Session-ID'], undefined);
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

test('api handles deleteAllData credential clearing and 401 re-bootstrap cleanly', async () => {
  globalThis.localStorage.clear();
  const originalFetch = globalThis.fetch;
  const futureExpiry = new Date(Date.now() + 86_400_000).toISOString();
  let issuedCount = 0;

  globalThis.fetch = async (url, opts) => {
    if (url === '/api/sessions') {
      issuedCount += 1;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          session_id: `00000000-0000-4000-8000-00000000000${issuedCount}`,
          session_secret: `secret-${issuedCount}-with-sufficient-length-abcdef`,
          expires_at: futureExpiry,
        }),
      };
    }
    if (url === '/api/settings/data' && opts?.method === 'DELETE') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'success' }),
      };
    }
    if (
      url === '/api/checkin/history' &&
      opts?.headers?.Authorization?.includes('00000000-0000-4000-8000-000000000001')
    ) {
      // Simulate expired/revoked credential 401 on first session
      return { ok: false, status: 401, json: async () => ({ detail: 'Unauthorized' }) };
    }
    return { ok: true, status: 200, json: async () => [] };
  };

  try {
    // Session 1 gets 401 -> transparently clears old credential, issues Session 2, and succeeds
    const history = await apiModule.api.getCheckInHistory();
    assert.deepEqual(history, []);
    assert.equal(issuedCount, 2);
    assert.equal(
      apiModule.getAnonymousSessionId(),
      '00000000-0000-4000-8000-000000000002'
    );

    // deleteAllData clears stored credential locally
    await apiModule.api.deleteAllData();
    assert.equal(apiModule.getAnonymousSessionId(), null);

    // Subsequent request after deleteAllData bootstraps a brand-new session
    await apiModule.api.getCheckInHistory();
    assert.equal(issuedCount, 3);
    assert.equal(
      apiModule.getAnonymousSessionId(),
      '00000000-0000-4000-8000-000000000003'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('frontend compatibility: page refresh, expired credentials, and revoked non-retried mutations', async () => {
  globalThis.localStorage.clear();
  const originalFetch = globalThis.fetch;
  const futureExpiry = new Date(Date.now() + 86_400_000).toISOString();
  const pastExpiry = new Date(Date.now() - 60_000).toISOString();
  let bootstrapCalls = 0;
  let simulateRevoked = false;

  globalThis.fetch = async (url, opts) => {
    if (url === '/api/sessions') {
      bootstrapCalls += 1;
      return {
        ok: true,
        status: 201,
        json: async () => ({
          session_id: `aaaaaaaa-bbbb-4ccc-8ddd-00000000000${bootstrapCalls}`,
          session_secret: `fresh-secret-${bootstrapCalls}-with-plenty-of-entropy`,
          expires_at: futureExpiry,
        }),
      };
    }
    if (simulateRevoked) {
      return { ok: false, status: 401, json: async () => ({ detail: 'Unauthorized' }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        nickname: 'Student',
        break_reminders_enabled: true,
        reminder_interval_minutes: 45,
        share_anonymous_analytics: false,
        data_retention_days: 30,
      }),
    };
  };

  try {
    // 1. Page refresh simulation: pre-populated valid localStorage credential is reused with 0 new session calls
    globalThis.localStorage.setItem(
      'calmspace_session_credential',
      JSON.stringify({
        session_id: 'eeeeeeee-ffff-4111-8222-333333333333',
        session_secret: 'persisted-refresh-secret-with-high-entropy-1234',
        expires_at: futureExpiry,
      })
    );
    assert.equal(
      apiModule.getAnonymousSessionId(),
      'eeeeeeee-ffff-4111-8222-333333333333'
    );
    await apiModule.api.getSettings();
    assert.equal(bootstrapCalls, 0);

    // 2. Expired localStorage credential is discarded immediately and refreshed on next call
    globalThis.localStorage.setItem(
      'calmspace_session_credential',
      JSON.stringify({
        session_id: 'dddddddd-eeee-4111-8222-444444444444',
        session_secret: 'expired-secret-with-high-entropy-1234567890',
        expires_at: pastExpiry,
      })
    );
    assert.equal(apiModule.getAnonymousSessionId(), null);
    await apiModule.api.getSettings();
    assert.equal(bootstrapCalls, 1);
    assert.equal(
      apiModule.getAnonymousSessionId(),
      'aaaaaaaa-bbbb-4ccc-8ddd-000000000001'
    );

    // 3. Revoked credential on targeted mutation (updateSettings) clears credential and fails closed
    simulateRevoked = true;
    await assert.rejects(
      () =>
        apiModule.api.updateSettings({
          nickname: 'Student',
          break_reminders_enabled: true,
          reminder_interval_minutes: 45,
          share_anonymous_analytics: false,
          data_retention_days: 30,
        }),
      /Your anonymous session has expired or been revoked/
    );
    assert.equal(apiModule.getAnonymousSessionId(), null);
    assert.equal(bootstrapCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('concurrent 401 responses share one newly bootstrapped session without clobbering', async () => {
  globalThis.localStorage.clear();
  const originalFetch = globalThis.fetch;
  const futureExpiry = new Date(Date.now() + 86_400_000).toISOString();
  const staleCred = {
    session_id: '11111111-1111-4111-8111-111111111111',
    session_secret: 'stale-revoked-secret-with-plenty-of-entropy',
    expires_at: futureExpiry,
  };
  const freshCred = {
    session_id: '22222222-2222-4222-8222-222222222222',
    session_secret: 'fresh-recovered-secret-with-plenty-of-entropy',
    expires_at: futureExpiry,
  };

  globalThis.localStorage.setItem('calmspace_session_credential', JSON.stringify(staleCred));

  let bootstrapCalls = 0;
  let stale401Count = 0;
  const retryTokens = [];

  globalThis.fetch = async (url, opts) => {
    if (url === '/api/sessions') {
      bootstrapCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        ok: true,
        status: 201,
        json: async () => freshCred,
      };
    }

    const authHeader = opts?.headers?.Authorization;
    if (authHeader === `Bearer ${staleCred.session_id}.${staleCred.session_secret}`) {
      // Stagger 401 arrival slightly so one caller finishes bootstrapping before another handles its 401
      const delay = stale401Count * 15;
      stale401Count += 1;
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return { ok: false, status: 401, json: async () => ({ detail: 'Unauthorized' }) };
    }

    retryTokens.push(authHeader);
    if (url.startsWith('/api/insights')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          average_mood: 0,
          average_stress: 0,
          average_sleep: 0,
          check_in_count: 0,
          plain_summary: 'No check-ins yet.',
          mood_trend: [],
          sleep_trend: [],
          stress_trend: [],
        }),
      };
    }
    if (url === '/api/settings') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          nickname: 'Student',
          break_reminders_enabled: true,
          reminder_interval_minutes: 45,
          share_anonymous_analytics: false,
          data_retention_days: 30,
        }),
      };
    }
    return { ok: true, status: 200, json: async () => [] };
  };

  try {
    await Promise.all([
      apiModule.api.getCheckInHistory(),
      apiModule.api.getInsights(7),
      apiModule.api.getSettings(),
    ]);

    assert.equal(bootstrapCalls, 1);
    assert.equal(retryTokens.length, 3);
    for (const token of retryTokens) {
      assert.equal(token, `Bearer ${freshCred.session_id}.${freshCred.session_secret}`);
    }
    assert.equal(apiModule.getAnonymousSessionId(), freshCred.session_id);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rotateSession validates payload and preserves rotated credential across delayed stale 401', async () => {
  globalThis.localStorage.clear();
  const originalFetch = globalThis.fetch;
  const futureExpiry = new Date(Date.now() + 86_400_000).toISOString();
  const sessionId = '33333333-3333-4333-8333-333333333333';
  const oldCred = {
    session_id: sessionId,
    session_secret: 'old-secret-before-rotation-with-plenty-entropy',
    expires_at: futureExpiry,
  };
  const newCred = {
    session_id: sessionId,
    session_secret: 'new-rotated-secret-with-plenty-of-entropy-99',
    expires_at: futureExpiry,
  };

  globalThis.localStorage.setItem('calmspace_session_credential', JSON.stringify(oldCred));

  let returnMalformedRotation = true;
  let bootstrapCalls = 0;
  const seenAuthHeaders = [];

  globalThis.fetch = async (url, opts) => {
    const authHeader = opts?.headers?.Authorization;
    if (url === '/api/sessions') {
      bootstrapCalls += 1;
      return { ok: true, status: 201, json: async () => newCred };
    }
    if (url === '/api/sessions/rotate') {
      if (returnMalformedRotation) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ session_id: sessionId, session_secret: '', expires_at: futureExpiry }),
        };
      }
      return { ok: true, status: 200, json: async () => newCred };
    }

    seenAuthHeaders.push({ url, authHeader });
    if (url === '/api/checkin/history' && authHeader === `Bearer ${sessionId}.${oldCred.session_secret}`) {
      // Simulate delayed 401 from an in-flight request that started with oldCred before rotation finished
      await new Promise((resolve) => setTimeout(resolve, 25));
      return { ok: false, status: 401, json: async () => ({ detail: 'Unauthorized' }) };
    }
    return { ok: true, status: 200, json: async () => [] };
  };

  try {
    // 1. Malformed rotation response throws and must NOT overwrite oldCred
    await assert.rejects(
      () => apiModule.api.rotateSession(),
      /Server returned an invalid rotated session credential/
    );
    assert.equal(
      JSON.parse(globalThis.localStorage.getItem('calmspace_session_credential')).session_secret,
      oldCred.session_secret
    );

    // 2. Start in-flight request with oldCred, then complete rotateSession() before stale 401 returns
    returnMalformedRotation = false;
    const inFlightHistory = apiModule.api.getCheckInHistory();
    const rotated = await apiModule.api.rotateSession();
    assert.equal(rotated.session_secret, newCred.session_secret);

    // Delayed stale 401 from inFlightHistory must NOT clear newCred, and retry must use newCred
    await inFlightHistory;
    await apiModule.api.getTasks();

    assert.equal(bootstrapCalls, 0);
    assert.equal(
      JSON.parse(globalThis.localStorage.getItem('calmspace_session_credential')).session_secret,
      newCred.session_secret
    );
    assert.deepEqual(seenAuthHeaders, [
      { url: '/api/checkin/history', authHeader: `Bearer ${sessionId}.${oldCred.session_secret}` },
      { url: '/api/checkin/history', authHeader: `Bearer ${sessionId}.${newCred.session_secret}` },
      { url: '/api/tasks'.replace('/tasks', '/planner/tasks'), authHeader: `Bearer ${sessionId}.${newCred.session_secret}` },
    ]);
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
      status: 200,
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

test('UI source contracts verify Safe Exit, Planner editNotice, Settings accessibility, and Bearer auth', () => {
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
  assert.ok(settingsPage.includes('htmlFor="delete-confirmation-input"'));

  const dialog = readFileSync(
    path.join(frontendRoot, 'src/components/ui/Dialog.tsx'),
    'utf8'
  );
  assert.ok(dialog.includes("e.key === 'Tab'"), 'Dialog must trap keyboard Tab navigation');
});

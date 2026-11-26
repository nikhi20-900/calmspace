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
});

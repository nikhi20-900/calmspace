import {
  CheckInRequest,
  CheckInResponse,
  CheckInRecord,
  InsightSummary,
  StudyTask,
  UserSettings,
  SupportContact,
} from '../types';

import { CANONICAL_SUPPORT_RESOURCES } from './supportResources';

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const API_BASE_URL = rawApiBaseUrl.endsWith('/api') ? rawApiBaseUrl : `${rawApiBaseUrl}/api`;
const REQUEST_TIMEOUT_MS = 15000;
const SESSION_CREDENTIAL_KEY = 'calmspace_session_credential';
const LEGACY_SESSION_ID_KEY = 'calmspace_anonymous_session_id';

export interface SessionCredential {
  session_id: string;
  session_secret: string;
  expires_at: string;
}

let inFlightSessionBootstrap: Promise<SessionCredential> | null = null;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Please verify your connection and retry.');
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

function formatErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const firstMsg = detail[0]?.msg;
    if (typeof firstMsg === 'string' && firstMsg.trim()) return firstMsg;
  }
  return fallback;
}

function isCredentialValid(cred: unknown): cred is SessionCredential {
  if (!cred || typeof cred !== 'object') return false;
  const candidate = cred as Record<string, unknown>;
  if (
    typeof candidate.session_id !== 'string' ||
    !candidate.session_id ||
    typeof candidate.session_secret !== 'string' ||
    !candidate.session_secret ||
    typeof candidate.expires_at !== 'string'
  ) {
    return false;
  }
  const expiresMs = Date.parse(candidate.expires_at);
  return Number.isFinite(expiresMs) && expiresMs > Date.now() + 5000;
}

export function getStoredSessionCredential(): SessionCredential | null {
  localStorage.removeItem(LEGACY_SESSION_ID_KEY);
  const raw = localStorage.getItem(SESSION_CREDENTIAL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (isCredentialValid(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed stored state
  }
  localStorage.removeItem(SESSION_CREDENTIAL_KEY);
  return null;
}

export function clearSessionCredential(): void {
  localStorage.removeItem(SESSION_CREDENTIAL_KEY);
  localStorage.removeItem(LEGACY_SESSION_ID_KEY);
}

export function clearSessionCredentialIfMatching(
  expectedSessionId: string,
  expectedSecret?: string
): boolean {
  const raw = localStorage.getItem(SESSION_CREDENTIAL_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Partial<SessionCredential>;
    const idMatches = parsed?.session_id === expectedSessionId;
    const secretMatches =
      expectedSecret === undefined || parsed?.session_secret === expectedSecret;
    if (idMatches && secretMatches) {
      clearSessionCredential();
      return true;
    }
    return false;
  } catch {
    clearSessionCredential();
    return true;
  }
}

export function getAnonymousSessionId(): string | null {
  return getStoredSessionCredential()?.session_id ?? null;
}

export async function ensureSessionCredential(): Promise<SessionCredential> {
  const existing = getStoredSessionCredential();
  if (existing) {
    return existing;
  }

  if (inFlightSessionBootstrap) {
    return inFlightSessionBootstrap;
  }

  inFlightSessionBootstrap = (async () => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error('Failed to initialize anonymous session credential');
    }
    const payload = (await res.json()) as SessionCredential;
    if (!isCredentialValid(payload)) {
      throw new Error('Server returned an invalid anonymous session credential');
    }
    localStorage.setItem(SESSION_CREDENTIAL_KEY, JSON.stringify(payload));
    return payload;
  })();

  try {
    return await inFlightSessionBootstrap;
  } finally {
    inFlightSessionBootstrap = null;
  }
}

async function authorizedFetch(
  path: string,
  options: RequestInit = {},
  { retryOn401 = true }: { retryOn401?: boolean } = {}
): Promise<Response> {
  const executeWithCredential = async (cred: SessionCredential) =>
    fetchWithTimeout(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${cred.session_id}.${cred.session_secret}`,
      },
    });

  let cred = await ensureSessionCredential();
  let res = await executeWithCredential(cred);

  if (res.status === 401) {
    clearSessionCredentialIfMatching(cred.session_id, cred.session_secret);
    if (!retryOn401) {
      throw new Error(
        'Your anonymous session has expired or been revoked. Please refresh to start a fresh session.'
      );
    }
    cred = await ensureSessionCredential();
    res = await executeWithCredential(cred);
  }

  return res;
}

// Fallback verified resources using unified canonical directory
export const FALLBACK_SUPPORT_RESOURCES: SupportContact[] = CANONICAL_SUPPORT_RESOURCES;

export const api = {
  // Session lifecycle
  async ensureSession(): Promise<SessionCredential> {
    return ensureSessionCredential();
  },

  async rotateSession(): Promise<SessionCredential> {
    const res = await authorizedFetch(
      '/sessions/rotate',
      { method: 'POST' },
      { retryOn401: false }
    );
    if (!res.ok) {
      throw new Error('Failed to rotate anonymous session credential');
    }
    const payload = (await res.json()) as SessionCredential;
    if (!isCredentialValid(payload)) {
      throw new Error('Server returned an invalid rotated session credential');
    }
    localStorage.setItem(SESSION_CREDENTIAL_KEY, JSON.stringify(payload));
    return payload;
  },

  async revokeSession(): Promise<void> {
    const res = await authorizedFetch(
      '/sessions/revoke',
      { method: 'POST' },
      { retryOn401: false }
    );
    if (!res.ok) {
      throw new Error('Failed to revoke anonymous session credential');
    }
    clearSessionCredential();
  },

  // Check-in endpoints
  async submitCheckIn(data: CheckInRequest): Promise<CheckInResponse> {
    const res = await authorizedFetch('/checkin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to submit check-in'));
    }
    return res.json();
  },

  async getCheckInHistory(): Promise<CheckInRecord[]> {
    const res = await authorizedFetch('/checkin/history');
    if (!res.ok) throw new Error('Failed to fetch check-in history');
    return res.json();
  },

  // Insights
  async getInsights(days = 7): Promise<InsightSummary> {
    const res = await authorizedFetch(`/insights?days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch insights');
    return res.json();
  },

  // Study planner
  async getTasks(): Promise<StudyTask[]> {
    const res = await authorizedFetch('/planner/tasks');
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(data: { title: string; estimated_minutes: number; category: string }): Promise<StudyTask> {
    const res = await authorizedFetch('/planner/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to create task'));
    }
    return res.json();
  },

  async toggleTask(taskId: string): Promise<StudyTask> {
    const res = await authorizedFetch(
      `/planner/tasks/${taskId}/toggle`,
      { method: 'PATCH' },
      { retryOn401: false }
    );
    if (!res.ok) throw new Error('Failed to toggle task');
    return res.json();
  },

  async updateTask(
    taskId: string,
    data: { title?: string; estimated_minutes?: number; category?: string }
  ): Promise<StudyTask> {
    const res = await authorizedFetch(
      `/planner/tasks/${taskId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      { retryOn401: false }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to update task'));
    }
    return res.json();
  },

  async deleteTask(taskId: string): Promise<void> {
    const res = await authorizedFetch(
      `/planner/tasks/${taskId}`,
      { method: 'DELETE' },
      { retryOn401: false }
    );
    if (!res.ok) throw new Error('Failed to delete task');
  },

  // Support
  async getSupportResources(): Promise<SupportContact[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/support/resources`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch support resources');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    const res = await authorizedFetch('/settings');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    const res = await authorizedFetch(
      '/settings',
      {
        method: 'PUT',
        body: JSON.stringify(settings),
      },
      { retryOn401: false }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to update settings'));
    }
    return res.json();
  },

  async deleteAllData(): Promise<void> {
    const res = await authorizedFetch(
      '/settings/data',
      { method: 'DELETE' },
      { retryOn401: false }
    );
    if (!res.ok) throw new Error('Failed to delete data');
    clearSessionCredential();
  },
};

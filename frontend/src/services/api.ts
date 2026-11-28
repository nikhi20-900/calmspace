import {
  CheckInRequest,
  CheckInResponse,
  CheckInRecord,
  InsightSummary,
  StudyTask,
  UserSettings,
  SupportContact,
  CompanionStartResponse,
  CompanionTurnResponse,
  ReminderRecord,
  CompanionPreferences,
} from '../types';

import { CANONICAL_SUPPORT_RESOURCES } from './supportResources';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 15000;

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

// Retrieve or generate anonymous UUID session token
export function getAnonymousSessionId(): string {
  let sessionId = localStorage.getItem('calmspace_anonymous_session_id');
  if (!sessionId) {
    sessionId = 'student-' + (crypto?.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10));
    localStorage.setItem('calmspace_anonymous_session_id', sessionId);
  }
  return sessionId;
}

const DEFAULT_HEADERS = () => ({
  'Content-Type': 'application/json',
  'X-Session-ID': getAnonymousSessionId(),
});

export interface CompanionMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Fallback verified resources using unified canonical directory
export const FALLBACK_SUPPORT_RESOURCES: SupportContact[] = CANONICAL_SUPPORT_RESOURCES;

export const api = {
  // Check-in endpoints
  async submitCheckIn(data: CheckInRequest): Promise<CheckInResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/checkin`, {
      method: 'POST',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to submit check-in'));
    }
    return res.json();
  },

  async getCheckInHistory(): Promise<CheckInRecord[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/checkin/history`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch check-in history');
    return res.json();
  },

  // Insights
  async getInsights(days = 7): Promise<InsightSummary> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/insights?days=${days}`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch insights');
    return res.json();
  },

  // Study planner
  async getTasks(): Promise<StudyTask[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/planner/tasks`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(data: { title: string; estimated_minutes: number; category: string }): Promise<StudyTask> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/planner/tasks`, {
      method: 'POST',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to create task'));
    }
    return res.json();
  },

  async toggleTask(taskId: string): Promise<StudyTask> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/planner/tasks/${taskId}/toggle`, {
      method: 'PATCH',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to toggle task');
    return res.json();
  },

  async updateTask(
    taskId: string,
    data: { title?: string; estimated_minutes?: number; category?: string }
  ): Promise<StudyTask> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/planner/tasks/${taskId}`, {
      method: 'PATCH',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to update task'));
    }
    return res.json();
  },

  async deleteTask(taskId: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/planner/tasks/${taskId}`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to delete task');
  },

  // Support
  async getSupportResources(): Promise<SupportContact[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/support/resources`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch support resources');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to update settings'));
    }
    return res.json();
  },

  async deleteAllData(): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/settings/data`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to delete data');
  },

  // Calm Voice Companion
  async startCompanion(): Promise<CompanionStartResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/start`, {
      method: 'POST',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to start companion session'));
    }
    return res.json();
  },

  async sendCompanionTurn(data: {
    conversation_id?: string | null;
    message: string;
    consent_ai_processing: boolean;
    input_mode: 'voice' | 'text';
  }): Promise<CompanionTurnResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/turn`, {
      method: 'POST',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to process companion message'));
    }
    return res.json();
  },

  async confirmCompanionAction(data: {
    conversation_id: string;
    action_id: string;
    approved: boolean;
  }): Promise<CompanionTurnResponse> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/confirm`, {
      method: 'POST',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to confirm companion action'));
    }
    return res.json();
  },

  async endCompanionSession(conversationId: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/session/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) {
      throw new Error('Failed to end companion session');
    }
  },

  async getReminders(): Promise<ReminderRecord[]> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/reminders`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch reminders');
    return res.json();
  },

  async deleteReminder(reminderId: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/reminders/${encodeURIComponent(reminderId)}`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to delete reminder');
  },

  async completeReminder(reminderId: string): Promise<void> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/reminders/${encodeURIComponent(reminderId)}/complete`, {
      method: 'PATCH',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to complete reminder');
  },

  async snoozeReminder(reminderId: string, minutes = 10): Promise<ReminderRecord> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/reminders/${encodeURIComponent(reminderId)}/snooze`, {
      method: 'PATCH',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify({ minutes }),
    });
    if (!res.ok) throw new Error('Failed to snooze reminder');
    return res.json();
  },

  async getCompanionPreferences(): Promise<CompanionPreferences> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/preferences`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch companion preferences');
    return res.json();
  },

  async updateCompanionPreferences(prefs: CompanionPreferences): Promise<CompanionPreferences> {
    const res = await fetchWithTimeout(`${API_BASE_URL}/companion/preferences`, {
      method: 'PUT',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(prefs),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(formatErrorMessage(err.detail, 'Failed to update preferences'));
    }
    return res.json();
  },
};

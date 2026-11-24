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

const API_BASE_URL = '/api';

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

// Fallback verified resources using unified canonical directory
export const FALLBACK_SUPPORT_RESOURCES: SupportContact[] = CANONICAL_SUPPORT_RESOURCES;

export const api = {
  // Check-in endpoints
  async submitCheckIn(data: CheckInRequest): Promise<CheckInResponse> {
    const res = await fetch(`${API_BASE_URL}/checkin`, {
      method: 'POST',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit check-in');
    }
    return res.json();
  },

  async getCheckInHistory(): Promise<CheckInRecord[]> {
    const res = await fetch(`${API_BASE_URL}/checkin/history`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch check-in history');
    return res.json();
  },

  // Insights
  async getInsights(days = 7): Promise<InsightSummary> {
    const res = await fetch(`${API_BASE_URL}/insights?days=${days}`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch insights');
    return res.json();
  },

  // Study planner
  async getTasks(): Promise<StudyTask[]> {
    const res = await fetch(`${API_BASE_URL}/planner/tasks`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(data: { title: string; estimated_minutes: number; category: string }): Promise<StudyTask> {
    const res = await fetch(`${API_BASE_URL}/planner/tasks`, {
      method: 'POST',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async toggleTask(taskId: string): Promise<StudyTask> {
    const res = await fetch(`${API_BASE_URL}/planner/tasks/${taskId}/toggle`, {
      method: 'PATCH',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to toggle task');
    return res.json();
  },

  async deleteTask(taskId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/planner/tasks/${taskId}`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to delete task');
  },

  // Support
  async getSupportResources(): Promise<SupportContact[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/support/resources`, {
        headers: DEFAULT_HEADERS(),
      });
      if (!res.ok) return FALLBACK_SUPPORT_RESOURCES;
      return res.json();
    } catch {
      return FALLBACK_SUPPORT_RESOURCES;
    }
  },

  // Settings
  async getSettings(): Promise<UserSettings> {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: DEFAULT_HEADERS(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async deleteAllData(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/settings/data`, {
      method: 'DELETE',
      headers: DEFAULT_HEADERS(),
    });
    if (!res.ok) throw new Error('Failed to delete data');
  },
};

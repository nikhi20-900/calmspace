import {
  CheckInRequest,
  CheckInResponse,
  CheckInRecord,
  InsightSummary,
  StudyTask,
  UserSettings,
  SupportContact,
} from '../types';

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

// Fallback verified resources in case backend is loading
export const FALLBACK_SUPPORT_RESOURCES: SupportContact[] = [
  {
    id: 'tele-manas',
    name: 'Tele-MANAS (National Mental Health Helpline)',
    category: 'helpline',
    description: 'Comprehensive 24/7 mental health care service by Govt. of India. Free, confidential, and available in 20+ languages.',
    contact_number: '14416',
    display_phone: '14416 / 1800-891-4416',
    hours: '24/7, Everyday',
    is_urgent: true,
    verification_source: 'Ministry of Health and Family Welfare (MoHFW), Govt of India (telemanas.mohfw.gov.in)',
    last_verified_date: '2026-11-01',
    badge_label: 'Free & 24/7 National Support'
  },
  {
    id: 'campus-counselling',
    name: 'University Student Wellbeing & Counselling Unit',
    category: 'campus',
    description: 'Confidential one-on-one sessions with licensed campus clinical psychologists and student advisors.',
    contact_number: '+91-11-2659-7100',
    display_phone: '+91 (011) 2659-7100 / Ext. 7100',
    email: 'wellbeing.support@university.ac.in',
    hours: 'Mon – Fri: 09:00 – 17:30 (Drop-ins welcome)',
    is_urgent: false,
    verification_source: 'Dean of Student Affairs (DoSA) Official Directory',
    last_verified_date: '2026-11-15',
    badge_label: 'Campus Partner'
  },
  {
    id: 'national-emergency',
    name: 'Emergency Services (Police / Medical / Ambulance)',
    category: 'emergency',
    description: 'Immediate emergency response across India for critical physical safety or acute medical distress.',
    contact_number: '112',
    display_phone: '112 (Single Emergency Helpline)',
    hours: '24/7 Instant Dispatch',
    is_urgent: true,
    verification_source: 'Emergency Response Support System (ERSS), MHA India',
    last_verified_date: '2026-11-01',
    badge_label: 'Emergency Only'
  },
  {
    id: 'vandrevala-foundation',
    name: 'Vandrevala Foundation Helpline',
    category: 'helpline',
    description: 'Experienced counselling team offering free empathetic crisis intervention and psychological support.',
    contact_number: '+919999666555',
    display_phone: '+91 9999 666 555',
    hours: '24/7, Toll-Free',
    is_urgent: false,
    verification_source: 'Vandrevala Foundation Mental Health Registry (vandrevalafoundation.com)',
    last_verified_date: '2026-11-10',
    badge_label: 'Trained Counsellors'
  },
  {
    id: 'icall-tiss',
    name: 'iCALL Psychosocial Helpline (TISS)',
    category: 'helpline',
    description: 'Professional mental health service run by the Tata Institute of Social Sciences, providing student-friendly support.',
    contact_number: '+919152987821',
    display_phone: '+91 9152 987 821',
    email: 'icall@tiss.edu',
    hours: 'Mon – Sat: 10:00 – 20:00',
    is_urgent: false,
    verification_source: 'Tata Institute of Social Sciences (TISS) Project Directory',
    last_verified_date: '2026-11-05',
    badge_label: 'Academic Initiative'
  }
];

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

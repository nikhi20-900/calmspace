export type RiskRoute = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CheckInRequest {
  mood: number; // 1 - 5
  stress: number; // 1 - 5
  sleep_hours: number; // 0 - 24
  reflection?: string;
  consent_ai_processing: boolean;
}

export interface CheckInRecord {
  id: string;
  session_id: string;
  timestamp: string;
  mood: number;
  stress: number;
  sleep_hours: number;
  route: RiskRoute;
}

export interface SafetyEvaluation {
  route: RiskRoute;
  status_label: string;
  status_summary: string;
  requires_human_escalation: boolean;
  ai_eligible: boolean;
  reasons: string[];
}

export interface SupportiveGuidance {
  message: string;
  suggestion_chips: string[];
  disclaimer: string;
  generated_by_ai: boolean;
  fallback_used: boolean;
}

export interface SupportContact {
  id: string;
  name: string;
  category: 'campus' | 'helpline' | 'emergency';
  description: string;
  contact_number: string;
  display_phone: string;
  email?: string;
  hours: string;
  is_urgent: boolean;
  verification_source: string;
  official_source_url?: string;
  last_verified_date: string;
  badge_label: string;
  is_demo_placeholder?: boolean;
  placeholder_note?: string;
  is_active?: boolean;
}

export interface CheckInResponse {
  record: CheckInRecord;
  safety: SafetyEvaluation;
  guidance?: SupportiveGuidance | null;
  support_contacts: SupportContact[];
}

export interface InsightSummary {
  average_mood: number;
  average_stress: number;
  average_sleep: number;
  check_in_count: number;
  plain_summary: string;
  mood_trend: Array<{ day: string; timestamp: string; record_index: number; mood: number; route: RiskRoute }>;
  sleep_trend: Array<{ day: string; timestamp: string; record_index: number; sleep: number }>;
  stress_trend: Array<{ day: string; timestamp: string; record_index: number; stress: number }>;
}

export interface StudyTask {
  id: string;
  title: string;
  estimated_minutes: number;
  category: string;
  completed: boolean;
  created_at: string;
}

export interface UserSettings {
  nickname: string;
  break_reminders_enabled: boolean;
  reminder_interval_minutes: number;
  share_anonymous_analytics: boolean;
  data_retention_days: number;
}

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
  crisis_flag?: boolean;
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
  mood_trend: Array<{ day: string; timestamp?: string; mood: number; route: RiskRoute }>;
  sleep_trend: Array<{ day: string; timestamp?: string; sleep: number }>;
  stress_trend: Array<{ day: string; timestamp?: string; stress: number }>;
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

export type BlobVisualState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'breathing'
  | 'support'
  | 'error';

export interface ReminderRecord {
  id: string;
  session_id: string;
  title: string;
  category: 'break' | 'study' | 'hydration' | 'wellbeing';
  delay_minutes: number;
  remind_at: string;
  active: boolean;
  created_at: string;
}

export interface CompanionPreferences {
  study_goal?: string | null;
  preferred_study_block_minutes: number;
  preferred_break_minutes: number;
  preferred_tone: 'warm' | 'concise';
}

export interface ToolExecutionRecord {
  tool_name: string;
  status: 'executed' | 'needs_info' | 'awaiting_confirmation' | 'rejected' | 'failed';
  summary: string;
  data: Record<string, any>;
}

export interface PendingConfirmation {
  action_id: string;
  tool_name: string;
  title: string;
  description: string;
  args: Record<string, any>;
}

export interface CompanionActionCard {
  card_type:
    | 'study_plan'
    | 'insights'
    | 'breathing'
    | 'checkin_prompt'
    | 'checkin_saved'
    | 'reminder'
    | 'support_resources'
    | 'crisis_support'
    | 'preference_saved';
  title: string;
  data: Record<string, any>;
}

export interface CompanionStartResponse {
  conversation_id: string;
  greeting: string;
  blob_state: BlobVisualState;
  follow_up_prompts: string[];
  ai_provider: string;
  reminders: ReminderRecord[];
  preferences: CompanionPreferences;
  disclaimer: string;
}

export interface CompanionTurnResponse {
  conversation_id: string;
  reply: string;
  blob_state: BlobVisualState;
  safety: SafetyEvaluation;
  follow_up_prompts: string[];
  tool_calls: ToolExecutionRecord[];
  pending_confirmation?: PendingConfirmation | null;
  action_cards: CompanionActionCard[];
  support_contacts: SupportContact[];
  generated_by_ai: boolean;
  fallback_used: boolean;
  ai_provider: string;
  disclaimer: string;
}

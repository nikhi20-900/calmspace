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
  mood_trend: Array<{ day: string; mood: number; route: RiskRoute }>;
  sleep_trend: Array<{ day: string; sleep: number }>;
  stress_trend: Array<{ day: string; stress: number }>;
}

export interface InsightTimelineEntry {
  id: string;
  timestamp: string;
  date_key: string;
  day_label: string;
  local_time_label: string;
  mood: number;
  stress: number;
  sleep_hours: number;
  route: RiskRoute;
}

export interface DailyInsightPoint {
  date_key: string;
  day_label: string;
  entry_count: number;
  average_mood: number;
  average_stress: number;
  average_sleep: number;
}

export interface ComparisonMetric {
  current_average: number;
  previous_average: number;
  difference: number;
}

export interface PeriodComparison {
  state: 'ready' | 'not_enough_data';
  period_days: number;
  minimum_checkins_per_period: number;
  current_check_in_count: number;
  previous_check_in_count: number;
  current_active_days: number;
  previous_active_days: number;
  mood?: ComparisonMetric | null;
  stress?: ComparisonMetric | null;
  sleep?: ComparisonMetric | null;
}

export interface PatternHighlight {
  id: string;
  category: 'steady_rhythm' | 'directional_shift' | 'co_observation' | 'varied_rhythm';
  title: string;
  summary: string;
  sample_basis: string;
}

export interface InsightSummaryV2 {
  window_days: number;
  timezone: string;
  window_start_date: string;
  window_end_date: string;
  retention_days: number;
  state: 'brand_new' | 'empty_window' | 'building_baseline' | 'active';
  check_in_count: number;
  total_stored_count: number;
  distinct_local_days: number;
  sleep_7h_plus_count: number;
  sleep_7h_plus_day_count: number;
  average_checkins_per_week: number;
  active_day_rate: number;
  comparison: PeriodComparison;
  average_mood: number;
  average_stress: number;
  average_sleep: number;
  mood_range?: { min: number; max: number } | null;
  stress_range?: { min: number; max: number } | null;
  sleep_range?: { min: number; max: number } | null;
  plain_summary: string;
  timeline_entries: InsightTimelineEntry[];
  daily_series: DailyInsightPoint[];
  pattern_highlights: PatternHighlight[];
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

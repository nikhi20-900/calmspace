import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  HeartPulse,
  LineChart,
  Phone,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatTimeRemaining } from '../../hooks/useReminderScheduler';
import {
  CompanionActionCard,
  PendingConfirmation,
  ReminderRecord,
  SupportContact,
} from '../../types';

export interface CompanionActionAreaProps {
  pendingConfirmation: PendingConfirmation | null;
  actionCards: CompanionActionCard[];
  supportContacts: SupportContact[];
  reminders: ReminderRecord[];
  nowMs?: number;
  isProcessing: boolean;
  onConfirmAction: (approved: boolean) => void;
  onSubmitQuickCheckIn: (text: string) => void;
  onRemoveReminder: (id: string) => void;
  onDismissReminder?: (id: string) => void;
  onSnoozeReminder?: (id: string, minutes?: number) => void;
}

export const CompanionActionArea: React.FC<CompanionActionAreaProps> = ({
  pendingConfirmation,
  actionCards,
  supportContacts,
  reminders,
  nowMs = Date.now(),
  isProcessing,
  onConfirmAction,
  onSubmitQuickCheckIn,
  onRemoveReminder,
  onDismissReminder,
  onSnoozeReminder,
}) => {
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [sleepHours, setSleepHours] = useState(7);

  return (
    <div className="space-y-4">
      {/* Pending Confirmation Gate */}
      {pendingConfirmation && (
        <Card
          padding="md"
          className="border-2 border-[#5554B8] bg-[#F6F5FE] space-y-3 animate-fade-in"
        >
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#5554B8] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5554B8] block">
                Permission Requested
              </span>
              <h3 className="text-sm font-bold text-[#25233B]">
                {pendingConfirmation.title}
              </h3>
              <p className="text-xs text-[#625F78] leading-relaxed">
                {pendingConfirmation.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessing}
              onClick={() => onConfirmAction(true)}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
            >
              Confirm & Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => onConfirmAction(false)}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* Urgent / Verified Human Support Contacts */}
      {supportContacts.length > 0 && (
        <Card
          padding="md"
          className="border-2 border-[#245532]/30 bg-[#F7FBF8] space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#245532]">
              <Phone className="w-4 h-4" />
              <span>Verified Human Support</span>
            </div>
            <Link
              to="/support"
              className="text-xs font-semibold text-[#5554B8] hover:underline"
            >
              Full directory →
            </Link>
          </div>

          <div className="space-y-2">
            {supportContacts.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl bg-white border border-[#E8E6F1] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#25233B] truncate">
                    {c.name}
                  </p>
                  <p className="text-[11px] text-[#625F78]">
                    {c.hours} • {c.is_demo_placeholder ? 'Demo Placeholder' : c.badge_label}
                  </p>
                </div>
                {!c.is_demo_placeholder ? (
                  <a
                    href={`tel:${c.contact_number.replace(/\s+/g, '')}`}
                    className="shrink-0 px-3 py-1.5 rounded-button bg-[#5554B8] text-white text-xs font-semibold hover:bg-[#4645A7]"
                  >
                    Call {c.contact_number}
                  </a>
                ) : (
                  <Link
                    to="/support"
                    className="shrink-0 px-3 py-1.5 rounded-button border border-[#E8E6F1] text-xs font-semibold text-[#625F78]"
                  >
                    Details
                  </Link>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Agent-Generated Action Cards */}
      {actionCards.map((card, idx) => {
        if (card.card_type === 'study_plan') {
          const blocks: Array<Record<string, any>> = Array.isArray(card.data.blocks)
            ? card.data.blocks
            : [];
          return (
            <Card key={`study-${idx}`} padding="md" className="space-y-3 border border-[#D5D1E5]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5554B8]">
                  <BookOpen className="w-4 h-4" />
                  <span>{card.title}</span>
                </div>
                {card.data.saved_to_planner ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#DCE9DF] text-[#245532]">
                    Saved to Planner
                  </span>
                ) : null}
              </div>

              {card.data.pacing_note && (
                <p className="text-xs text-[#625F78] leading-relaxed">
                  {card.data.pacing_note}
                </p>
              )}

              <div className="space-y-2">
                {blocks.map((b, bIdx) => (
                  <div
                    key={bIdx}
                    className="p-2.5 rounded-xl bg-[#F7F6FB] border border-[#E8E6F1] flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-semibold text-[#25233B]">{b.title}</span>
                    <span className="text-[#5554B8] font-medium shrink-0">
                      {b.estimated_minutes}m + {b.break_minutes || 5}m break
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Link
                  to="/planner"
                  className="text-xs font-semibold text-[#5554B8] hover:underline"
                >
                  Open Study Planner →
                </Link>
              </div>
            </Card>
          );
        }

        if (card.card_type === 'insights') {
          return (
            <Card key={`insights-${idx}`} padding="md" className="space-y-2.5 border border-[#E8E6F1]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5554B8]">
                  <LineChart className="w-4 h-4" />
                  <span>{card.title}</span>
                </div>
                <Link to="/insights" className="text-xs font-semibold text-[#5554B8] hover:underline">
                  Full insights →
                </Link>
              </div>
              <p className="text-xs text-[#625F78] leading-relaxed">
                {card.data.plain_summary}
              </p>
              {Number(card.data.check_in_count || 0) > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-[#F7F6FB]">
                    <span className="text-[10px] text-[#625F78] block">Mood</span>
                    <span className="text-sm font-bold text-[#25233B]">
                      {card.data.average_mood}/5
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#F7F6FB]">
                    <span className="text-[10px] text-[#625F78] block">Stress</span>
                    <span className="text-sm font-bold text-[#25233B]">
                      {card.data.average_stress}/5
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#F7F6FB]">
                    <span className="text-[10px] text-[#625F78] block">Sleep</span>
                    <span className="text-sm font-bold text-[#25233B]">
                      {card.data.average_sleep}h
                    </span>
                  </div>
                </div>
              )}
            </Card>
          );
        }

        if (card.card_type === 'checkin_prompt') {
          return (
            <Card key={`checkin-prompt-${idx}`} padding="md" className="space-y-3 border border-[#D5D1E5]">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5554B8]">
                <HeartPulse className="w-4 h-4" />
                <span>{card.title}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-[#625F78] block">Mood (1-5)</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={mood}
                    onChange={(e) => setMood(Math.min(5, Math.max(1, Number(e.target.value) || 3)))}
                    className="w-full px-2.5 py-1.5 rounded-input border border-[#E8E6F1] text-[#25233B]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[#625F78] block">Stress (1-5)</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={stress}
                    onChange={(e) => setStress(Math.min(5, Math.max(1, Number(e.target.value) || 3)))}
                    className="w-full px-2.5 py-1.5 rounded-input border border-[#E8E6F1] text-[#25233B]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[#625F78] block">Sleep (hrs)</span>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={sleepHours}
                    onChange={(e) =>
                      setSleepHours(Math.min(24, Math.max(0, Number(e.target.value) || 7)))
                    }
                    className="w-full px-2.5 py-1.5 rounded-input border border-[#E8E6F1] text-[#25233B]"
                  />
                </label>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={isProcessing}
                onClick={() =>
                  onSubmitQuickCheckIn(
                    `Start check-in with mood ${mood}, stress ${stress}, sleep ${sleepHours} hours`
                  )
                }
              >
                Continue Check-in
              </Button>
            </Card>
          );
        }

        if (card.card_type === 'checkin_saved') {
          return (
            <Card key={`checkin-saved-${idx}`} padding="md" className="bg-[#F7FBF8] border border-[#BCD4C3] space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#245532]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Check-in Saved ({card.data.safety?.route || 'LOW'} Route)</span>
              </div>
              <p className="text-xs text-[#625F78]">
                Mood {card.data.record?.mood}/5 • Stress {card.data.record?.stress}/5 • Sleep{' '}
                {card.data.record?.sleep_hours}h
              </p>
            </Card>
          );
        }

        if (card.card_type === 'preference_saved') {
          return (
            <Card key={`pref-${idx}`} padding="md" className="bg-[#F6F5FE] border border-[#D5D1E5] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5554B8]">
                <Sparkles className="w-4 h-4" />
                <span>{card.title}</span>
              </div>
              <p className="text-xs text-[#625F78]">
                Study blocks: {card.data.preferred_study_block_minutes}m • Breaks:{' '}
                {card.data.preferred_break_minutes}m
              </p>
            </Card>
          );
        }

        return null;
      })}

      {/* Active Session Reminders */}
      {reminders.length > 0 && (
        <Card padding="md" className="space-y-2.5 border border-[#E8E6F1]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5554B8]">
            <Bell className="w-4 h-4" />
            <span>Your Active Reminders</span>
          </div>
          <div className="space-y-1.5">
            {reminders.map((r) => {
              const remaining = formatTimeRemaining(r.remind_at, nowMs);
              const isDue = remaining === 'Due now';
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs ${
                    isDue
                      ? 'bg-[#E9E7FB] border border-[#5554B8]/40'
                      : 'bg-[#F7F6FB]'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[#25233B] block truncate">{r.title}</span>
                    <span className={`text-[11px] font-medium ${isDue ? 'text-[#5554B8]' : 'text-[#625F78]'}`}>
                      {remaining} • {r.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {onSnoozeReminder && (
                      <button
                        type="button"
                        onClick={() => onSnoozeReminder(r.id, 10)}
                        title="Snooze 10 minutes"
                        aria-label={`Snooze reminder ${r.title} by 10 minutes`}
                        className="p-1 text-[#625F78] hover:text-[#5554B8] rounded"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDismissReminder && (
                      <button
                        type="button"
                        onClick={() => onDismissReminder(r.id)}
                        title="Mark done"
                        aria-label={`Complete reminder ${r.title}`}
                        className="p-1 text-[#245532] hover:bg-[#DCE9DF] rounded"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveReminder(r.id)}
                      aria-label={`Remove reminder ${r.title}`}
                      className="p-1 text-[#8E8AA7] hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

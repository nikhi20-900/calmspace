import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import { ReminderRecord } from '../types';

export const REMINDERS_UPDATED_EVENT = 'calmspace:reminders-updated';

export function notifyRemindersUpdated(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(REMINDERS_UPDATED_EVENT));
  }
}

export function playGentleReminderChime(): void {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25]; // C5 -> E5 soft chime
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);
      gain.gain.setValueAtTime(0.001, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.16 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.48);
    });
    window.setTimeout(() => {
      if (ctx.state !== 'closed') ctx.close().catch(() => {});
    }, 900);
  } catch {
    // Ignore autoplay restriction errors
  }
}

export function formatTimeRemaining(remindAtIso: string, nowMs: number): string {
  const targetMs = Date.parse(remindAtIso);
  if (!Number.isFinite(targetMs)) return 'Scheduled';
  const diffSec = Math.ceil((targetMs - nowMs) / 1000);
  if (diffSec <= 0) return 'Due now';
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `in ${hrs}h ${remMins}m`;
  }
  if (mins > 0) return `in ${mins}m ${secs.toString().padStart(2, '0')}s`;
  return `in ${secs}s`;
}

export function useReminderScheduler(options?: {
  onReminderDue?: (reminder: ReminderRecord) => void;
  muteChime?: boolean;
}) {
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const firedIdsRef = useRef<Set<string>>(new Set());
  const onReminderDueRef = useRef(options?.onReminderDue);
  const muteChimeRef = useRef(Boolean(options?.muteChime));

  useEffect(() => {
    onReminderDueRef.current = options?.onReminderDue;
  }, [options?.onReminderDue]);

  useEffect(() => {
    muteChimeRef.current = Boolean(options?.muteChime);
  }, [options?.muteChime]);

  const refreshReminders = useCallback(async () => {
    try {
      const list = await api.getReminders();
      setReminders(list);
    } catch {
      // Non-blocking background sync
    }
  }, []);

  useEffect(() => {
    refreshReminders();
    const handleUpdate = () => {
      refreshReminders();
    };
    window.addEventListener(REMINDERS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(REMINDERS_UPDATED_EVENT, handleUpdate);
  }, [refreshReminders]);

  // Tick every second while active reminders exist so countdowns & firing stay exact
  useEffect(() => {
    if (reminders.length === 0) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      for (const r of reminders) {
        if (!r.active) continue;
        const targetMs = Date.parse(r.remind_at);
        if (Number.isFinite(targetMs) && current >= targetMs && !firedIdsRef.current.has(r.id)) {
          firedIdsRef.current.add(r.id);
          if (!muteChimeRef.current) {
            playGentleReminderChime();
          }
          onReminderDueRef.current?.(r);
        }
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [reminders]);

  const dueReminders = useMemo(
    () =>
      reminders.filter((r) => {
        const targetMs = Date.parse(r.remind_at);
        return r.active && Number.isFinite(targetMs) && nowMs >= targetMs;
      }),
    [reminders, nowMs]
  );

  const dismissReminder = useCallback(async (id: string) => {
    await api.completeReminder(id);
    firedIdsRef.current.delete(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    notifyRemindersUpdated();
  }, []);

  const snoozeReminder = useCallback(async (id: string, minutes = 10) => {
    const updated = await api.snoozeReminder(id, minutes);
    firedIdsRef.current.delete(id);
    setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
    notifyRemindersUpdated();
  }, []);

  const removeReminder = useCallback(async (id: string) => {
    await api.deleteReminder(id);
    firedIdsRef.current.delete(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
    notifyRemindersUpdated();
  }, []);

  return {
    reminders,
    setReminders,
    dueReminders,
    nowMs,
    refreshReminders,
    dismissReminder,
    snoozeReminder,
    removeReminder,
  };
}

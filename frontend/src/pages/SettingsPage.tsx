import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Dialog } from '../components/ui/Dialog';
import { LoadingState } from '../components/ui/LoadingState';
import {
  ShieldCheck,
  Trash2,
  CheckCircle2,
  KeyRound,
  Info,
  AlertCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { api, getAnonymousSessionId } from '../services/api';
import { UserSettings } from '../types';
import { usePrivacyModal } from '../context/PrivacyModalContext';
import { ThemePreference, useTheme } from '../context/ThemeContext';

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'system', label: 'System', description: 'Match OS setting', icon: Monitor },
  { value: 'light', label: 'Light', description: 'Soft daylight paper', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Low-glare twilight', icon: Moon },
];

export const SettingsPage: React.FC = () => {
  const { openPrivacyModal } = usePrivacyModal();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Deletion Dialog State (2-step confirmation)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getSettings();
        setSettings({
          ...data,
          data_retention_days: data.data_retention_days ?? 30,
        });
      } catch {
        setSettings({
          nickname: 'Student',
          break_reminders_enabled: true,
          reminder_interval_minutes: 45,
          share_anonymous_analytics: false,
          data_retention_days: 30,
        });
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e: any) {
      console.error(e);
      setSaveError(e?.message || 'Failed to update preferences. Please check your connection and retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAllData();
      sessionStorage.removeItem('calmspace_latest_checkin');
      setDeletionSuccess(true);
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationText('');
      setSettings({
        nickname: 'Student',
        break_reminders_enabled: true,
        reminder_interval_minutes: 45,
        share_anonymous_analytics: false,
        data_retention_days: 30,
      });
    } catch (e: any) {
      console.error('Data erasure error:', e);
      setDeleteError(
        e?.message || 'Unable to erase data from the server. Please check your connection and retry.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !settings) {
    return <LoadingState message="Loading your settings..." />;
  }

  const anonymousId = getAnonymousSessionId();

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-2xl mx-auto">
      <PageHeader
        tag="Privacy & Settings"
        title="Privacy & Preferences"
        description="Transparent controls over your theme, data retention, anonymous session tokens, and pacing reminders."
      />

      {savedSuccess && (
        <div className="p-3.5 rounded-card bg-[var(--color-sage-soft)] border border-[var(--color-sage-border)] text-[var(--color-sage-text)] text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Preferences updated successfully.</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="p-3.5 rounded-card bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)] text-sm flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {deletionSuccess && (
        <div className="p-3.5 rounded-card bg-[var(--color-sage-soft)] border border-[var(--color-sage-border)] text-[var(--color-sage-text)] text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>All check-ins, tasks, and stored data have been permanently erased.</span>
        </div>
      )}

      {deleteError && (
        <div
          role="alert"
          className="p-3.5 rounded-card bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)] text-sm flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={isDeleting}
            className="font-semibold underline hover:no-underline text-[var(--color-danger-text)] shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Appearance & Theme Preference */}
      <Card padding="lg" className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-[var(--color-text-main)]">
              Appearance
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
              Choose Light, Dark, or follow your device preference. Saved locally on this browser.
            </p>
          </div>
          <span className="text-sm font-medium text-[var(--color-primary)] bg-[var(--color-lavender-soft)] px-3 py-1 rounded-full">
            Active: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </div>

        <div
          role="radiogroup"
          aria-label="Color theme preference"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
        >
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center gap-3 p-3.5 rounded-input border text-left transition-all min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
                  isSelected
                    ? 'bg-[var(--color-lavender-soft)] border-[var(--color-primary)] text-[var(--color-text-main)] shadow-subtle'
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-text-main)]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'bg-[var(--color-primary-fill)] text-white'
                      : 'bg-[var(--color-bg)] text-[var(--color-primary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-[var(--color-text-main)]">
                    {opt.label}
                  </span>
                  <span className="block text-sm text-[var(--color-text-secondary)]">
                    {opt.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Anonymous Identity Card */}
      <Card padding="lg" className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">
          <KeyRound className="w-4 h-4" />
          <span>Anonymous Session</span>
        </div>
        <h2 className="text-base font-bold text-[var(--color-text-main)]">
          Your Cryptographic Identity
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Calmspace does not require email addresses, student roll numbers, or logins. You are represented on this browser solely by an anonymous token:
        </p>
        <div className="p-3 bg-[var(--color-bg)] rounded-input border border-[var(--color-border)] font-mono text-sm text-[var(--color-text-main)] select-all break-all">
          {anonymousId}
        </div>
      </Card>

      {/* User Preferences Form */}
      <Card padding="lg">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="settings-nickname" className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-1.5">
              Your Preferred Nickname
            </label>
            <input
              id="settings-nickname"
              type="text"
              value={settings.nickname}
              onChange={(e) => setSettings({ ...settings, nickname: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-input border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            />
            <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
              Used strictly for warm dashboard greetings like "Good day, {settings.nickname}".
            </p>
          </div>

          {/* Rolling Retention Period Selector */}
          <div className="pt-4 border-t border-[var(--color-border-light)] space-y-2">
            <label htmlFor="settings-retention" className="block text-sm font-semibold text-[var(--color-text-secondary)]">
              Check-in History Rolling Retention Period
            </label>
            <select
              id="settings-retention"
              value={settings.data_retention_days || 30}
              onChange={(e) => setSettings({ ...settings, data_retention_days: Number(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-input border border-[var(--color-border)] text-sm text-[var(--color-text-main)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <option value={14}>14 days (2 weeks)</option>
              <option value={30}>30 days (Default - 1 month)</option>
              <option value={60}>60 days (2 months)</option>
              <option value={90}>90 days (1 quarter term)</option>
            </select>
            <div className="text-sm text-[var(--color-text-secondary)] space-y-2 mt-1">
              <p>
                Currently selected: <strong className="text-[var(--color-text-main)]">{settings.data_retention_days || 30} days</strong> of rolling check-in history.
              </p>
              <div className="p-3 rounded-input bg-[var(--color-bg)] border border-[var(--color-border)] flex items-start gap-2 text-[var(--color-text-secondary)]">
                <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
                <span>
                  Your preferred rolling retention window for check-in history. You can immediately erase all stored data anytime in the destructive zone below.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border-light)] space-y-4">
            <Toggle
              id="reminders-toggle"
              label="In-App Pacing Reminders"
              description="Surface subtle break suggestions when working in the study planner."
              checked={settings.break_reminders_enabled}
              onChange={(checked) => setSettings({ ...settings, break_reminders_enabled: checked })}
            />

            <Toggle
              id="analytics-toggle"
              label="Share Aggregated Anonymous Insights"
              description="Allows aggregate anonymised trends to help improve campus wellbeing initiatives."
              checked={settings.share_anonymous_analytics}
              onChange={(checked) => setSettings({ ...settings, share_anonymous_analytics: checked })}
            />
          </div>

          <div className="pt-4 border-t border-[var(--color-border-light)] flex justify-end">
            <Button type="submit" variant="primary" size="md" isLoading={isSaving} disabled={isSaving}>
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* Data Retention & Privacy Principles */}
      <Card padding="lg" className="space-y-3 bg-[var(--color-surface-subtle)]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--color-sage-text)]">
          <ShieldCheck className="w-4 h-4" />
          <span>Our Privacy Commitment</span>
        </div>
        <h2 className="text-base font-bold text-[var(--color-text-main)]">
          How your data is protected
        </h2>
        <ul className="text-sm text-[var(--color-text-secondary)] space-y-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-2 shrink-0" />
            <span><strong className="text-[var(--color-text-main)]">Reflection isolation:</strong> Optional written reflections are never persisted to database records.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-2 shrink-0" />
            <span><strong className="text-[var(--color-text-main)]">No medical profiling:</strong> We never generate clinical diagnoses or share data with insurance or campus administrative records.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-2 shrink-0" />
            <span><strong className="text-[var(--color-text-main)]">Rule-based routing:</strong> Safety escalation is governed by transparent rules, not unpredictable algorithms.</span>
          </li>
        </ul>

        <div className="pt-3 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPrivacyModal}
            leftIcon={<ShieldCheck className="w-4 h-4 text-[var(--color-sage-text)]" />}
          >
            Inspect Complete Privacy & Data Inventory
          </Button>
        </div>
      </Card>

      {/* Destructive Action Section: Delete All My Data */}
      <Card padding="lg" className="border-[var(--color-danger-border)] bg-[var(--color-danger-soft)]/50 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-danger-text)] uppercase tracking-wider">
          <Trash2 className="w-4 h-4" />
          <span>Destructive Zone</span>
        </div>
        <h2 className="text-base font-bold text-[var(--color-text-main)]">
          Erase All Stored Data
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          Permanently remove your check-in ratings, study planner sessions, and personal preferences from this device and our servers. This action is irreversible.
        </p>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="border-[var(--color-danger-border)] text-[var(--color-danger-text)] hover:bg-[var(--color-danger-soft)]"
          >
            Delete all my data
          </Button>
        </div>
      </Card>

      {/* Two-step Deletion Confirmation Dialog */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Permanently erase your wellbeing data?"
        description="This will instantly wipe all historical check-in records, study planner tasks, and settings tied to your anonymous session. It cannot be undone."
      >
        <div className="space-y-4 mt-2">
          {deleteError && (
            <div
              role="alert"
              className="p-3 rounded-[var(--radius-button)] bg-[var(--color-danger-soft)] border border-[var(--color-danger-border)] text-[var(--color-danger-text)] text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          <p className="text-sm text-[var(--color-text-secondary)]">
            To confirm permanent deletion, please type <strong className="text-[var(--color-danger-text)]">DELETE</strong> in the box below:
          </p>

          <input
            type="text"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder="Type DELETE"
            className="w-full px-3 py-2.5 rounded-input border border-[var(--color-danger-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-danger-text)]"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="urgent"
              size="sm"
              isLoading={isDeleting}
              disabled={deleteConfirmationText !== 'DELETE'}
              onClick={handleExecuteDelete}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              Confirm Permanent Erasure
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

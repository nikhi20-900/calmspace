import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api, getAnonymousSessionId } from '../services/api';
import { clearCheckInSessionState } from '../services/checkinState';
import { UserSettings } from '../types';
import { usePrivacyModal } from '../context/PrivacyModalContext';

const RETENTION_OPTIONS = [
  { days: 14, label: '14 Days', desc: 'Minimal retention' },
  { days: 30, label: '30 Days', desc: 'Standard (Default)' },
  { days: 60, label: '60 Days', desc: 'Extended term' },
  { days: 90, label: '90 Days', desc: 'Full semester' },
] as const;

export const SettingsPage: React.FC = () => {
  const { openPrivacyModal } = usePrivacyModal();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Deletion Dialog State (2-step confirmation)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSuccess, setDeletionSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getSettings();
      setSettings({
        ...data,
        data_retention_days: data.data_retention_days ?? 30,
      });
    } catch (err: any) {
      setLoadError(
        err?.message ||
          'Could not load your saved settings from the server. Retry loading before saving so your existing preferences are not overwritten.'
      );
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
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || loadError) return;
    const trimmedNickname = settings.nickname.trim();
    if (!trimmedNickname) {
      setSaveError('Nickname cannot be empty or whitespace only.');
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateSettings({
        ...settings,
        nickname: trimmedNickname,
      });
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
      clearCheckInSessionState();
      setDeletionSuccess(true);
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationText('');
      setLoadError(null);
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
        description="Transparent controls over your data, anonymous session tokens, and local pacing reminders."
      />

      {loadError && (
        <div
          role="alert"
          className="p-3.5 rounded-card bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{loadError}</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={loadSettings}
            className="shrink-0 flex items-center gap-1.5"
            aria-label="Retry loading settings"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3.5 rounded-card bg-[#DCE9DF] border border-[#BCD4C3] text-[#245532] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Preferences updated successfully.</span>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="p-3.5 rounded-card bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {deletionSuccess && (
        <div className="p-3.5 rounded-card bg-[#DCE9DF] border border-[#BCD4C3] text-[#245532] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>All check-ins, tasks, and stored data have been permanently erased.</span>
        </div>
      )}

      {deleteError && (
        <div
          role="alert"
          className="p-3.5 rounded-card bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={handleExecuteDelete}
            disabled={isDeleting}
            className="font-semibold underline hover:no-underline text-rose-700 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Anonymous Identity Card */}
      <Card padding="lg" className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#5554B8] uppercase tracking-wider">
          <KeyRound className="w-4 h-4" />
          <span>Anonymous Session</span>
        </div>
        <h2 className="text-base font-bold text-[#25233B]">
          Your Anonymous Session ID
        </h2>
        <p className="text-xs text-[#625F78] leading-relaxed">
          Calmspace does not require email addresses, student roll numbers, or Google logins. This browser scopes your local records using an anonymous session identifier stored on this device:
        </p>
        <div className="p-3 bg-[#F7F6FB] rounded-input border border-[#E8E6F1] font-mono text-xs text-[#25233B] select-all break-all">
          {anonymousId}
        </div>
        <p className="text-[11px] text-[#8E8AA7]">
          This token acts as an unauthenticated partition key, not a password-protected account. Keep your device and session ID private.
        </p>
      </Card>

      {/* User Preferences Form */}
      <Card padding="lg">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="settings-nickname" className="block text-xs font-semibold text-[#625F78] mb-1.5">
              Your Preferred Nickname
            </label>
            <input
              id="settings-nickname"
              type="text"
              maxLength={60}
              value={settings.nickname}
              onChange={(e) => setSettings({ ...settings, nickname: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-input border border-[#E8E6F1] text-sm text-[#25233B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
              placeholder="e.g. Student"
            />
            <p className="text-[11px] text-[#8E8AA7] mt-1">
              Used strictly for friendly greetings in your local browser dashboard.
            </p>
          </div>

          {/* Configurable Rolling Data Retention Period */}
          <div className="pt-4 border-t border-[#F0EFF7] space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#625F78] mb-1">
                Data Retention Window
              </label>
              <p className="text-[11px] text-[#8E8AA7] leading-relaxed">
                Choose how long your check-in history is kept before being automatically pruned from the server.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Data retention window"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
            >
              {RETENTION_OPTIONS.map((opt) => {
                const isSelected = settings.data_retention_days === opt.days;
                return (
                  <button
                    key={opt.days}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() =>
                      setSettings({ ...settings, data_retention_days: opt.days })
                    }
                    className={`p-3 rounded-input border text-left transition-all min-h-[52px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                      isSelected
                        ? 'bg-[#E9E7FB] border-[#5554B8] text-[#5554B8] shadow-subtle'
                        : 'bg-white border-[#E8E6F1] text-[#625F78] hover:border-[#D5D1E5] hover:text-[#25233B]'
                    }`}
                  >
                    <span className="block text-xs font-bold">{opt.label}</span>
                    <span className="block text-[11px] opacity-80 mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[#625F78] bg-[#F7F6FB] p-2.5 rounded-md border border-[#E8E6F1]">
              🕒 <strong>Automated pruning:</strong> Check-ins older than {settings.data_retention_days} days are automatically and permanently pruned on each request boundary.
            </p>
          </div>

          <div className="pt-4 border-t border-[#F0EFF7] space-y-4">
            <Toggle
              id="reminder-toggle"
              label="Breather & Study Pacing Prompts"
              description="Gentle, local in-app pauses while study planner sessions are open."
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

          <div className="pt-4 border-t border-[#F0EFF7] flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              disabled={Boolean(loadError)}
            >
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* Data Retention & Privacy Principles */}
      <Card padding="lg" className="space-y-4 bg-[#FAF9FD]">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#245532]">
          <ShieldCheck className="w-4 h-4" />
          <span>Our Privacy Commitment</span>
        </div>
        <h2 className="text-base font-bold text-[#25233B]">
          How your data is protected
        </h2>
        <ul className="text-xs text-[#625F78] space-y-2 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5554B8] mt-1.5 shrink-0" />
            <span><strong>Reflection isolation:</strong> Optional written reflections are never persisted to database records.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5554B8] mt-1.5 shrink-0" />
            <span><strong>No medical profiling:</strong> We never generate clinical diagnoses or share data with insurance or campus administrative records.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5554B8] mt-1.5 shrink-0" />
            <span><strong>Rule-based routing:</strong> Safety escalation is governed by transparent rules, not unpredictable algorithms.</span>
          </li>
        </ul>

        <div className="pt-3 border-t border-[#E8E6F1]/80">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openPrivacyModal}
            leftIcon={<ShieldCheck className="w-4 h-4 text-[#245532]" />}
          >
            Inspect Complete Privacy & Data Inventory
          </Button>
        </div>
      </Card>

      {/* Destructive Action Section: Delete All My Data */}
      <Card padding="lg" className="border-red-200 bg-red-50/30 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-red-700 uppercase tracking-wider">
          <Trash2 className="w-4 h-4" />
          <span>Destructive Zone</span>
        </div>
        <h2 className="text-base font-bold text-[#25233B]">
          Erase All Stored Data
        </h2>
        <p className="text-xs text-[#625F78] leading-relaxed">
          Permanently remove your check-in ratings, study planner sessions, and personal preferences from this device and our servers. This action is irreversible.
        </p>

        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
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
              className="p-3 rounded-button bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{deleteError}</span>
            </div>
          )}

          <p className="text-xs text-[#625F78]">
            To confirm permanent deletion, please type <strong className="text-red-700">DELETE</strong> in the box below:
          </p>

          <input
            type="text"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder="Type DELETE"
            className="w-full px-3 py-2 rounded-input border border-red-300 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
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

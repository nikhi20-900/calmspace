import React, { Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { CompanionActionArea } from '../components/companion/ActionCards';
import { GuidedBreathingPanel } from '../components/companion/GuidedBreathingPanel';
import { useVoiceCompanion } from '../hooks/useVoiceCompanion';
import { usePrivacyModal } from '../context/PrivacyModalContext';
import type { BlobExpression } from '../components/mascot/BlobScene';

const LazyBlobScene = React.lazy(() => import('../components/mascot/BlobScene'));

const STATE_LABELS: Record<string, string> = {
  idle: 'Ready to chat',
  listening: 'Listening to you…',
  thinking: 'Thinking gently…',
  speaking: 'Calm is speaking…',
  breathing: 'Guided breathing',
  support: 'Human support ready',
  error: 'Connection paused',
};

export const CompanionPage: React.FC = () => {
  const { openPrivacyModal } = usePrivacyModal();
  const {
    isSessionActive,
    blobState,
    audioLevel,
    isMicActive,
    isMicMuted,
    isSpeakerMuted,
    micStatus,
    speechInputSupported,
    consentAi,
    setConsentAi,
    aiProvider,
    disclaimer,
    liveSubtitle,
    interimTranscript,
    transcript,
    followUpPrompts,
    actionCards,
    pendingConfirmation,
    supportContacts,
    reminders,
    nowMs,
    errorMessage,
    setErrorMessage,
    isProcessing,
    breathing,
    startConversation,
    endConversation,
    sendMessage,
    interruptSpeaking,
    toggleMicMute,
    toggleSpeakerMute,
    confirmAction,
    startGuidedBreathing,
    stopGuidedBreathing,
    removeReminder,
    dismissReminder,
    snoozeReminder,
  } = useVoiceCompanion();

  const [textInput, setTextInput] = useState('');
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = textInput.trim();
    if (!msg || isProcessing) return;
    setTextInput('');
    await sendMessage(msg, 'text');
  };

  const micUnavailable = micStatus === 'denied' || micStatus === 'unsupported' || !speechInputSupported;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header + Urgent Support Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <PageHeader
          tag="Voice Wellbeing Companion"
          title="Talk with Calm"
          description={disclaimer}
        />

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="tel:14416"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-button bg-[#E9E7FB] text-[#5554B8] text-xs font-semibold hover:bg-[#DCD8F7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Urgent Help: 14416 / 112</span>
          </a>
          <Link
            to="/support"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-button bg-white border border-[#E8E6F1] text-[#25233B] text-xs font-semibold hover:bg-[#F7F6FB] transition-colors"
          >
            <span>Support Directory</span>
          </Link>
        </div>
      </div>

      {/* Main Split Stage: 3D Blob + Controls & Action Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center: 3D Blob Stage, Subtitles, Voice & Text Controls */}
        <Card
          padding="lg"
          className="lg:col-span-7 space-y-5 bg-gradient-to-b from-[#FAF9FE] to-white border-[#E8E6F1]"
        >
          {/* Status & Visible Microphone Active Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8E6F1] shadow-subtle text-xs font-semibold text-[#5554B8]">
              <span
                className={`w-2 h-2 rounded-full ${
                  blobState === 'listening'
                    ? 'bg-emerald-500 animate-ping'
                    : blobState === 'error'
                      ? 'bg-amber-500'
                      : blobState === 'support'
                        ? 'bg-[#245532]'
                        : 'bg-[#5554B8] animate-pulse'
                }`}
              />
              <span>{STATE_LABELS[blobState] || 'Ready'}</span>
            </div>

            <div className="flex items-center gap-2">
              {isMicActive && !isMicMuted && (
                <span
                  role="status"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Mic Active</span>
                </span>
              )}
              {isSessionActive && isMicMuted && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F7F6FB] border border-[#E8E6F1] text-[#625F78] text-[11px] font-medium">
                  <MicOff className="w-3 h-3" />
                  <span>Mic Muted</span>
                </span>
              )}
            </div>
          </div>

          {/* Interactive 3D Blob Stage */}
          <div className="relative w-full h-[300px] sm:h-[360px] rounded-2xl bg-gradient-to-b from-[#F2F0FC]/60 to-transparent">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-44 h-44 rounded-full bg-[#C4BDF8] animate-pulse" />
                </div>
              }
            >
              <LazyBlobScene
                expression={blobState as BlobExpression}
                isBreathingActive={breathing.active}
                audioLevel={audioLevel}
                breathingPhase={breathing.active ? breathing.phase01 : null}
                onBlobClick={() => {
                  if (blobState === 'speaking') {
                    interruptSpeaking();
                  } else if (!isSessionActive) {
                    startConversation();
                  }
                }}
              />
            </Suspense>
          </div>

          {/* Live Subtitles & Interim Speech */}
          <div
            aria-live="polite"
            className="p-4 rounded-xl bg-[#F7F6FB] border border-[#E8E6F1] space-y-2"
          >
            <p className="text-sm sm:text-base font-medium text-[#25233B] leading-relaxed">
              {liveSubtitle}
            </p>
            {interimTranscript && (
              <p className="text-xs text-[#5554B8] italic">
                Hearing: &ldquo;{interimTranscript}&rdquo;
              </p>
            )}
          </div>

          {/* Guided Breathing Interface (when active) */}
          <GuidedBreathingPanel
            breathing={breathing}
            onStop={stopGuidedBreathing}
            onSwitchPattern={(p) => startGuidedBreathing(p)}
          />

          {/* Primary Voice Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {!isSessionActive ? (
              <Button
                variant="primary"
                size="md"
                onClick={startConversation}
                isLoading={isProcessing}
                leftIcon={<Mic className="w-4 h-4" />}
              >
                Start Voice Chat
              </Button>
            ) : (
              <Button
                variant="outline"
                size="md"
                onClick={endConversation}
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                leftIcon={<Square className="w-3.5 h-3.5" />}
              >
                End Conversation
              </Button>
            )}

            <Button
              variant={isMicMuted ? 'outline' : 'secondary'}
              size="md"
              onClick={toggleMicMute}
              disabled={!isSessionActive || micUnavailable}
              aria-pressed={isMicMuted}
              leftIcon={isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            >
              {isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
            </Button>

            <Button
              variant={isSpeakerMuted ? 'outline' : 'secondary'}
              size="md"
              onClick={toggleSpeakerMute}
              aria-pressed={isSpeakerMuted}
              leftIcon={
                isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />
              }
            >
              {isSpeakerMuted ? 'Unmute Voice' : 'Mute Voice'}
            </Button>

            {blobState === 'speaking' && (
              <Button
                variant="primary"
                size="md"
                onClick={interruptSpeaking}
                leftIcon={<Hand className="w-4 h-4" />}
              >
                Interrupt & Speak
              </Button>
            )}

            <Button
              variant={breathing.active ? 'primary' : 'outline'}
              size="md"
              onClick={() =>
                breathing.active ? stopGuidedBreathing() : startGuidedBreathing('calm_4_4')
              }
              leftIcon={<Wind className="w-4 h-4" />}
            >
              {breathing.active ? 'Stop Breathing' : 'Breathe'}
            </Button>
          </div>

          {/* Error or Mic Fallback Banner */}
          {(errorMessage || micUnavailable) && (
            <div
              role="status"
              className="p-3 rounded-xl bg-[#FDF8F0] border border-[#E8CEA5] text-[#7A4D05] text-xs flex items-start justify-between gap-2"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {errorMessage ||
                    'Speech recognition is unavailable or permission was not granted. Text chat below works seamlessly with all of Calm’s tools.'}
                </span>
              </div>
              {errorMessage && (
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-xs font-semibold underline shrink-0"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}

          {/* Contextual Quick Reply Chips */}
          {followUpPrompts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {followUpPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => sendMessage(prompt, 'text')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#D5D1E5] text-[#25233B] hover:bg-[#F2F1FD] hover:border-[#5554B8] transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Text-Based Fallback Input */}
          <form onSubmit={handleTextSubmit} className="flex items-center gap-2 pt-1">
            <label htmlFor="companion-text-input" className="sr-only">
              Message Calm by typing
            </label>
            <input
              id="companion-text-input"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                micUnavailable
                  ? 'Type your message to Calm (text fallback active)...'
                  : 'Or type a message to Calm anytime...'
              }
              maxLength={2000}
              className="flex-1 px-4 py-2.5 rounded-input border border-[#E8E6F1] bg-white text-sm text-[#25233B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!textInput.trim() || isProcessing}
              aria-label="Send message to Calm"
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </form>
        </Card>

        {/* Right Column: Action Cards, Confirmation Gates, Transcript, Privacy */}
        <div className="lg:col-span-5 space-y-4">
          <CompanionActionArea
            pendingConfirmation={pendingConfirmation}
            actionCards={actionCards}
            supportContacts={supportContacts}
            reminders={reminders}
            nowMs={nowMs}
            isProcessing={isProcessing}
            onConfirmAction={confirmAction}
            onSubmitQuickCheckIn={(msg) => sendMessage(msg, 'text')}
            onRemoveReminder={removeReminder}
            onDismissReminder={dismissReminder}
            onSnoozeReminder={snoozeReminder}
          />

          {/* Expandable Session Transcript */}
          <Card padding="md" className="space-y-3 border border-[#E8E6F1]">
            <button
              type="button"
              onClick={() => setTranscriptOpen((v) => !v)}
              aria-expanded={transcriptOpen}
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#25233B]"
            >
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#5554B8]" />
                <span>Session Transcript ({transcript.length})</span>
              </span>
              {transcriptOpen ? (
                <ChevronUp className="w-4 h-4 text-[#625F78]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#625F78]" />
              )}
            </button>

            {transcriptOpen && (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pt-2 border-t border-[#F0EFF7]">
                {transcript.length === 0 ? (
                  <p className="text-xs text-[#625F78] italic">
                    No active turns yet. Transcripts remain in temporary session memory only and clear when you end the chat.
                  </p>
                ) : (
                  transcript.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                        item.role === 'user'
                          ? 'bg-[#E9E7FB]/60 text-[#25233B] ml-4'
                          : 'bg-[#F7F6FB] text-[#25233B] mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold text-[#625F78] mb-0.5">
                        <span>{item.role === 'user' ? 'You' : 'Calm'}</span>
                        <span>{item.timestamp}</span>
                      </div>
                      <p>{item.text}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>

          {/* Privacy & Provider Disclosure Card */}
          <Card padding="md" className="bg-[#FAF9FD] border border-[#E8E6F1] space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#245532]">
              <ShieldCheck className="w-4 h-4" />
              <span>Privacy & Voice Processing</span>
            </div>

            <Toggle
              id="companion-ai-consent"
              label="Allow AI conversational processing"
              description={
                aiProvider === 'gemini'
                  ? 'Sends transient session messages over TLS to Gemini. Disable to use local deterministic guidance only.'
                  : 'Local offline mode is active. Enabling prepares opt-in AI processing when Gemini is configured.'
              }
              checked={consentAi}
              onChange={setConsentAi}
            />

            <ul className="text-[11px] text-[#625F78] space-y-1.5 leading-relaxed pt-1">
              <li className="flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5554B8] shrink-0 mt-0.5" />
                <span>
                  Raw microphone audio is never recorded or saved; browser speech recognition handles voice transcription locally or via your browser&apos;s speech service.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#245532] shrink-0 mt-0.5" />
                <span>
                  Conversation transcripts stay in volatile session memory only and wipe when you click End Conversation. Saving check-ins, study plans, or reminders always asks permission first.
                </span>
              </li>
            </ul>

            <button
              type="button"
              onClick={openPrivacyModal}
              className="text-xs font-semibold text-[#5554B8] hover:underline"
            >
              Inspect Privacy & Data Inventory →
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
};

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
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
import { BLOB_COLORWAYS, readBlobColorway, saveBlobColorway, type BlobColorwayId } from '../components/mascot/blobColorways';

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

const STARTER_PROMPTS = [
  {
    title: 'Talk it out',
    prompt: "I have something on my mind and could use someone to listen.",
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    title: 'Help me feel calmer',
    prompt: "I'm feeling tense. Can you help me feel a little calmer?",
    icon: <Wind className="w-4 h-4" />,
  },
  {
    title: 'Plan one next step',
    prompt: "I feel stuck. Can you help me choose one small next step?",
    icon: <Sparkles className="w-4 h-4" />,
  },
];

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
  const [blobColorwayId, setBlobColorwayId] = useState<BlobColorwayId>(readBlobColorway);
  const activeBlobColorway = BLOB_COLORWAYS.find((choice) => choice.id === blobColorwayId) ?? BLOB_COLORWAYS[0];
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveBlobColorway(blobColorwayId);
  }, [blobColorwayId]);

  useEffect(() => {
    const transcriptElement = transcriptScrollRef.current;
    if (transcriptElement) {
      transcriptElement.scrollTop = transcriptElement.scrollHeight;
    }
  }, [transcript]);

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

      {/* Conversation is the primary workspace; the companion stays present without dominating it. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card
          padding="md"
          className="order-2 lg:order-1 lg:col-span-4 space-y-4 bg-gradient-to-b from-[#FAF9FE] to-white border-[#E8E6F1]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8E6F1] shadow-subtle text-xs font-semibold text-[#5554B8]">
              <span
                className={`w-2 h-2 rounded-full ${
                  blobState === 'listening'
                    ? 'bg-emerald-500 animate-ping'
                    : blobState === 'error'
                      ? 'bg-amber-500'
                      : blobState === 'support'
                        ? 'bg-[#245532]'
                        : 'bg-[#5554B8]'
                }`}
              />
              <span>{STATE_LABELS[blobState] || 'Ready'}</span>
            </div>
            {isMicActive && !isMicMuted && (
              <span role="status" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mic active
              </span>
            )}
            {isSessionActive && isMicMuted && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F7F6FB] border border-[#E8E6F1] text-[#625F78] text-[11px] font-medium">
                <MicOff className="w-3 h-3" /> Mic muted
              </span>
            )}
          </div>

          <div className="relative w-full h-[190px] sm:h-[220px] rounded-2xl bg-gradient-to-b from-[#F2F0FC]/60 to-transparent">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-[#C4BDF8] animate-pulse" />
                </div>
              }
            >
              <LazyBlobScene
                key={activeBlobColorway.id}
                bodyColor={activeBlobColorway.color}
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

          <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Choose Calm's blob color">
            <span className="mr-1 text-[11px] font-semibold text-[#77738F]">Blob color</span>
            {BLOB_COLORWAYS.map((choice) => (
              <button
                key={choice.id}
                type="button"
                aria-label={`${choice.name} blob`}
                aria-pressed={activeBlobColorway.id === choice.id}
                title={`${choice.name} blob`}
                onClick={() => setBlobColorwayId(choice.id)}
                className={`grid h-8 w-8 place-items-center rounded-full border-2 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] focus-visible:ring-offset-2 ${activeBlobColorway.id === choice.id ? 'border-[#5554B8]' : 'border-white shadow-sm'}`}
                style={{ backgroundColor: choice.swatch }}
              >
                {activeBlobColorway.id === choice.id && <span className="h-2 w-2 rounded-full bg-white shadow" />}
              </button>
            ))}
            <span className="sr-only" aria-live="polite">{activeBlobColorway.name} selected</span>
          </div>

          {isSessionActive && (liveSubtitle || interimTranscript) && (
            <div aria-live="polite" className="p-3 rounded-xl bg-[#F7F6FB] border border-[#E8E6F1] space-y-1">
              {liveSubtitle && <p className="text-sm font-medium text-[#25233B] leading-relaxed">{liveSubtitle}</p>}
              {interimTranscript && <p className="text-xs text-[#5554B8] italic">Hearing: &ldquo;{interimTranscript}&rdquo;</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!isSessionActive ? (
              <Button variant="primary" size="md" onClick={startConversation} isLoading={isProcessing} leftIcon={<Mic className="w-4 h-4" />}>
                Start voice chat
              </Button>
            ) : (
              <Button variant="outline" size="md" onClick={endConversation} className="border-rose-200 text-rose-700 hover:bg-rose-50" leftIcon={<Square className="w-3.5 h-3.5" />}>
                End conversation
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
              {isMicMuted ? 'Unmute mic' : 'Mute mic'}
            </Button>
            <Button
              variant={isSpeakerMuted ? 'outline' : 'secondary'}
              size="md"
              onClick={toggleSpeakerMute}
              aria-pressed={isSpeakerMuted}
              leftIcon={isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            >
              {isSpeakerMuted ? 'Unmute voice' : 'Mute voice'}
            </Button>
            {blobState === 'speaking' && (
              <Button variant="primary" size="md" onClick={interruptSpeaking} leftIcon={<Hand className="w-4 h-4" />}>
                Interrupt &amp; speak
              </Button>
            )}
            <Button
              variant={breathing.active ? 'primary' : 'outline'}
              size="md"
              onClick={() => breathing.active ? stopGuidedBreathing() : startGuidedBreathing('calm_4_4')}
              leftIcon={<Wind className="w-4 h-4" />}
            >
              {breathing.active ? 'Stop breathing' : 'Breathe'}
            </Button>
          </div>

          <GuidedBreathingPanel breathing={breathing} onStop={stopGuidedBreathing} onSwitchPattern={(p) => startGuidedBreathing(p)} />

          {(errorMessage || micUnavailable) && (
            <div role="status" className="p-3 rounded-xl bg-[#FDF8F0] border border-[#E8CEA5] text-[#7A4D05] text-xs flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage || 'Speech recognition is unavailable or permission was not granted. You can still chat by typing.'}</span>
              </div>
              {errorMessage && <button type="button" onClick={() => setErrorMessage(null)} className="text-xs font-semibold underline shrink-0">Dismiss</button>}
            </div>
          )}
        </Card>

        <Card
          padding="md"
          className="order-1 lg:order-2 lg:col-span-8 flex flex-col border border-[#E8E6F1] min-h-[500px]"
        >
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F0EFF7]">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#25233B]">
                <MessageSquare className="w-4 h-4 text-[#5554B8]" />
                Your conversation
              </div>
              <p className="text-xs text-[#625F78] mt-1">Messages stay in this temporary session and clear when you end the conversation.</p>
            </div>
            <span className="text-[11px] font-medium text-[#625F78]">{transcript.length} {transcript.length === 1 ? 'message' : 'messages'}</span>
          </div>

          <div ref={transcriptScrollRef} role="log" aria-live="polite" aria-relevant="additions text" aria-label="Conversation messages" className="flex-1 min-h-[300px] max-h-[460px] overflow-y-auto py-4 space-y-3">
            {transcript.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col justify-center">
                <div className="max-w-xl mx-auto text-center">
                  <div className="mx-auto mb-4 w-11 h-11 rounded-2xl bg-[#F0EEFC] text-[#5554B8] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#25233B]">What would help right now?</h2>
                  <p className="text-sm text-[#625F78] mt-1">Choose a starting point, or write whatever is on your mind.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-6">
                  {STARTER_PROMPTS.map((starter) => (
                    <button
                      key={starter.title}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => sendMessage(starter.prompt, 'text')}
                      className="min-h-[88px] flex flex-col items-start justify-between gap-3 p-3 rounded-xl border border-[#E8E6F1] bg-white text-left text-sm font-semibold text-[#3A3755] hover:border-[#BDB7E8] hover:bg-[#FAF9FE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] disabled:opacity-50 transition-colors"
                    >
                      <span className="text-[#5554B8]">{starter.icon}</span>
                      <span>{starter.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              transcript.map((item) => (
                <div
                  key={item.id}
                  className={`max-w-[88%] p-3 rounded-2xl text-sm leading-relaxed ${
                    item.role === 'user'
                      ? 'bg-[#E9E7FB] text-[#25233B] ml-auto rounded-br-md'
                      : 'bg-[#F7F6FB] text-[#25233B] mr-auto rounded-bl-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[10px] font-semibold text-[#625F78] mb-1">
                    <span>{item.role === 'user' ? 'You' : 'Calm'}</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <p>{item.text}</p>
                </div>
              ))
            )}
            {isProcessing && (
              <div role="status" className="w-fit p-3 rounded-2xl rounded-bl-md bg-[#F7F6FB] text-sm text-[#625F78]">
                Calm is thinking…
              </div>
            )}
          </div>

          {transcript.length > 0 && followUpPrompts.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3" aria-label="Suggested follow-up questions">
              {followUpPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => sendMessage(prompt, 'text')}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-[#D5D1E5] text-[#25233B] hover:bg-[#F2F1FD] hover:border-[#5554B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleTextSubmit} className="flex items-center gap-2 pt-3 border-t border-[#F0EFF7]">
            <label htmlFor="companion-text-input" className="sr-only">Message Calm by typing</label>
            <input
              id="companion-text-input"
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Write a message to Calm…"
              maxLength={2000}
              className="flex-1 min-w-0 px-4 py-3 rounded-input border border-[#E8E6F1] bg-white text-sm text-[#25233B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
            />
            <Button type="submit" variant="primary" size="md" disabled={!textInput.trim() || isProcessing} aria-label="Send message to Calm" leftIcon={<Send className="w-4 h-4" />}>
              Send
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
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

        <Card padding="md" className="bg-[#FAF9FD] border border-[#E8E6F1] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#245532]">
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy &amp; Voice Processing</span>
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
              <span>Raw microphone audio is never recorded or saved; browser speech recognition handles voice transcription locally or via your browser&apos;s speech service.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#245532] shrink-0 mt-0.5" />
              <span>Conversation transcripts stay in volatile session memory only and wipe when you click End Conversation. Saving check-ins, study plans, or reminders always asks permission first.</span>
            </li>
          </ul>
          <button type="button" onClick={openPrivacyModal} className="text-xs font-semibold text-[#5554B8] hover:underline">
            Inspect Privacy &amp; Data Inventory →
          </button>
        </Card>
      </div>
    </div>
  );
};

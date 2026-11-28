import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import {
  createBrowserSpeechInput,
  createBrowserSpeechOutput,
  isMicrophoneApiSupported,
  isSpeechInputSupported,
  isSpeechOutputSupported,
  MicMonitorHandle,
  startMicAmplitudeMonitor,
} from '../services/voiceService';
import {
  BlobVisualState,
  CompanionActionCard,
  CompanionTurnResponse,
  PendingConfirmation,
  SupportContact,
} from '../types';
import { notifyRemindersUpdated, useReminderScheduler } from './useReminderScheduler';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface BreathingSessionState {
  active: boolean;
  label: string;
  pattern: string;
  inhaleSeconds: number;
  holdSeconds: number;
  exhaleSeconds: number;
  holdAfterExhaleSeconds: number;
  phaseLabel: 'Inhale' | 'Hold' | 'Exhale' | 'Rest';
  secondsInPhase: number;
  phase01: number;
  cyclesCompleted: number;
}

export type MicStatus = 'idle' | 'granted' | 'denied' | 'unsupported';

export function useVoiceCompanion() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [blobState, setBlobState] = useState<BlobVisualState>('idle');
  const [audioLevel, setAudioLevel] = useState(0);

  const [isMicActive, setIsMicActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [micStatus, setMicStatus] = useState<MicStatus>(() =>
    isSpeechInputSupported() && isMicrophoneApiSupported() ? 'idle' : 'unsupported'
  );

  const [consentAi, setConsentAi] = useState(true);
  const [aiProvider, setAiProvider] = useState<string>('mock');
  const [disclaimer, setDisclaimer] = useState(
    'Calm is an AI wellbeing companion, not a human, therapist, or medical professional.'
  );

  const [liveSubtitle, setLiveSubtitle] = useState(
    'Press "Start Voice Chat" or type below whenever you are ready.'
  );
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [followUpPrompts, setFollowUpPrompts] = useState<string[]>([
    "Hi, how are you?",
    "I'm really stressed about my exams",
    "Help me relax",
  ]);
  const [actionCards, setActionCards] = useState<CompanionActionCard[]>([]);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [supportContacts, setSupportContacts] = useState<SupportContact[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    reminders,
    setReminders,
    dueReminders,
    nowMs,
    refreshReminders,
    dismissReminder,
    snoozeReminder,
    removeReminder: deleteReminderFromScheduler,
  } = useReminderScheduler({ muteChime: isSpeakerMuted });

  const [breathing, setBreathing] = useState<BreathingSessionState>({
    active: false,
    label: 'Gentle 4-4 Breathing',
    pattern: 'calm_4_4',
    inhaleSeconds: 4,
    holdSeconds: 0,
    exhaleSeconds: 4,
    holdAfterExhaleSeconds: 0,
    phaseLabel: 'Inhale',
    secondsInPhase: 4,
    phase01: 0,
    cyclesCompleted: 0,
  });

  // Mutable refs to prevent feedback loops & stale closures
  const speechInRef = useRef(createBrowserSpeechInput());
  const speechOutRef = useRef(createBrowserSpeechOutput());
  const micMonitorRef = useRef<MicMonitorHandle | null>(null);
  const sessionActiveRef = useRef(false);
  const micMutedRef = useRef(false);
  const micStatusRef = useRef<MicStatus>(micStatus);
  const speakerMutedRef = useRef(false);
  const speakingRef = useRef(false);
  const breathingActiveRef = useRef(false);
  const supportModeRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const consentAiRef = useRef(true);
  const resumeTimerRef = useRef<number | null>(null);
  const micLevelRef = useRef(0);
  const speakLevelRef = useRef(0);

  useEffect(() => {
    sessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);
  useEffect(() => {
    micMutedRef.current = isMicMuted;
  }, [isMicMuted]);
  useEffect(() => {
    micStatusRef.current = micStatus;
  }, [micStatus]);
  useEffect(() => {
    speakerMutedRef.current = isSpeakerMuted;
  }, [isSpeakerMuted]);
  useEffect(() => {
    breathingActiveRef.current = breathing.active;
  }, [breathing.active]);
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);
  useEffect(() => {
    consentAiRef.current = consentAi;
  }, [consentAi]);

  const stopListeningHardware = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
    speechInRef.current.abort();
    micMonitorRef.current?.stop();
    micMonitorRef.current = null;
    micLevelRef.current = 0;
    setIsMicActive(false);
    setInterimTranscript('');
    if (!speakingRef.current) {
      setAudioLevel(0);
    }
  }, []);

  // Forward declarations via refs so recognition callbacks can trigger turn submission
  const submitMessageRef = useRef<(text: string, mode: 'voice' | 'text') => Promise<void>>(
    async () => {}
  );

  const beginListeningCycle = useCallback(async () => {
    if (
      !sessionActiveRef.current ||
      micMutedRef.current ||
      speakingRef.current ||
      breathingActiveRef.current
    ) {
      return;
    }
    if (!isSpeechInputSupported() || !isMicrophoneApiSupported()) {
      setMicStatus('unsupported');
      setIsMicActive(false);
      return;
    }

    try {
      if (!micMonitorRef.current) {
        micMonitorRef.current = await startMicAmplitudeMonitor((lvl) => {
          micLevelRef.current = lvl;
          if (!speakingRef.current) {
            setAudioLevel(lvl);
          }
        });
      }
      micStatusRef.current = 'granted';
      setMicStatus('granted');
      setErrorMessage(null);
      setIsMicActive(true);
      if (!supportModeRef.current) {
        setBlobState('listening');
      }

      speechInRef.current.start({
        onInterim: (partial) => {
          if (speakingRef.current) return;
          setInterimTranscript(partial);
        },
        onFinal: (finalText) => {
          if (speakingRef.current) return;
          setInterimTranscript('');
          speechInRef.current.stop();
          setIsMicActive(false);
          submitMessageRef.current(finalText, 'voice');
        },
        onError: (code) => {
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            micStatusRef.current = 'denied';
            setMicStatus('denied');
            setIsMicActive(false);
            stopListeningHardware();
            setBlobState(supportModeRef.current ? 'support' : 'idle');
            setErrorMessage(
              'Microphone permission was denied. You can continue chatting by typing below.'
            );
          } else if (code === 'audio-capture') {
            micStatusRef.current = 'unsupported';
            setMicStatus('unsupported');
            setIsMicActive(false);
            stopListeningHardware();
            setErrorMessage(
              'No working microphone was detected. Text chat remains available below.'
            );
          } else if (code === 'no-speech') {
            // Quiet silence — restart listening gently if still active
            setIsMicActive(false);
          } else if (code !== 'aborted') {
            setIsMicActive(false);
          }
        },
        onEnd: () => {
          setIsMicActive(false);
          // Re-arm SpeechRecognition automatically when still actively listening
          if (
            sessionActiveRef.current &&
            !micMutedRef.current &&
            !speakingRef.current &&
            !breathingActiveRef.current &&
            micStatusRef.current === 'granted' &&
            micMonitorRef.current !== null
          ) {
            resumeTimerRef.current = window.setTimeout(() => {
              beginListeningCycle();
            }, 220);
          }
        },
      });
    } catch {
      micStatusRef.current = 'denied';
      setMicStatus('denied');
      setIsMicActive(false);
      stopListeningHardware();
      setBlobState(supportModeRef.current ? 'support' : 'idle');
      setErrorMessage(
        'Microphone access is unavailable or blocked. Use the text box below to chat with Calm.'
      );
    }
  }, [stopListeningHardware]);

  const speakResponse = useCallback(
    (text: string, targetBlobState: BlobVisualState = 'speaking') => {
      // Echo-loop prevention: stop STT BEFORE TTS starts
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
      speechInRef.current.abort();
      setIsMicActive(false);
      speakingRef.current = true;
      setLiveSubtitle(text);
      if (targetBlobState !== 'support' && targetBlobState !== 'breathing') {
        setBlobState('speaking');
      } else {
        setBlobState(targetBlobState);
      }

      speechOutRef.current.speak(text, {
        muted: speakerMutedRef.current,
        onLevel: (lvl) => {
          speakLevelRef.current = lvl;
          if (speakingRef.current) {
            setAudioLevel(lvl);
          }
        },
        onEnd: () => {
          speakingRef.current = false;
          speakLevelRef.current = 0;
          setAudioLevel(0);

          if (!sessionActiveRef.current) {
            setBlobState('idle');
            return;
          }
          if (breathingActiveRef.current) {
            setBlobState('breathing');
            return;
          }
          if (supportModeRef.current) {
            setBlobState('support');
          } else {
            setBlobState('idle');
          }

          // Echo-tail guard (250ms) before automatically resuming listening
          if (
            !micMutedRef.current &&
            micStatusRef.current !== 'denied' &&
            micStatusRef.current !== 'unsupported'
          ) {
            resumeTimerRef.current = window.setTimeout(() => {
              beginListeningCycle();
            }, 250);
          }
        },
        onError: () => {
          speakingRef.current = false;
          speakLevelRef.current = 0;
          setAudioLevel(0);
          setBlobState(supportModeRef.current ? 'support' : 'idle');
        },
      });
    },
    [beginListeningCycle]
  );

  const appendTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    setTranscript((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, []);

  const applyTurnResponse = useCallback(
    (res: CompanionTurnResponse) => {
      setConversationId(res.conversation_id);
      setAiProvider(res.ai_provider);
      setDisclaimer(res.disclaimer);
      setFollowUpPrompts(res.follow_up_prompts || []);
      setPendingConfirmation(res.pending_confirmation || null);

      if (res.support_contacts && res.support_contacts.length > 0) {
        setSupportContacts(res.support_contacts);
      }

      if (res.action_cards && res.action_cards.length > 0) {
        setActionCards((prev) => [...res.action_cards, ...prev].slice(0, 6));
        // Sync guided breathing card with 3D blob breathing timer
        const breathCard = res.action_cards.find((c) => c.card_type === 'breathing');
        if (breathCard) {
          setBreathing({
            active: true,
            label: String(breathCard.data.label || 'Guided Breathing'),
            pattern: String(breathCard.data.pattern || 'calm_4_4'),
            inhaleSeconds: Number(breathCard.data.inhale_seconds || 4),
            holdSeconds: Number(breathCard.data.hold_seconds || 0),
            exhaleSeconds: Number(breathCard.data.exhale_seconds || 4),
            holdAfterExhaleSeconds: Number(breathCard.data.hold_after_exhale_seconds || 0),
            phaseLabel: 'Inhale',
            secondsInPhase: Number(breathCard.data.inhale_seconds || 4),
            phase01: 0,
            cyclesCompleted: 0,
          });
        }
        if (res.action_cards.some((c) => c.card_type === 'reminder')) {
          refreshReminders();
          notifyRemindersUpdated();
        }
      }

      const isSupport =
        res.blob_state === 'support' ||
        res.safety?.route === 'HIGH' ||
        res.safety?.crisis_flag;
      supportModeRef.current = Boolean(isSupport);

      appendTranscript('assistant', res.reply);
      speakResponse(res.reply, isSupport ? 'support' : res.blob_state);
    },
    [appendTranscript, speakResponse]
  );

  const sendMessage = useCallback(
    async (text: string, mode: 'voice' | 'text' = 'text') => {
      const cleaned = text.trim();
      if (!cleaned || isProcessing) return;

      setErrorMessage(null);
      setIsProcessing(true);
      speechOutRef.current.stop();
      speechInRef.current.abort();
      speakingRef.current = false;
      setIsMicActive(false);

      if (!sessionActiveRef.current) {
        setIsSessionActive(true);
        sessionActiveRef.current = true;
      }

      setBlobState('thinking');
      setLiveSubtitle('Calm is thinking...');
      appendTranscript('user', cleaned);

      try {
        const res = await api.sendCompanionTurn({
          conversation_id: conversationIdRef.current,
          message: cleaned,
          consent_ai_processing: consentAiRef.current,
          input_mode: mode,
        });
        applyTurnResponse(res);
      } catch (err: any) {
        setBlobState('error');
        const msg =
          err?.message ||
          'Calm could not reach the server right now. Verified support resources remain available below.';
        setErrorMessage(msg);
        setLiveSubtitle(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [appendTranscript, applyTurnResponse, isProcessing]
  );

  useEffect(() => {
    submitMessageRef.current = sendMessage;
  }, [sendMessage]);

  const startConversation = useCallback(async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    supportModeRef.current = false;
    setIsSessionActive(true);
    sessionActiveRef.current = true;
    setIsMicMuted(false);
    micMutedRef.current = false;
    setBlobState('thinking');

    try {
      const startRes = await api.startCompanion();
      setConversationId(startRes.conversation_id);
      conversationIdRef.current = startRes.conversation_id;
      setAiProvider(startRes.ai_provider);
      setDisclaimer(startRes.disclaimer);
      setReminders(startRes.reminders || []);
      setFollowUpPrompts(startRes.follow_up_prompts || []);
      setTranscript([
        {
          id: `greet-${Date.now()}`,
          role: 'assistant',
          text: startRes.greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Request mic permission early only if supported; fallback gracefully if denied
      if (isSpeechInputSupported() && isMicrophoneApiSupported()) {
        try {
          if (!micMonitorRef.current) {
            micMonitorRef.current = await startMicAmplitudeMonitor((lvl) => {
              micLevelRef.current = lvl;
              if (!speakingRef.current) {
                setAudioLevel(lvl);
              }
            });
          }
            micStatusRef.current = 'granted';
            setMicStatus('granted');
          } catch {
            micStatusRef.current = 'denied';
            setMicStatus('denied');
            setErrorMessage(
              'Microphone access was not granted — text chat fallback is active below.'
            );
          }
        } else {
          micStatusRef.current = 'unsupported';
          setMicStatus('unsupported');
        }

      speakResponse(startRes.greeting, 'speaking');
    } catch (err: any) {
      sessionActiveRef.current = false;
      setIsSessionActive(false);
      setBlobState('error');
      setErrorMessage(
        err?.message ||
          'Unable to start voice session with the server. Verified helplines remain accessible below.'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [speakResponse]);

  const endConversation = useCallback(async () => {
    const activeCid = conversationIdRef.current;
    sessionActiveRef.current = false;
    setIsSessionActive(false);
    speakingRef.current = false;
    supportModeRef.current = false;

    speechOutRef.current.stop();
    stopListeningHardware();

    setBreathing((prev) => ({ ...prev, active: false }));
    setBlobState('idle');
    setAudioLevel(0);
    setPendingConfirmation(null);
    setActionCards([]);
    setSupportContacts([]);
    setTranscript([]);
    setErrorMessage(null);
    setConversationId(null);
    conversationIdRef.current = null;
    setLiveSubtitle('Conversation ended and temporary transcript cleared.');

    if (activeCid) {
      api.endCompanionSession(activeCid).catch(() => {});
    }
  }, [stopListeningHardware]);

  const interruptSpeaking = useCallback(() => {
    if (!speakingRef.current) return;
    speechOutRef.current.stop();
    speakingRef.current = false;
    setAudioLevel(0);
    if (sessionActiveRef.current && !micMutedRef.current) {
      beginListeningCycle();
    } else {
      setBlobState('idle');
    }
  }, [beginListeningCycle]);

  const toggleMicMute = useCallback(() => {
    const nextMuted = !micMutedRef.current;
    setIsMicMuted(nextMuted);
    micMutedRef.current = nextMuted;
    if (nextMuted) {
      stopListeningHardware();
      if (!speakingRef.current && !breathingActiveRef.current) {
        setBlobState(supportModeRef.current ? 'support' : 'idle');
      }
    } else if (sessionActiveRef.current && !speakingRef.current && !breathingActiveRef.current) {
      beginListeningCycle();
    }
  }, [beginListeningCycle, stopListeningHardware]);

  const toggleSpeakerMute = useCallback(() => {
    const nextMuted = !speakerMutedRef.current;
    setIsSpeakerMuted(nextMuted);
    speakerMutedRef.current = nextMuted;
    if (nextMuted && speakingRef.current) {
      speechOutRef.current.stop();
      speakingRef.current = false;
      setAudioLevel(0);
      if (sessionActiveRef.current && !micMutedRef.current) {
        beginListeningCycle();
      }
    }
  }, [beginListeningCycle]);

  const confirmAction = useCallback(
    async (approved: boolean) => {
      if (!pendingConfirmation || !conversationIdRef.current) return;
      const actionId = pendingConfirmation.action_id;
      const cid = conversationIdRef.current;
      setIsProcessing(true);
      setBlobState('thinking');
      try {
        const res = await api.confirmCompanionAction({
          conversation_id: cid,
          action_id: actionId,
          approved,
        });
        applyTurnResponse(res);
      } catch (err: any) {
        setBlobState('error');
        setErrorMessage(
          err?.message || 'Could not save that action right now. Nothing was changed.'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [applyTurnResponse, pendingConfirmation]
  );

  const startGuidedBreathing = useCallback(
    (pattern: 'calm_4_4' | 'box' | '4-7-8' = 'calm_4_4') => {
      speechOutRef.current.stop();
      speakingRef.current = false;
      speechInRef.current.abort();
      setIsMicActive(false);

      const presets = {
        calm_4_4: { label: 'Gentle 4-4 Breathing', i: 4, h: 0, e: 4, h2: 0 },
        box: { label: 'Box Breathing (4-4-4-4)', i: 4, h: 4, e: 4, h2: 4 },
        '4-7-8': { label: 'Calming 4-7-8 Breath', i: 4, h: 7, e: 8, h2: 0 },
      }[pattern];

      setBreathing({
        active: true,
        label: presets.label,
        pattern,
        inhaleSeconds: presets.i,
        holdSeconds: presets.h,
        exhaleSeconds: presets.e,
        holdAfterExhaleSeconds: presets.h2,
        phaseLabel: 'Inhale',
        secondsInPhase: presets.i,
        phase01: 0,
        cyclesCompleted: 0,
      });
      setBlobState('breathing');
      setLiveSubtitle('Breathe along with Calm — inhale gently, exhale slowly.');
    },
    []
  );

  const stopGuidedBreathing = useCallback(() => {
    setBreathing((prev) => ({ ...prev, active: false, phase01: 0 }));
    if (sessionActiveRef.current && !micMutedRef.current) {
      beginListeningCycle();
    } else {
      setBlobState(supportModeRef.current ? 'support' : 'idle');
    }
  }, [beginListeningCycle]);

  // Real-time breathing phase tick synced to 3D blob expansion/contraction
  useEffect(() => {
    if (!breathing.active) return;
    const { inhaleSeconds, holdSeconds, exhaleSeconds, holdAfterExhaleSeconds } = breathing;
    const cycleTotal =
      inhaleSeconds + holdSeconds + exhaleSeconds + holdAfterExhaleSeconds;
    if (cycleTotal <= 0) return;

    const startTime = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const cyclesCompleted = Math.floor(elapsed / cycleTotal);
      const t = elapsed % cycleTotal;

      let phaseLabel: BreathingSessionState['phaseLabel'] = 'Inhale';
      let secondsInPhase = 1;
      let phase01 = 0;

      if (t < inhaleSeconds) {
        phaseLabel = 'Inhale';
        secondsInPhase = Math.ceil(inhaleSeconds - t);
        phase01 = t / inhaleSeconds;
      } else if (t < inhaleSeconds + holdSeconds) {
        phaseLabel = 'Hold';
        secondsInPhase = Math.ceil(inhaleSeconds + holdSeconds - t);
        phase01 = 1;
      } else if (t < inhaleSeconds + holdSeconds + exhaleSeconds) {
        const et = t - inhaleSeconds - holdSeconds;
        phaseLabel = 'Exhale';
        secondsInPhase = Math.ceil(exhaleSeconds - et);
        phase01 = 1 - et / exhaleSeconds;
      } else {
        const ht = t - inhaleSeconds - holdSeconds - exhaleSeconds;
        phaseLabel = 'Rest';
        secondsInPhase = Math.ceil(holdAfterExhaleSeconds - ht);
        phase01 = 0;
      }

      setBreathing((prev) =>
        prev.active
          ? { ...prev, phaseLabel, secondsInPhase, phase01, cyclesCompleted }
          : prev
      );
    }, 50);

    return () => window.clearInterval(timer);
  }, [
    breathing.active,
    breathing.inhaleSeconds,
    breathing.holdSeconds,
    breathing.exhaleSeconds,
    breathing.holdAfterExhaleSeconds,
  ]);

  // Ensure all audio & mic resources are released on unmount
  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      speechOutRef.current.stop();
      stopListeningHardware();
      if (conversationIdRef.current) {
        api.endCompanionSession(conversationIdRef.current).catch(() => {});
      }
    };
  }, [stopListeningHardware]);

  const removeReminder = useCallback(
    async (id: string) => {
      try {
        await deleteReminderFromScheduler(id);
      } catch {
        setErrorMessage('Unable to remove reminder right now.');
      }
    },
    [deleteReminderFromScheduler]
  );

  return {
    isSessionActive,
    conversationId,
    blobState,
    audioLevel,
    isMicActive,
    isMicMuted,
    isSpeakerMuted,
    micStatus,
    speechInputSupported: isSpeechInputSupported(),
    speechOutputSupported: isSpeechOutputSupported(),
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
    dueReminders,
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
  };
}

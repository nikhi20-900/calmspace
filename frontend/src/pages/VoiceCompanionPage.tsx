// Legacy local prototype retained while the merged CompanionPage is the active route.
// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Check, Headphones, Heart, Mic, MicOff, Phone, Send, ShieldCheck, Sparkles, Square, Volume2, VolumeX } from 'lucide-react';
import { BlobScene } from '../components/mascot/BlobScene';
import { PetScene } from '../components/mascot/PetScene';
import { api, CompanionMessage, CompanionTurnResponse } from '../services/api';

type SpeechRecognitionResultEvent = Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };

interface ChatLine extends CompanionMessage {
  id: number;
  action?: CompanionTurnResponse['action'];
  supportContacts?: CompanionTurnResponse['support_contacts'];
  route?: CompanionTurnResponse['route'];
}

const greetingFor = (name: string): ChatLine => ({ id: 0, role: 'assistant', content: `Hi, I'm ${name || 'Calm'}, your Calmspace wellbeing companion. I'm here to listen. How are you feeling today?` });

const AVATARS = [
  { id: 'lavender', label: 'Lavender blob', kind: 'blob', color: 0xa79de3, swatch: '#B9B2F0', emoji: '✦' },
  { id: 'mint', label: 'Mint blob', kind: 'blob', color: 0x8bc9b3, swatch: '#A9DCCB', emoji: '✿' },
  { id: 'peach', label: 'Peach blob', kind: 'blob', color: 0xe9a98f, swatch: '#F1BBA2', emoji: '♥' },
  { id: 'cat', label: 'Cat', kind: 'pet', color: 0, swatch: '#F5E7D8', emoji: '🐱' },
  { id: 'dog', label: 'Dog', kind: 'pet', color: 0, swatch: '#E8E2D5', emoji: '🐶' },
] as const;

const selectNaturalVoice = (): SpeechSynthesisVoice | undefined => {
  if (!('speechSynthesis' in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const language = (navigator.language || 'en-US').toLowerCase().split('-')[0];
  const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(language));
  const candidates = matching.length ? matching : voices;
  const score = (voice: SpeechSynthesisVoice) => {
    const name = voice.name.toLowerCase();
    return (/(natural|neural|enhanced|premium)/.test(name) ? 5 : 0)
      + (/(google|aria|jenny|samantha|ava)/.test(name) ? 2 : 0)
      + (voice.default ? 1 : 0)
      - (/(novelty|whisper|compact)/.test(name) ? 3 : 0);
  };
  return candidates.sort((a, b) => score(b) - score(a))[0];
};

const readCompanionProfile = () => {
  try {
    const saved = localStorage.getItem('calmspace-companion-profile');
    if (saved) {
      const profile = JSON.parse(saved) as { name?: string; avatarId?: string };
      return {
        name: typeof profile.name === 'string' ? profile.name.slice(0, 24) : 'Calm',
        avatarId: AVATARS.some((avatar) => avatar.id === profile.avatarId) ? profile.avatarId! : 'lavender',
      };
    }
  } catch { /* storage can be unavailable in private browsing; use the defaults */ }
  return { name: 'Calm', avatarId: 'lavender' };
};

const readVoicePreferences = () => {
  try {
    const saved = localStorage.getItem('calmspace-voice-preferences');
    if (saved) {
      const preferences = JSON.parse(saved) as { voiceURI?: string; rate?: number };
      return {
        voiceURI: typeof preferences.voiceURI === 'string' ? preferences.voiceURI : '',
        rate: typeof preferences.rate === 'number' ? Math.min(1.15, Math.max(0.8, preferences.rate)) : 0.9,
      };
    }
  } catch { /* voice preferences can remain temporary if storage is unavailable */ }
  return { voiceURI: '', rate: 0.9 };
};

type RitualChoice = 'good' | 'stressed' | 'tired';

const RITUAL_MESSAGES: Record<RitualChoice, string> = {
  good: "I'm feeling good today.",
  stressed: "I'm feeling stressed today and could use a gentle reset.",
  tired: "I'm feeling tired today and need a small, manageable next step.",
};

export const VoiceCompanionPage: React.FC = () => {
  const navigate = useNavigate();
  const [initialProfile] = useState(readCompanionProfile);
  const [companionName, setCompanionName] = useState(initialProfile.name);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(initialProfile.avatarId);
  const selectedAvatar = AVATARS.find((avatar) => avatar.id === selectedAvatarId) ?? AVATARS[0];
  const [lines, setLines] = useState<ChatLine[]>([greetingFor(initialProfile.name)]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [shareWithGemini, setShareWithGemini] = useState(false);
  const [shareWithElevenLabs, setShareWithElevenLabs] = useState(false);
  const [activeVoiceProvider, setActiveVoiceProvider] = useState<'browser' | 'elevenlabs'>('browser');
  const [voiceStatus, setVoiceStatus] = useState('Using your device voice.');
  const [voicePreferences] = useState(readVoicePreferences);
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(voicePreferences.voiceURI);
  const [speechRate, setSpeechRate] = useState(voicePreferences.rate);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [breathing, setBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState('Ready when you are');
  const [ritualChoice, setRitualChoice] = useState<RitualChoice | null>(null);
  const [sessionMoments, setSessionMoments] = useState(0);
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return sessionStorage.getItem('calmspace-companion-welcome') !== 'seen'; }
    catch { return true; }
  });
  const [error, setError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const speakingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const meterFrameRef = useRef<number>(0);
  const lineIdRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(text: string) => Promise<void>>(async () => undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem('calmspace-companion-profile', JSON.stringify({ name: companionName.trim() || 'Calm', avatarId: selectedAvatarId })); }
    catch { /* the profile still works for this visit if storage is unavailable */ }
  }, [companionName, selectedAvatarId]);

  useEffect(() => {
    try { localStorage.setItem('calmspace-voice-preferences', JSON.stringify({ voiceURI: selectedVoiceURI, rate: speechRate })); }
    catch { /* preferences still apply for this visit if storage is unavailable */ }
  }, [selectedVoiceURI, speechRate]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => setDeviceVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    setLines((current) => current.length === 1 && current[0].id === 0 ? [greetingFor(companionName.trim())] : current);
  }, [companionName]);

  const releaseProviderAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
  }, []);

  const getPreferredVoice = useCallback(() => (
    deviceVoices.find((voice) => voice.voiceURI === selectedVoiceURI) ?? selectNaturalVoice()
  ), [deviceVoices, selectedVoiceURI]);

  const stopMeter = useCallback(() => {
    cancelAnimationFrame(meterFrameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setVoiceLevel(0);
  }, []);

  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let lastPaint = 0;
      const sample = (now: number) => {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (const value of samples) energy += (value - 128) ** 2;
        if (now - lastPaint > 90) {
          setVoiceLevel(Math.min(1, Math.sqrt(energy / samples.length) / 26));
          lastPaint = now;
        }
        meterFrameRef.current = requestAnimationFrame(sample);
      };
      meterFrameRef.current = requestAnimationFrame(sample);
      stream.getTracks().forEach((track) => track.addEventListener('ended', () => void audioContext.close(), { once: true }));
    } catch {
      setError('Microphone access is unavailable. You can keep chatting by text.');
    }
  }, []);

  const listen = useCallback(() => {
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in this browser. Text chat is ready below.');
      setListening(false);
      activeRef.current = false;
      setVoiceActive(false);
      stopMeter();
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) void sendRef.current(transcript);
      };
      recognition.onerror = () => {
        setListening(false);
        if (activeRef.current) setError('I could not hear that clearly. Try again or use the text box.');
      };
      recognition.onend = () => {
        setListening(false);
      };
      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setError('Voice input could not start. You can continue by text.');
    }
  // sendMessage is assigned below and kept current through a ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopMeter]);

  const speak = useCallback((text: string, audioBase64?: string | null) => {
    if (!voiceActive || muted) return;
    window.speechSynthesis?.cancel();
    releaseProviderAudio();
    speakingRef.current = true;
    setSpeaking(true);
    const speakWithBrowser = () => {
      if (!('speechSynthesis' in window)) {
        speakingRef.current = false;
        setSpeaking(false);
        return;
      }
      setActiveVoiceProvider('browser');
      setVoiceStatus('Using your selected device voice.');
      speakingRef.current = true;
      setSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      const selectedVoice = getPreferredVoice();
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = speechRate;
      utterance.pitch = 1.04;
      utterance.onboundary = () => setVoiceLevel((level) => Math.max(level, 0.28));
      utterance.onend = () => {
        speakingRef.current = false;
        setSpeaking(false);
        if (activeRef.current) window.setTimeout(() => listen(), 250);
      };
      utterance.onerror = () => {
        speakingRef.current = false;
        setSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    };
    if (audioBase64) {
      try {
        const raw = window.atob(audioBase64);
        const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
        audioUrlRef.current = URL.createObjectURL(
          new Blob([bytes], { type: 'audio/mpeg' })
        );
        const audio = new Audio(audioUrlRef.current);
        audioRef.current = audio;
        audio.onended = () => {
          releaseProviderAudio();
          speakingRef.current = false;
          setSpeaking(false);
          if (activeRef.current) window.setTimeout(() => listen(), 250);
        };
        audio.onerror = () => {
          releaseProviderAudio();
          speakingRef.current = false;
          setSpeaking(false);
          speakWithBrowser();
        };
        void audio.play().catch(() => {
          releaseProviderAudio();
          speakingRef.current = false;
          setSpeaking(false);
          speakWithBrowser();
        });
        return;
      } catch {
        releaseProviderAudio();
      }
    }
    speakWithBrowser();
  }, [getPreferredVoice, listen, muted, releaseProviderAudio, speechRate, voiceActive]);

  const sendMessage = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setError('');
    setInput('');
    recognitionRef.current?.stop();
    setListening(false);
    const userLine: ChatLine = { id: lineIdRef.current++, role: 'user', content: clean };
    const previous = lines;
    setLines((current) => [...current, userLine]);
    setBusy(true);
    try {
      const response = await api.companionTurn({
        message: clean,
        history: previous.slice(-12).map(({ role, content }) => ({ role, content })),
        consent_ai_processing: shareWithGemini,
        consent_voice_processing: shareWithElevenLabs,
        voice_response: voiceActive && !muted,
      });
      const assistantLine: ChatLine = {
        id: lineIdRef.current++, role: 'assistant', content: response.reply,
        action: response.action, supportContacts: response.support_contacts, route: response.route,
      };
      setActiveVoiceProvider(response.voice_provider);
      setVoiceStatus(response.voice_provider === 'elevenlabs' ? 'Using the selected ElevenLabs voice.' : 'Using your selected device voice.');
      setVoiceStatus(response.voice_status);
      setLines((current) => [...current, assistantLine]);
      try {
        speak(response.reply, response.speech_audio_base64);
      } catch {
        setError('I got your reply, but could not play it aloud. You can read it above.');
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Calm is temporarily unavailable.';
      setError(message);
      const fallback: ChatLine = { id: lineIdRef.current++, role: 'assistant', content: 'I could not reach the companion service right now. You can try again, keep using the planner, or open support options.' };
      setLines((current) => [...current, fallback]);
      try {
        speak(fallback.content);
      } catch {
        // Keep the service error separate from an independent speech playback issue.
      }
    } finally {
      setBusy(false);
    }
  }, [busy, lines, muted, shareWithElevenLabs, shareWithGemini, speak, voiceActive]);
  sendRef.current = sendMessage;

  const chooseRitual = useCallback((choice: RitualChoice) => {
    setRitualChoice(choice);
    setSessionMoments((current) => current + 1);
    void sendMessage(RITUAL_MESSAGES[choice]);
  }, [sendMessage]);

  const completeWelcome = useCallback(() => {
    setShowWelcome(false);
    try { sessionStorage.setItem('calmspace-companion-welcome', 'seen'); }
    catch { /* this visit can still continue without browser storage */ }
  }, []);

  useEffect(() => {
    // The browser recognition callback delegates to the latest async turn handler.
    const speechWindow = window as SpeechWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognition || !voiceActive || speaking) return;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) void sendRef.current(transcript);
      };
    }
  }, [voiceActive, speaking]);

  useEffect(() => {
    activeRef.current = voiceActive;
  }, [voiceActive]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [lines, busy]);

  useEffect(() => {
    if (!breathing) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const phase = Math.floor(((Date.now() - started) / 1000) % 8);
      setBreathPhase(phase < 4 ? 'Breathe in gently' : 'Breathe out slowly');
    }, 250);
    return () => window.clearInterval(timer);
  }, [breathing]);

  useEffect(() => () => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    releaseProviderAudio();
    stopMeter();
  }, [releaseProviderAudio, stopMeter]);

  const startVoice = async () => {
    setVoiceActive(true);
    activeRef.current = true;
    setError('');
    await startMeter();
    if (!activeRef.current) {
      stopMeter();
      return;
    }
    if (!muted && 'speechSynthesis' in window) {
      const opening = new SpeechSynthesisUtterance(greetingFor(companionName.trim()).content);
      const selectedVoice = getPreferredVoice();
      if (selectedVoice) opening.voice = selectedVoice;
      setVoiceStatus(`Using ${selectedVoice?.name || 'your automatic device voice'}.`);
      opening.rate = speechRate;
      opening.pitch = 1.04;
      opening.onend = () => { if (activeRef.current) listen(); };
      window.speechSynthesis.speak(opening);
    } else {
      listen();
    }
  };

  const stopVoice = () => {
    activeRef.current = false;
    setVoiceActive(false);
    setListening(false);
    setSpeaking(false);
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    releaseProviderAudio();
    stopMeter();
  };

  const handleAction = async (line: ChatLine) => {
    const action = line.action;
    if (!action) return;
    if (action.name === 'start_breathing') {
      setBreathing((current) => {
        if (!current) setSessionMoments((moments) => moments + 1);
        return !current;
      });
      setBreathPhase(breathing ? 'Ready when you are' : 'Breathe in gently');
    } else if (action.name === 'start_checkin') navigate('/checkin');
    else if (action.name === 'get_wellbeing_insights') navigate('/insights');
    else if (action.name === 'generate_study_plan') navigate('/planner');
    else if (action.name === 'get_support_resources') navigate('/support');
    else if (action.name === 'create_reminder') {
      try {
        await api.confirmCompanionReminder();
        const result: ChatLine = { id: lineIdRef.current++, role: 'assistant', content: 'Done. I added a five-minute break reminder to your planner.' };
        setLines((current) => [...current, result]);
        speak(result.content);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'I could not save the reminder.');
      }
    }
  };

  const expression = listening ? 'curious' : busy ? 'resting' : speaking ? 'welcoming' : breathing ? 'breathing' : ritualChoice === 'good' ? 'welcoming' : ritualChoice ? 'resting' : 'idle';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#5554B8]">CALMSPACE COMPANION</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#25233B]">Talk with {companionName.trim() || 'Calm'}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625F78]">Choose a friendly face and name for your private, session-only conversations, breathing, study planning, and support.</p>
        </div>
        <button type="button" onClick={() => { setLines([greetingFor(companionName.trim())]); setError(''); }} className="self-start rounded-xl border border-[#E8E6F1] bg-white px-4 py-2 text-sm font-semibold text-[#5554B8] hover:bg-[#F7F6FB]">Clear this conversation</button>
      </header>

      {showWelcome && (
        <section className="rounded-3xl border border-[#DCD9EF] bg-gradient-to-r from-[#F1EEFF] via-white to-[#FFF8F2] p-5 shadow-subtle" aria-label="Welcome to Calmspace Companion">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-bold text-[#5554B8]"><Sparkles size={16} /> A gentle place to begin</p>
              <h2 className="mt-1 text-xl font-bold text-[#25233B]">Make this space feel like yours.</h2>
              <p className="mt-1 text-sm leading-6 text-[#625F78]">Choose a companion below, give it a name, then start by typing or speaking. Your conversation stays only in this page while it is open.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={completeWelcome} className="rounded-xl border border-[#CFCBEA] bg-white px-4 py-2.5 text-sm font-semibold text-[#5554B8] hover:bg-[#F7F6FB]">Begin by text</button>
              <button type="button" onClick={() => { completeWelcome(); void startVoice(); }} className="rounded-xl bg-[#5554B8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4645A7]">Begin by voice</button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="overflow-hidden rounded-3xl border border-[#E8E6F1] bg-gradient-to-b from-[#F1EEFF] via-white to-[#F7F6FB] p-5 shadow-subtle" aria-label={`${companionName || 'Calm'} avatar and voice controls`}>
          <div className="relative mx-auto h-64 max-w-md">
            {selectedAvatar.kind === 'blob' ? (
              <BlobScene key={selectedAvatar.id} className="h-full w-full" bodyColor={selectedAvatar.color} expression={expression} isCtaHovered={listening || speaking} isBreathingActive={breathing} voiceLevel={voiceLevel} />
            ) : (
              <PetScene type={selectedAvatar.id as 'cat' | 'dog'} speaking={speaking} listening={listening} thinking={busy} voiceLevel={voiceLevel} className="mx-auto max-w-md" />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
              <span className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-[#5554B8] shadow-sm">
                {listening ? 'Listening' : busy ? 'Thinking' : speaking ? 'Speaking' : breathing ? breathPhase : 'Here with you'}
              </span>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/80 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-sm font-bold text-[#25233B]">Your companion</h2><p className="mt-0.5 text-xs text-[#89869B]">Pick a look, then give it a name</p></div>
              <label className="sr-only" htmlFor="companion-name">Companion name</label>
              <input id="companion-name" value={companionName} onChange={(event) => setCompanionName(event.target.value.slice(0, 24))} maxLength={24} placeholder="Name your companion" className="w-36 rounded-xl border border-[#E8E6F1] bg-white px-3 py-2 text-sm font-semibold text-[#35334A] outline-none focus:border-[#8C89D4] focus:ring-2 focus:ring-[#E9E7FB] sm:w-44" />
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2" role="group" aria-label="Choose companion avatar">
              {AVATARS.map((avatar) => (
                <button key={avatar.id} type="button" aria-pressed={selectedAvatar.id === avatar.id} aria-label={`Choose ${avatar.label}`} onClick={() => setSelectedAvatarId(avatar.id)} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border p-2 transition hover:-translate-y-0.5 ${selectedAvatar.id === avatar.id ? 'border-[#7774CE] bg-[#F1EEFF] ring-2 ring-[#E1DFFA]' : 'border-[#E8E6F1] bg-white hover:border-[#C8C4E8]'}`}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full text-xl" style={{ backgroundColor: avatar.swatch }}>{avatar.kind === 'blob' ? <span className="h-6 w-6 rounded-[45%] shadow-inner" style={{ background: `radial-gradient(circle at 35% 25%, white, ${avatar.swatch} 70%)` }} /> : avatar.emoji}</span>
                  <span className="w-full truncate text-[10px] font-semibold text-[#625F78]">{avatar.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-4 text-[#89869B]">Your avatar and name are saved only in this browser on this device.</p>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {!voiceActive ? (
              <button type="button" onClick={() => void startVoice()} className="inline-flex items-center gap-2 rounded-xl bg-[#5554B8] px-5 py-3 font-semibold text-white hover:bg-[#4645A7]"><Headphones size={18} /> Start voice chat</button>
            ) : (
              <>
                <button type="button" onClick={() => { if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); speakingRef.current = false; } else if (listening) { recognitionRef.current?.stop(); setListening(false); } else listen(); }} className="inline-flex items-center gap-2 rounded-xl bg-[#5554B8] px-4 py-3 font-semibold text-white hover:bg-[#4645A7]">{listening ? <Mic size={18} /> : <MicOff size={18} />}{listening ? 'Listening' : 'Listen again'}</button>
                <button type="button" onClick={() => { setMuted((value) => !value); if (!muted) { window.speechSynthesis.cancel(); releaseProviderAudio(); setSpeaking(false); speakingRef.current = false; } }} aria-label={muted ? 'Unmute Calm' : 'Mute Calm'} className="rounded-xl border border-[#E8E6F1] bg-white p-3 text-[#5554B8]">{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
                <button type="button" onClick={stopVoice} className="inline-flex items-center gap-2 rounded-xl border border-[#E8E6F1] bg-white px-4 py-3 font-semibold text-[#625F78] hover:bg-[#F7F6FB]"><Square size={16} /> End chat</button>
              </>
            )}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-[#E8E6F1] bg-white/90 px-3 py-2.5 text-xs leading-5 text-[#625F78]" role="status">
            <Activity className="mt-0.5 shrink-0 text-[#5554B8]" size={15} />
            <span><strong className="text-[#35334A]">Voice status:</strong> {voiceStatus}</span>
          </div>
          <div className="mt-3 rounded-2xl border border-[#E8E6F1] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#25233B]">Voice preferences</h3>
            <label htmlFor="companion-device-voice" className="mt-3 block text-xs font-medium text-[#625F78]">Device voice</label>
            <select id="companion-device-voice" value={selectedVoiceURI} onChange={(event) => setSelectedVoiceURI(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#E8E6F1] bg-[#FCFBFE] px-3 py-2.5 text-sm text-[#35334A] outline-none focus:border-[#8C89D4] focus:ring-2 focus:ring-[#E9E7FB]">
              <option value="">Automatic natural voice</option>
              {deviceVoices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} · {voice.lang}</option>)}
            </select>
            <label htmlFor="companion-speech-rate" className="mt-3 flex items-center justify-between text-xs font-medium text-[#625F78]">
              <span>Speaking pace</span><span className="rounded-full bg-[#F1EEFF] px-2 py-0.5 text-[#5554B8]">{speechRate.toFixed(2)}×</span>
            </label>
            <input id="companion-speech-rate" type="range" min="0.8" max="1.15" step="0.05" value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value))} className="mt-2 w-full accent-[#5554B8]" />
            <p className="mt-1 text-[11px] leading-4 text-[#89869B]">These settings apply to device speech. ElevenLabs uses its configured voice.</p>
          </div>
          <div className="mt-5 rounded-2xl bg-white/80 p-4 text-xs leading-5 text-[#625F78]">
            <div className="mb-1 flex items-center gap-2 font-semibold text-[#25233B]"><ShieldCheck size={15} /> Your privacy controls</div>
            Microphone access is requested only when voice chat starts and released when it ends. Calm does not save this transcript. Browser speech recognition may process audio through your browser provider. Gemini and ElevenLabs sharing each require separate opt-in below; ElevenLabs receives only Calm's reply text for speech output. Device voices vary; ElevenLabs provides a consistent voice when configured.
          </div>
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E8E6F1] bg-white p-4 text-sm text-[#625F78]">
            <input type="checkbox" checked={shareWithGemini} onChange={(event) => setShareWithGemini(event.target.checked)} className="mt-1 accent-[#5554B8]" />
            <span><strong className="text-[#25233B]">Allow Gemini to process messages</strong><span className="mt-1 block text-xs leading-5">Your current conversation context will be sent securely to Gemini for a reply. It stays in this browser session and is not saved by Calmspace.</span></span>
          </label>
          <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E8E6F1] bg-white p-4 text-sm text-[#625F78]">
            <input type="checkbox" checked={shareWithElevenLabs} onChange={(event) => setShareWithElevenLabs(event.target.checked)} className="mt-1 accent-[#5554B8]" />
            <span><strong className="text-[#25233B]">Allow ElevenLabs to speak replies</strong><span className="mt-1 block text-xs leading-5">When voice chat is active and ElevenLabs is configured, Calm's replies are sent to ElevenLabs for speech. If unavailable or not enabled, your browser voice is used. Connect an ElevenLabs API key and voice ID on the server for its more natural voice.</span></span>
          </label>
        </section>

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-3xl border border-[#E8E6F1] bg-white shadow-subtle" aria-label="Conversation with Calm">
          <div className="flex items-center justify-between border-b border-[#F0EFF7] px-5 py-4">
            <div><h2 className="font-semibold text-[#25233B]">Conversation</h2><p className="mt-0.5 text-xs text-[#89869B]">Only held in this page while it is open</p></div>
            {voiceActive && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5554B8]"><Activity size={14} /> {activeVoiceProvider === 'elevenlabs' ? 'ElevenLabs voice' : 'Device voice'} · Microphone active</span>}
          </div>
          <div className="border-b border-[#F0EFF7] bg-[#FCFBFE] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="flex items-center gap-1.5 text-sm font-semibold text-[#35334A]"><Heart size={15} className="text-[#5554B8]" /> How are you arriving today?</p><p className="mt-1 text-xs text-[#89869B]">A private, session-only moment. Choose what fits right now.</p></div>
              <span className="rounded-full bg-[#F1EEFF] px-2.5 py-1 text-[11px] font-semibold text-[#5554B8]">{sessionMoments === 0 ? 'Start small' : `${sessionMoments} caring moment${sessionMoments === 1 ? '' : 's'}`}</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Daily wellbeing ritual">
              {([['good', 'Good'], ['stressed', 'Stressed'], ['tired', 'Tired']] as const).map(([choice, label]) => (
                <button key={choice} type="button" onClick={() => chooseRitual(choice)} disabled={busy} aria-pressed={ritualChoice === choice} className={`rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${ritualChoice === choice ? 'border-[#7774CE] bg-[#F1EEFF] text-[#5554B8]' : 'border-[#E8E6F1] bg-white text-[#625F78] hover:border-[#C8C4E8] hover:bg-[#F7F6FB]'}`}>{label}</button>
              ))}
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite" aria-relevant="additions text">
            {lines.map((line) => (
              <div key={line.id} className={`flex ${line.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${line.role === 'user' ? 'bg-[#5554B8] text-white' : 'border border-[#F0EFF7] bg-[#F7F6FB] text-[#35334A]'}`}>
                  {line.role === 'assistant' && <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#5554B8]">{companionName.trim() || 'Calm'}{line.route === 'HIGH' ? ' · Support' : ''}</div>}
                  {line.content}
                  {line.action && <button type="button" onClick={() => void handleAction(line)} className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-[#DCD9EF] bg-white px-3 py-2.5 text-left text-xs font-semibold text-[#5554B8] hover:bg-[#F1EEFF]"><span>{line.action.name === 'create_reminder' ? <><Check className="mr-1 inline" size={14} /> Confirm and add reminder</> : line.action.title}</span><ArrowRight size={15} /></button>}
                  {line.supportContacts && line.supportContacts.length > 0 && <div className="mt-3 space-y-2">{line.supportContacts.map((contact) => <a key={contact.id} href={`tel:${contact.contact_number}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#DCD9EF] bg-white px-3 py-2.5 text-xs font-semibold text-[#5554B8]"><span><Phone className="mr-1 inline" size={13} />{contact.name}<span className="block pl-5 font-normal text-[#625F78]">{contact.display_phone} · {contact.hours}</span></span><ArrowRight size={14} /></a>)}</div>}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-[#89869B]">Calm is thinking…</div>}
          </div>
          {breathing && <div className="mx-5 mb-3 flex items-center justify-between rounded-2xl bg-[#F1EEFF] px-4 py-3 text-sm text-[#5554B8]"><span className="font-semibold">{breathPhase}</span><button onClick={() => setBreathing(false)} type="button" className="text-xs underline">Stop exercise</button></div>}
          {(error || (voiceActive && !listening && !speaking && !busy)) && <div className="mx-5 mb-2 rounded-xl bg-[#FFF8E8] px-3 py-2 text-xs text-[#775B14]">{error || 'Voice chat is on. Tap Listen again if you want to speak.'}</div>}
          <form onSubmit={(event) => { event.preventDefault(); void sendMessage(input); }} className="flex gap-2 border-t border-[#F0EFF7] p-4">
            <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder="Type what’s on your mind…" aria-label="Message Calm" className="min-w-0 flex-1 rounded-xl border border-[#E8E6F1] bg-[#FCFBFE] px-4 py-3 text-sm outline-none focus:border-[#8C89D4] focus:ring-2 focus:ring-[#E9E7FB]" />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Send message" className="rounded-xl bg-[#5554B8] px-4 text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={18} /></button>
          </form>
        </section>
      </div>
    </div>
  );
};

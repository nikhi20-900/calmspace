/**
 * Replaceable Voice I/O Abstraction Layer
 *
 * Isolates browser SpeechRecognition, Web Audio API microphone amplitude metering,
 * and SpeechSynthesis behind clean provider interfaces so a low-latency streaming
 * voice model (e.g., WebRTC / Gemini Live) can be swapped in without UI rewrites.
 *
 * Privacy Guarantee:
 * - Never records or stores raw audio (no MediaRecorder, no audio blobs).
 * - Microphone MediaStreamTracks and AudioContext are fully released on stop().
 */

export interface SpeechInputCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (errorCode: string) => void;
  onEnd: () => void;
}

export interface SpeechInputAdapter {
  readonly isSupported: boolean;
  start: (callbacks: SpeechInputCallbacks) => boolean;
  stop: () => void;
  abort: () => void;
}

export interface SpeechOutputOptions {
  muted?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  onLevel?: (level: number) => void;
}

export interface SpeechOutputAdapter {
  readonly isSupported: boolean;
  speak: (text: string, options?: SpeechOutputOptions) => void;
  stop: () => void;
}

export interface MicMonitorHandle {
  stop: () => void;
}

interface BrowserSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionConstructor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechInputSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export function isSpeechOutputSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

export function isMicrophoneApiSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * Browser Web Speech API SpeechRecognition adapter.
 * Uses single-utterance mode (continuous=false) per turn so finalized phrases
 * dispatch cleanly and echo-gating during TTS is deterministic.
 */
export function createBrowserSpeechInput(): SpeechInputAdapter {
  const Ctor = getSpeechRecognitionConstructor();
  let activeRec: BrowserSpeechRecognition | null = null;
  let intentionalStop = false;

  return {
    isSupported: Ctor !== null,

    start(callbacks: SpeechInputCallbacks): boolean {
      if (!Ctor) return false;
      try {
        if (activeRec) {
          intentionalStop = true;
          activeRec.abort();
          activeRec = null;
        }
        intentionalStop = false;
        const rec = new Ctor();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
        rec.maxAlternatives = 1;

        rec.onresult = (event: any) => {
          let interim = '';
          let finalText = '';
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const res = event.results[i];
            const transcript = res?.[0]?.transcript || '';
            if (res.isFinal) {
              finalText += transcript;
            } else {
              interim += transcript;
            }
          }
          if (interim.trim()) {
            callbacks.onInterim(interim.trim());
          }
          if (finalText.trim()) {
            callbacks.onFinal(finalText.trim());
          }
        };

        rec.onerror = (event: any) => {
          if (intentionalStop) return;
          const code = String(event?.error || 'unknown');
          callbacks.onError(code);
        };

        rec.onend = () => {
          if (activeRec === rec) {
            activeRec = null;
          }
          callbacks.onEnd();
        };

        activeRec = rec;
        rec.start();
        return true;
      } catch {
        activeRec = null;
        return false;
      }
    },

    stop() {
      if (!activeRec) return;
      intentionalStop = true;
      try {
        activeRec.stop();
      } catch {
        // Ignore already-stopped errors
      }
      activeRec = null;
    },

    abort() {
      if (!activeRec) return;
      intentionalStop = true;
      try {
        activeRec.abort();
      } catch {
        // Ignore
      }
      activeRec = null;
    },
  };
}

/**
 * Requests explicit microphone permission and computes real-time RMS audio amplitude
 * solely in transient memory for 3D blob reactivity. Never records or stores audio.
 */
export async function startMicAmplitudeMonitor(
  onLevel: (level: number) => void
): Promise<MicMonitorHandle> {
  if (!isMicrophoneApiSupported()) {
    throw new Error('Microphone API unavailable in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  let ctx: AudioContext | null = null;
  let rafId = 0;
  let stopped = false;

  if (AudioCtx) {
    ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      if (stopped) return;
      analyser.getByteTimeDomainData(buffer);
      let sumSquares = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const centered = (buffer[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / buffer.length);
      const normalized = Math.min(1, Math.max(0, (rms - 0.015) * 4.5));
      onLevel(normalized);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
  }

  return {
    stop() {
      stopped = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      onLevel(0);
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => {});
      }
    },
  };
}

function selectWarmVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const preferredNames = [
    'samantha',
    'ava',
    'karen',
    'google us english',
    'google uk english female',
    'serena',
    'moira',
  ];
  for (const pref of preferredNames) {
    const match = voices.find((v) => v.name.toLowerCase().includes(pref));
    if (match) return match;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith('en')) || voices[0];
}

/**
 * Browser SpeechSynthesis adapter with warm voice selection, smooth cadence amplitude
 * envelope for lip/body sync, and reliable cancellation for user interruptions.
 */
export function createBrowserSpeechOutput(): SpeechOutputAdapter {
  const supported = isSpeechOutputSupported();
  let cadenceTimer: number | null = null;
  let watchdogTimer: number | null = null;
  let activeToken = 0;

  const clearTimers = (onLevel?: (level: number) => void) => {
    if (cadenceTimer !== null) {
      window.clearInterval(cadenceTimer);
      cadenceTimer = null;
    }
    if (watchdogTimer !== null) {
      window.clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }
    onLevel?.(0);
  };

  return {
    isSupported: supported,

    speak(text: string, options: SpeechOutputOptions = {}) {
      const token = ++activeToken;
      clearTimers(options.onLevel);

      if (!supported || options.muted || !text.trim()) {
        options.onStart?.();
        const wordCount = Math.max(4, text.trim().split(/\s+/).length);
        const silentDurationMs = options.muted ? Math.min(1800, wordCount * 110) : 900;
        let phase = 0;
        cadenceTimer = window.setInterval(() => {
          if (token !== activeToken) return;
          phase += 0.35;
          options.onLevel?.(0.22 + 0.18 * Math.abs(Math.sin(phase)));
        }, 70);
        watchdogTimer = window.setTimeout(() => {
          if (token !== activeToken) return;
          clearTimers(options.onLevel);
          options.onEnd?.();
        }, silentDurationMs);
        return;
      }

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const chosen = selectWarmVoice(voices);
      if (chosen) utterance.voice = chosen;
      utterance.rate = 0.96;
      utterance.pitch = 1.03;
      utterance.volume = 1.0;

      let finished = false;
      let boundaryPulse = 0.35;

      const finish = (isError = false) => {
        if (finished || token !== activeToken) return;
        finished = true;
        clearTimers(options.onLevel);
        if (isError) options.onError?.();
        else options.onEnd?.();
      };

      utterance.onstart = () => {
        if (token !== activeToken) return;
        options.onStart?.();
        let t = 0;
        cadenceTimer = window.setInterval(() => {
          if (token !== activeToken || finished) return;
          t += 0.35;
          boundaryPulse = Math.max(0.2, boundaryPulse * 0.86);
          const wave = 0.2 + 0.25 * Math.abs(Math.sin(t)) + boundaryPulse * 0.45;
          options.onLevel?.(Math.min(1, wave));
        }, 65);
      };

      utterance.onboundary = () => {
        boundaryPulse = 0.85;
      };

      utterance.onend = () => finish(false);
      utterance.onerror = () => finish(true);

      // Watchdog ensures listening resumes even if browser omits onend
      const estimatedMs = Math.max(4000, Math.min(28000, text.length * 85 + 2500));
      watchdogTimer = window.setTimeout(() => finish(false), estimatedMs);

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        finish(true);
      }
    },

    stop() {
      activeToken += 1;
      clearTimers();
      if (supported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }
    },
  };
}

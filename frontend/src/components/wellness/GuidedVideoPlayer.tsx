import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';

export interface GuidedVideoPlayerProps {
  scene: 'waves' | 'sunrise' | 'nightfall' | 'breath';
  durationSeconds: number;
  captions: Array<{ timeSec: number; text: string }>;
}

const SCENE_VIDEO_URL: Record<GuidedVideoPlayerProps['scene'], string> = {
  sunrise: '/videos/sunrise.webm',
  nightfall: '/videos/nightfall.webm',
  waves: '/videos/waves.webm',
  breath: '/videos/waves.webm',
};

const SCENE_AUDIO_URL: Record<GuidedVideoPlayerProps['scene'], string> = {
  sunrise: '/audio/meditation.wav',
  nightfall: '/audio/night.wav',
  waves: '/audio/ocean.wav',
  breath: '/audio/meditation.wav',
};

function formatVideoTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export const GuidedVideoPlayer: React.FC<GuidedVideoPlayerProps> = ({
  scene,
  durationSeconds,
  captions,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSpokenIndexRef = useRef<number>(-1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Spoken voice guide ON by default
  const [musicMuted, setMusicMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Determine active caption index & text
  let activeCaptionIdx = 0;
  for (let i = 0; i < captions.length; i += 1) {
    if (elapsedSec >= captions[i].timeSec) {
      activeCaptionIdx = i;
    }
  }
  const currentCaption = captions[activeCaptionIdx]?.text || '';

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech cancellation errors
      }
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = 0.98;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Zira') ||
              v.name.includes('Samantha'))
        ) || voices.find((v) => v.lang.startsWith('en'));
      if (preferred) {
        utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors safely
    }
  };

  // Setup & cleanup background audio
  useEffect(() => {
    const audio = new Audio(SCENE_AUDIO_URL[scene]);
    audio.loop = true;
    audio.volume = 0.24; // Soft under spoken voice
    audio.muted = musicMuted;
    audioRef.current = audio;

    return () => {
      stopSpeech();
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [scene]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = musicMuted;
    }
  }, [musicMuted]);

  useEffect(() => {
    if (!voiceEnabled) {
      stopSpeech();
    }
  }, [voiceEnabled]);

  // Speak each caption step aloud as it becomes active while playing
  useEffect(() => {
    if (!isPlaying || !voiceEnabled) return;
    if (lastSpokenIndexRef.current !== activeCaptionIdx) {
      lastSpokenIndexRef.current = activeCaptionIdx;
      const text = captions[activeCaptionIdx]?.text;
      if (text) {
        speakText(text);
      }
    }
  }, [isPlaying, voiceEnabled, activeCaptionIdx, captions]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.25;
        if (next >= durationSeconds) {
          setIsPlaying(false);
          if (videoRef.current) {
            videoRef.current.pause();
          }
          if (audioRef.current) {
            audioRef.current.pause();
          }
          stopSpeech();
          return durationSeconds;
        }
        return next;
      });
    }, 250);
    return () => window.clearInterval(interval);
  }, [isPlaying, durationSeconds]);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      stopSpeech();
      return;
    }

    let startingFromBeginning = false;
    if (elapsedSec >= durationSeconds) {
      setElapsedSec(0);
      lastSpokenIndexRef.current = -1;
      startingFromBeginning = true;
      if (videoRef.current) videoRef.current.currentTime = 0;
      if (audioRef.current) audioRef.current.currentTime = 0;
    }

    // Trigger speech synchronously on user gesture if starting or resuming current step
    if (voiceEnabled) {
      const idxToSpeak = startingFromBeginning ? 0 : activeCaptionIdx;
      if (lastSpokenIndexRef.current !== idxToSpeak) {
        lastSpokenIndexRef.current = idxToSpeak;
        const text = captions[idxToSpeak]?.text;
        if (text) speakText(text);
      }
    }

    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  const handleReplay = async () => {
    stopSpeech();
    setElapsedSec(0);
    lastSpokenIndexRef.current = 0;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(true);
    if (voiceEnabled && captions[0]?.text) {
      speakText(captions[0].text);
    }
  };

  const handleSeek = (nextSec: number) => {
    setElapsedSec(nextSec);
    lastSpokenIndexRef.current = -1;
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = nextSec % videoRef.current.duration;
    }
  };

  return (
    <div className="space-y-3">
      {/* Real HD Nature Video Frame */}
      <div className="relative rounded-card overflow-hidden border border-[#E8E6F1] bg-[#25233B] aspect-video">
        {!videoError ? (
          <video
            ref={videoRef}
            src={SCENE_VIDEO_URL[scene]}
            loop
            muted
            playsInline
            preload="metadata"
            onClick={handleTogglePlay}
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover block cursor-pointer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-[#E9E7FB] p-4 text-center">
            Guided video clip unavailable. Spoken narration and ambient audio remain active below.
          </div>
        )}

        {/* Center Play Overlay when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={elapsedSec >= durationSeconds ? 'Replay guided video' : 'Play guided video'}
            className="absolute inset-0 flex items-center justify-center bg-[#25233B]/25 hover:bg-[#25233B]/35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
          >
            <span className="w-14 h-14 rounded-full bg-white/95 text-[#5554B8] shadow-elevation flex items-center justify-center">
              {elapsedSec >= durationSeconds ? (
                <RotateCcw className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </span>
          </button>
        )}

        {/* Subtle Spoken Guide Indicator & Subtitles */}
        {currentCaption && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex justify-center">
            <p className="bg-[#25233B]/75 backdrop-blur-xs text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl text-center max-w-md shadow-soft">
              {currentCaption}
            </p>
          </div>
        )}
      </div>

      {/* Video, Voice & Audio Control Bar */}
      <div className="p-2.5 rounded-input bg-[#F7F6FB] border border-[#E8E6F1] flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          className="p-2 rounded-button bg-[#5554B8] text-white hover:bg-[#4645A7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={handleReplay}
          aria-label="Restart video"
          className="p-2 rounded-button bg-white border border-[#E8E6F1] text-[#625F78] hover:text-[#25233B] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-2 min-w-[130px]">
          <input
            type="range"
            min={0}
            max={durationSeconds}
            step={0.5}
            value={elapsedSec}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label="Seek video timeline"
            className="w-full accent-[#5554B8] cursor-pointer"
          />
          <span className="text-[11px] font-semibold text-[#625F78] shrink-0">
            {formatVideoTime(elapsedSec)} / {formatVideoTime(durationSeconds)}
          </span>
        </div>

        {/* Spoken Voice Guide Toggle */}
        <button
          type="button"
          onClick={() => setVoiceEnabled((prev) => !prev)}
          aria-pressed={voiceEnabled}
          aria-label={voiceEnabled ? 'Turn spoken voice guide off' : 'Turn spoken voice guide on'}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button border text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
            voiceEnabled
              ? 'bg-[#DCE9DF] border-[#BCD4C3] text-[#245532]'
              : 'bg-white border-[#E8E6F1] text-[#625F78] hover:text-[#25233B]'
          }`}
        >
          {voiceEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          <span>{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
        </button>

        {/* Ambient Music Toggle */}
        <button
          type="button"
          onClick={() => setMusicMuted((prev) => !prev)}
          aria-pressed={!musicMuted}
          aria-label={musicMuted ? 'Unmute background audio' : 'Mute background audio'}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button border text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
            !musicMuted
              ? 'bg-[#E9E7FB] border-[#5554B8]/30 text-[#5554B8]'
              : 'bg-white border-[#E8E6F1] text-[#625F78] hover:text-[#25233B]'
          }`}
        >
          {musicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#5554B8]" />}
          <span>{musicMuted ? 'Muted' : 'Music On'}</span>
        </button>
      </div>
    </div>
  );
};

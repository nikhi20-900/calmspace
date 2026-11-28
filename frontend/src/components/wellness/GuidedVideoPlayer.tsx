import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export interface GuidedVideoPlayerProps {
  scene: 'waves' | 'sunrise' | 'nightfall' | 'breath';
  durationSeconds: number;
  captions: Array<{ timeSec: number; text: string }>;
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const elapsedRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [muted, setMuted] = useState(false); // Audio ON by default when user clicks Play

  // Determine active caption
  let currentCaption = captions[0]?.text || '';
  for (const cap of captions) {
    if (elapsedSec >= cap.timeSec) {
      currentCaption = cap.text;
    }
  }

  // Cleanup audio on unmount or scene change
  useEffect(() => {
    const audio = new Audio(SCENE_AUDIO_URL[scene]);
    audio.loop = true;
    audio.volume = 0.55;
    audio.muted = muted;
    audioRef.current = audio;

    return () => {
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, [scene]);

  // Keep muted state synced
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.1;
        if (next >= durationSeconds) {
          elapsedRef.current = durationSeconds;
          setIsPlaying(false);
          if (audioRef.current) {
            audioRef.current.pause();
          }
          return durationSeconds;
        }
        elapsedRef.current = next;
        return next;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [isPlaying, durationSeconds]);

  // Smooth 60fps Canvas Video Renderer (does NOT restart on elapsedSec ticks)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTs = performance.now();
    let animTime = elapsedRef.current;

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      if (isPlaying) {
        animTime += dt;
      } else {
        animTime = elapsedRef.current;
      }

      const w = canvas.width;
      const h = canvas.height;
      const t = animTime;

      ctx.clearRect(0, 0, w, h);

      if (scene === 'sunrise') {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#DFDCFB');
        sky.addColorStop(0.52, '#F4DCCB');
        sky.addColorStop(1, '#F6E6CC');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        const progress = Math.min(1, t / Math.max(1, durationSeconds));
        const sunY = h * 0.75 - progress * (h * 0.38);
        const sunPulse = 105 + Math.sin(t * 1.4) * 12;
        const sunGlow = ctx.createRadialGradient(w * 0.5, sunY, 12, w * 0.5, sunY, sunPulse);
        sunGlow.addColorStop(0, 'rgba(255, 248, 224, 0.98)');
        sunGlow.addColorStop(0.4, 'rgba(244, 196, 150, 0.65)');
        sunGlow.addColorStop(1, 'rgba(244, 196, 150, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(w * 0.5, sunY, sunPulse, 0, Math.PI * 2);
        ctx.fill();

        // Drifting soft clouds
        for (let c = 0; c < 3; c += 1) {
          const cx = ((w * (0.2 + c * 0.35) + t * (12 + c * 4)) % (w + 160)) - 80;
          const cy = h * (0.24 + c * 0.12);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.beginPath();
          ctx.ellipse(cx, cy, 62, 20, 0, 0, Math.PI * 2);
          ctx.ellipse(cx + 28, cy - 8, 38, 16, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Gentle layered hills
        ctx.fillStyle = 'rgba(85, 84, 184, 0.16)';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.78);
        ctx.quadraticCurveTo(w * 0.25, h * 0.66, w * 0.55, h * 0.76);
        ctx.quadraticCurveTo(w * 0.8, h * 0.84, w, h * 0.72);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
      } else if (scene === 'nightfall') {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#171430');
        sky.addColorStop(0.6, '#2E295C');
        sky.addColorStop(1, '#4C4AA6');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Twinkling stars
        for (let i = 0; i < 36; i += 1) {
          const sx = ((i * 97) % (w - 30)) + 15;
          const sy = ((i * 53) % (h * 0.68)) + 12;
          const alpha = 0.3 + 0.65 * Math.abs(Math.sin(t * 1.4 + i));
          ctx.fillStyle = `rgba(233, 231, 251, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, (i % 3) + 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Soft glowing moon + halo
        const moonX = w * 0.75;
        const moonY = h * 0.28 + Math.sin(t * 0.6) * 6;
        const moonHalo = ctx.createRadialGradient(moonX, moonY, 18, moonX, moonY, 68);
        moonHalo.addColorStop(0, 'rgba(246, 230, 204, 0.45)');
        moonHalo.addColorStop(1, 'rgba(246, 230, 204, 0)');
        ctx.fillStyle = moonHalo;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 68, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(250, 238, 214, 0.95)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
        ctx.fill();

        // Calm nocturnal horizon
        ctx.fillStyle = 'rgba(23, 20, 48, 0.55)';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.8);
        ctx.quadraticCurveTo(w * 0.4, h * 0.73, w, h * 0.82);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
      } else {
        // Waves / calm ocean
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#E9E7FB');
        sky.addColorStop(0.48, '#DCE9DF');
        sky.addColorStop(1, '#BCE0CA');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Soft sun reflection
        const sunAura = ctx.createRadialGradient(w * 0.5, h * 0.28, 8, w * 0.5, h * 0.28, 70);
        sunAura.addColorStop(0, 'rgba(255, 250, 235, 0.9)');
        sunAura.addColorStop(1, 'rgba(255, 250, 235, 0)');
        ctx.fillStyle = sunAura;
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.28, 70, 0, Math.PI * 2);
        ctx.fill();

        const waveColors = [
          'rgba(85, 84, 184, 0.20)',
          'rgba(85, 84, 184, 0.30)',
          'rgba(36, 85, 50, 0.26)',
        ];
        waveColors.forEach((col, idx) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          const baseY = h * (0.48 + idx * 0.13);
          ctx.moveTo(0, baseY);
          for (let x = 0; x <= w; x += 8) {
            const y =
              baseY +
              Math.sin(x * 0.016 + t * (1.1 + idx * 0.35) + idx) * (12 + idx * 4);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fill();
        });
      }

      if (isPlaying) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [scene, isPlaying, durationSeconds]);

  const handleTogglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    if (elapsedSec >= durationSeconds) {
      elapsedRef.current = 0;
      setElapsedSec(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
    setIsPlaying(true);
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch {
        // Ignore browser autoplay restrictions safely
      }
    }
  };

  const handleReplay = async () => {
    elapsedRef.current = 0;
    setElapsedSec(0);
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      try {
        await audioRef.current.play();
      } catch {
        // Ignore playback errors safely
      }
    }
  };

  const handleSeek = (nextSec: number) => {
    elapsedRef.current = nextSec;
    setElapsedSec(nextSec);
  };

  return (
    <div className="space-y-3">
      {/* Video Frame */}
      <div className="relative rounded-card overflow-hidden border border-[#E8E6F1] bg-[#25233B] aspect-video">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          onClick={handleTogglePlay}
          className="w-full h-full block cursor-pointer"
        />

        {/* Center Play Overlay when paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={elapsedSec >= durationSeconds ? 'Replay guided video' : 'Play guided video'}
            className="absolute inset-0 flex items-center justify-center bg-[#25233B]/20 hover:bg-[#25233B]/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
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

        {/* Guided Captions Overlay */}
        {currentCaption && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none flex justify-center">
            <p className="bg-[#25233B]/80 backdrop-blur-xs text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl text-center max-w-md shadow-soft">
              {currentCaption}
            </p>
          </div>
        )}
      </div>

      {/* Video Control Bar */}
      <div className="p-2.5 rounded-input bg-[#F7F6FB] border border-[#E8E6F1] flex flex-wrap items-center gap-3">
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

        <div className="flex-1 flex items-center gap-2 min-w-[140px]">
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

        <button
          type="button"
          onClick={() => setMuted((prev) => !prev)}
          aria-label={muted ? 'Unmute video audio' : 'Mute video audio'}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button border text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
            !muted
              ? 'bg-[#E9E7FB] border-[#5554B8]/30 text-[#5554B8]'
              : 'bg-white border-[#E8E6F1] text-[#625F78] hover:text-[#25233B]'
          }`}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#5554B8]" />}
          <span>{muted ? 'Muted' : 'Audio On'}</span>
        </button>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

export interface GuidedVideoPlayerProps {
  scene: 'waves' | 'sunrise' | 'nightfall' | 'breath';
  durationSeconds: number;
  captions: Array<{ timeSec: number; text: string }>;
}

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [muted, setMuted] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const droneOscRef = useRef<OscillatorNode | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);

  // Determine active caption
  let currentCaption = captions[0]?.text || '';
  for (const cap of captions) {
    if (elapsedSec >= cap.timeSec) {
      currentCaption = cap.text;
    }
  }

  // Soft ambient pad audio while playing & unmuted
  const stopDrone = () => {
    try {
      if (droneOscRef.current) {
        droneOscRef.current.stop();
        droneOscRef.current.disconnect();
        droneOscRef.current = null;
      }
      if (droneGainRef.current) {
        droneGainRef.current.disconnect();
        droneGainRef.current = null;
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  useEffect(() => {
    if (!isPlaying || muted) {
      stopDrone();
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = scene === 'nightfall' ? 146.83 : scene === 'waves' ? 174.61 : 196.0;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      droneOscRef.current = osc;
      droneGainRef.current = gain;
    } catch {
      // Ignore Web Audio errors
    }
    return () => stopDrone();
  }, [isPlaying, muted, scene]);

  useEffect(() => {
    return () => {
      stopDrone();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Playback timer
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 0.1;
        if (next >= durationSeconds) {
          setIsPlaying(false);
          return durationSeconds;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [isPlaying, durationSeconds]);

  // 60fps Canvas Scene Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let phaseTime = elapsedSec;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const t = phaseTime;

      ctx.clearRect(0, 0, w, h);

      if (scene === 'sunrise') {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#E9E7FB');
        sky.addColorStop(0.55, '#F4DCCB');
        sky.addColorStop(1, '#F6E6CC');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        const progress = Math.min(1, t / durationSeconds);
        const sunY = h * 0.78 - progress * (h * 0.36);
        const sunGlow = ctx.createRadialGradient(w * 0.5, sunY, 10, w * 0.5, sunY, 120);
        sunGlow.addColorStop(0, 'rgba(255, 245, 220, 0.95)');
        sunGlow.addColorStop(0.45, 'rgba(244, 196, 150, 0.55)');
        sunGlow.addColorStop(1, 'rgba(244, 196, 150, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(w * 0.5, sunY, 120, 0, Math.PI * 2);
        ctx.fill();

        // Gentle rolling hills
        ctx.fillStyle = 'rgba(85, 84, 184, 0.16)';
        ctx.beginPath();
        ctx.moveTo(0, h * 0.78);
        ctx.quadraticCurveTo(w * 0.25, h * 0.68, w * 0.55, h * 0.76);
        ctx.quadraticCurveTo(w * 0.8, h * 0.84, w, h * 0.72);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
      } else if (scene === 'nightfall') {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#1E1B3A');
        sky.addColorStop(0.65, '#332E63');
        sky.addColorStop(1, '#5554B8');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        // Twinkling stars
        for (let i = 0; i < 28; i += 1) {
          const sx = ((i * 97) % (w - 30)) + 15;
          const sy = ((i * 53) % (h * 0.65)) + 12;
          const alpha = 0.35 + 0.55 * Math.abs(Math.sin(t * 1.1 + i));
          ctx.fillStyle = `rgba(233, 231, 251, ${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, (i % 3) + 1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Soft glowing moon
        const moonX = w * 0.76;
        const moonY = h * 0.28 + Math.sin(t * 0.4) * 5;
        ctx.fillStyle = 'rgba(246, 230, 204, 0.92)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Waves / calm ocean
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#E9E7FB');
        sky.addColorStop(0.5, '#DCE9DF');
        sky.addColorStop(1, '#C4E0CE');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        const waveColors = [
          'rgba(85, 84, 184, 0.20)',
          'rgba(85, 84, 184, 0.32)',
          'rgba(36, 85, 50, 0.24)',
        ];
        waveColors.forEach((col, idx) => {
          ctx.fillStyle = col;
          ctx.beginPath();
          const baseY = h * (0.52 + idx * 0.12);
          ctx.moveTo(0, baseY);
          for (let x = 0; x <= w; x += 10) {
            const y =
              baseY +
              Math.sin(x * 0.015 + t * (0.9 + idx * 0.3) + idx) * (10 + idx * 3);
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h);
          ctx.lineTo(0, h);
          ctx.closePath();
          ctx.fill();
        });
      }

      if (isPlaying) {
        phaseTime += 0.016;
        animId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [scene, isPlaying, elapsedSec, durationSeconds]);

  const handleTogglePlay = () => {
    if (elapsedSec >= durationSeconds) {
      setElapsedSec(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  };

  const handleReplay = () => {
    setElapsedSec(0);
    setIsPlaying(true);
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
            onChange={(e) => setElapsedSec(Number(e.target.value))}
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
          aria-label={muted ? 'Unmute video ambient tone' : 'Mute video ambient tone'}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-button bg-white border border-[#E8E6F1] text-xs font-medium text-[#625F78] hover:text-[#25233B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8]"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#5554B8]" />}
          <span>{muted ? 'Muted' : 'Sound'}</span>
        </button>
      </div>
    </div>
  );
};

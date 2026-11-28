import React, { useEffect, useRef, useState } from 'react';
import {
  Headphones,
  Play,
  Pause,
  Volume2,
  Star,
  Timer,
  Sparkles,
  Waves,
  Moon,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SOUND_LOUNGE_TRACKS, SoundTrack } from '../../data/wellnessContent';
import {
  loadSoundFavourites,
  loadSoundVolume,
  saveSoundFavourites,
  saveSoundVolume,
} from '../../utils/wellnessStorage';

type SleepTimerMinutes = 0 | 5 | 10 | 15;
const SLEEP_TIMER_OPTIONS: readonly SleepTimerMinutes[] = [0, 5, 10, 15];

const TRACK_ICONS: Record<SoundTrack['id'], React.ReactNode> = {
  meditation: <Sparkles className="w-4 h-4 text-[#5554B8]" />,
  ocean: <Waves className="w-4 h-4 text-[#245532]" />,
  night: <Moon className="w-4 h-4 text-[#5554B8]" />,
};

export const SoundLoungeSection: React.FC = () => {
  const [selectedTrackId, setSelectedTrackId] = useState<SoundTrack['id']>('meditation');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState<number>(() => loadSoundVolume());
  const [favourites, setFavourites] = useState<string[]>(() => loadSoundFavourites());
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<SleepTimerMinutes>(0);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeTrack =
    SOUND_LOUNGE_TRACKS.find((t) => t.id === selectedTrackId) || SOUND_LOUNGE_TRACKS[0];

  const cleanupAudioElement = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.onerror = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  // Stop playback when the user leaves the page (component unmounts)
  useEffect(() => {
    return () => {
      cleanupAudioElement(audioRef.current);
      audioRef.current = null;
    };
  }, []);

  // Keep audio volume synced with state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sleep timer countdown when playing
  useEffect(() => {
    if (!isPlaying || sleepTimerMinutes === 0) return;

    const interval = window.setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          stopAudio();
          setSleepTimerMinutes(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isPlaying, sleepTimerMinutes]);

  const startPlaybackForTrack = async (track: SoundTrack) => {
    setAudioError(null);
    try {
      cleanupAudioElement(audioRef.current);
      audioRef.current = null;

      const audio = new Audio(track.audioUrl);
      audio.loop = true;
      audio.volume = volume;
      audio.onerror = () => {
        setAudioError(`Unable to load "${track.title}". Please check your audio connection and retry.`);
        setIsPlaying(false);
      };
      audioRef.current = audio;
      await audio.play();
      setIsPlaying(true);
    } catch {
      setAudioError(`Unable to play "${track.title}". Please retry.`);
      setIsPlaying(false);
    }
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && audioRef.current.src.includes(activeTrack.audioUrl)) {
      setAudioError(null);
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setAudioError(`Unable to play "${activeTrack.title}". Please retry.`);
        setIsPlaying(false);
      }
    } else {
      await startPlaybackForTrack(activeTrack);
    }
  };

  const handleSelectTrack = async (track: SoundTrack) => {
    const wasPlaying = isPlaying;
    stopAudio();
    setSelectedTrackId(track.id);
    setAudioError(null);
    if (wasPlaying) {
      await startPlaybackForTrack(track);
    }
  };

  const handleVolumeChange = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolume(clamped);
    saveSoundVolume(clamped);
  };

  const toggleFavourite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = favourites.includes(id)
      ? favourites.filter((x) => x !== id)
      : [...favourites, id];
    setFavourites(next);
    saveSoundFavourites(next);
  };

  const handleSelectSleepTimer = (mins: SleepTimerMinutes) => {
    setSleepTimerMinutes(mins);
    setTimerSecondsLeft(mins * 60);
  };

  const formatTimer = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <section aria-label="Sound Lounge">
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5554B8]">
              <Headphones className="w-4 h-4" />
              <span>Ambient Audio</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#25233B] mt-0.5">
              Sound Lounge
            </h2>
            <p className="text-xs text-[#625F78]">
              Gentle background soundscapes for rest, study, or quiet reflection.
            </p>
          </div>

          {/* Sleep Timer Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#625F78] mr-1">
              <Timer className="w-3.5 h-3.5 text-[#5554B8]" />
              <span>Sleep timer:</span>
            </span>
            <div
              role="group"
              aria-label="Select sleep timer"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F7F6FB] rounded-button border border-[#E8E6F1]"
            >
              {SLEEP_TIMER_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectSleepTimer(mins)}
                  aria-pressed={sleepTimerMinutes === mins}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                    sleepTimerMinutes === mins
                      ? 'bg-[#5554B8] text-white'
                      : 'text-[#625F78] hover:text-[#25233B] hover:bg-white'
                  }`}
                >
                  {mins === 0 ? 'Off' : `${mins}m`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Audio Error Banner */}
        {audioError && (
          <div
            role="alert"
            className="p-3 rounded-input bg-[#FDEEE9] border border-[#F4DCCB] text-[#B24823] text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{audioError}</span>
          </div>
        )}

        {/* Exactly Three Tracks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SOUND_LOUNGE_TRACKS.map((track) => {
            const isSelected = track.id === selectedTrackId;
            const isFav = favourites.includes(track.id);
            return (
              <div
                key={track.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectTrack(track)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectTrack(track);
                  }
                }}
                aria-pressed={isSelected}
                className={`p-3.5 rounded-card border transition-all cursor-pointer flex flex-col justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                  isSelected
                    ? 'bg-[#E9E7FB]/50 border-[#5554B8] shadow-subtle'
                    : 'bg-[#F7F6FB] border-[#E8E6F1] hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-white border border-[#E8E6F1] flex items-center justify-center shrink-0">
                      {TRACK_ICONS[track.id]}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#25233B]">{track.title}</h3>
                      {isSelected && isPlaying && (
                        <span className="text-[11px] font-semibold text-[#5554B8]">
                          Playing now
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleFavourite(track.id, e)}
                    aria-pressed={isFav}
                    aria-label={isFav ? `Remove ${track.title} from favourites` : `Favourite ${track.title}`}
                    className={`p-1.5 rounded-button border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5554B8] ${
                      isFav
                        ? 'bg-[#F6E6CC] border-[#E8CEA5] text-[#7A4D05]'
                        : 'bg-white border-[#E8E6F1] text-[#625F78] hover:text-[#25233B]'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <p className="text-xs text-[#625F78] leading-relaxed">
                  {track.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Player Controls Bar */}
        <div className="p-3.5 rounded-card bg-[#F7F6FB] border border-[#E8E6F1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              leftIcon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              onClick={handlePlayPause}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>

            <div className="min-w-0">
              <span className="text-xs font-bold text-[#25233B] block truncate">
                {activeTrack.title}
              </span>
              <span className="text-[11px] text-[#625F78]">
                {isPlaying
                  ? sleepTimerMinutes > 0
                    ? `Stops in ${formatTimer(timerSecondsLeft)}`
                    : 'Playing loop'
                  : 'Ready to play'}
              </span>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center gap-2.5 sm:w-52">
            <Volume2 className="w-4 h-4 text-[#5554B8] shrink-0" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              aria-label="Sound lounge volume"
              className="w-full accent-[#5554B8] cursor-pointer"
            />
            <span className="text-xs font-semibold text-[#625F78] w-9 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </Card>
    </section>
  );
};

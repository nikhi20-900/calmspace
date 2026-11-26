import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseActiveTimeTrackerOptions {
  intervalMinutes: number;
  enabled: boolean;
  onPrompt?: () => void;
}

export interface UseActiveTimeTrackerReturn {
  activeVisibleMinutes: number;
  isPromptVisible: boolean;
  dismissPrompt: () => void;
  snoozePrompt: (snoozeMinutes?: number) => void;
  resetTracker: () => void;
}

/**
 * Tracks accumulated foreground (visible tab) application usage.
 * Explicitly pauses accumulation when tab is hidden or backgrounded.
 * Respects user preferences; does NOT use service workers or external push notifications.
 */
export function useActiveTimeTracker({
  intervalMinutes,
  enabled,
  onPrompt,
}: UseActiveTimeTrackerOptions): UseActiveTimeTrackerReturn {
  const [accumulatedSeconds, setAccumulatedSeconds] = useState<number>(0);
  const [isPromptVisible, setIsPromptVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const lastTickTimeRef = useRef<number>(Date.now());
  const thresholdSeconds = Math.max(1, intervalMinutes) * 60;

  useEffect(() => {
    if (!enabled || isDismissed) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Paused in background: flush time up to this point
        lastTickTimeRef.current = Date.now();
      } else {
        // Returned to foreground: start fresh interval baseline
        lastTickTimeRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Accumulate visible foreground time every second
    intervalId = setInterval(() => {
      if (document.hidden) {
        lastTickTimeRef.current = Date.now();
        return;
      }

      const now = Date.now();
      const elapsedSec = Math.floor((now - lastTickTimeRef.current) / 1000);

      if (elapsedSec >= 1) {
        lastTickTimeRef.current = now;
        setAccumulatedSeconds((prev) => prev + elapsedSec);
      }
    }, 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isDismissed, thresholdSeconds]);

  // Trigger pacing prompt via effect rather than inside a state updater
  useEffect(() => {
    if (
      enabled &&
      !isDismissed &&
      !isPromptVisible &&
      accumulatedSeconds >= thresholdSeconds
    ) {
      setIsPromptVisible(true);
      onPrompt?.();
    }
  }, [accumulatedSeconds, enabled, isDismissed, isPromptVisible, onPrompt, thresholdSeconds]);

  const dismissPrompt = useCallback(() => {
    setIsPromptVisible(false);
    setIsDismissed(true); // Do not repeatedly prompt in current session
  }, []);

  const snoozePrompt = useCallback(
    (snoozeMinutes = 15) => {
      setIsPromptVisible(false);
      // Wind back counter so next prompt fires in `snoozeMinutes`
      const targetSeconds = Math.max(0, thresholdSeconds - snoozeMinutes * 60);
      setAccumulatedSeconds(targetSeconds);
      setIsDismissed(false);
      lastTickTimeRef.current = Date.now();
    },
    [thresholdSeconds]
  );

  const resetTracker = useCallback(() => {
    setAccumulatedSeconds(0);
    setIsPromptVisible(false);
    setIsDismissed(false);
    lastTickTimeRef.current = Date.now();
  }, []);

  return {
    activeVisibleMinutes: Math.floor(accumulatedSeconds / 60),
    isPromptVisible,
    dismissPrompt,
    snoozePrompt,
    resetTracker,
  };
}

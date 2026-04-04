import { useCallback, useEffect, useRef, useState } from "react";
import { loadSettings, saveSettings } from "../lib/settings";

interface UseIntervalRepeatOptions {
  onRepeatComplete: () => void;
  onPlayCurrent: () => void;
  onEnded: (handler: () => void) => () => void;
}

export function useIntervalRepeat({
  onRepeatComplete,
  onPlayCurrent,
  onEnded,
}: UseIntervalRepeatOptions) {
  const [repeatCount, setRepeatCount] = useState(() => loadSettings().repeatCount);
  const [pauseDuration, setPauseDuration] = useState(() => loadSettings().pauseDuration);
  const [autoRepeat, setAutoRepeat] = useState(() => loadSettings().autoRepeat);
  const currentRepeatRef = useRef(0);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Listen for audio end events
  useEffect(() => {
    if (!autoRepeat) return;

    return onEnded(() => {
      currentRepeatRef.current += 1;

      if (currentRepeatRef.current < repeatCount) {
        // More repeats to go - pause then replay
        pauseTimerRef.current = setTimeout(() => {
          onPlayCurrent();
        }, pauseDuration * 1000);
      } else {
        // Done repeating - move to next
        currentRepeatRef.current = 0;
        pauseTimerRef.current = setTimeout(() => {
          onRepeatComplete();
        }, pauseDuration * 1000);
      }
    });
  }, [autoRepeat, repeatCount, pauseDuration, onEnded, onPlayCurrent, onRepeatComplete]);

  const resetRepeatCounter = useCallback(() => {
    currentRepeatRef.current = 0;
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
    }
  }, []);

  // Persist settings changes
  useEffect(() => {
    saveSettings({ repeatCount, pauseDuration, autoRepeat });
  }, [repeatCount, pauseDuration, autoRepeat]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
      }
    };
  }, []);

  return {
    repeatCount,
    setRepeatCount,
    pauseDuration,
    setPauseDuration,
    autoRepeat,
    setAutoRepeat,
    resetRepeatCounter,
  };
}

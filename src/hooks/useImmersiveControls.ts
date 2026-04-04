import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_HIDE_MS = 4000;

export function useImmersiveControls() {
  const [controlsVisible, setControlsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideControls = useCallback(() => {
    clearTimer();
    setControlsVisible(false);
  }, [clearTimer]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, AUTO_HIDE_MS);
  }, [clearTimer]);

  const toggleControls = useCallback(() => {
    setControlsVisible((prev) => {
      if (prev) {
        clearTimer();
        return false;
      }
      clearTimer();
      timerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, AUTO_HIDE_MS);
      return true;
    });
  }, [clearTimer]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { controlsVisible, showControls, hideControls, toggleControls };
}

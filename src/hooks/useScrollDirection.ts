import { useCallback, useEffect, useRef, useState } from "react";

type Direction = "up" | "down" | null;

export function useScrollDirection(
  ref: React.RefObject<HTMLElement | null>,
  threshold = 10,
): { direction: Direction; reset: () => void } {
  const [direction, setDirection] = useState<Direction>(null);
  const lastScrollY = useRef(0);

  const reset = useCallback(() => {
    setDirection(null);
    if (ref.current) {
      lastScrollY.current = ref.current.scrollTop;
    }
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    lastScrollY.current = el.scrollTop;

    const handleScroll = () => {
      const scrollTop = Math.max(0, el.scrollTop);
      const diff = scrollTop - lastScrollY.current;

      if (diff > threshold) {
        setDirection("down");
        lastScrollY.current = scrollTop;
      } else if (diff < -threshold) {
        setDirection("up");
        lastScrollY.current = scrollTop;
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [ref, threshold]);

  return { direction, reset };
}

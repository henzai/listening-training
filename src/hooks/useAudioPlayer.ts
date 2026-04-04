import { useRef, useState, useCallback, useEffect } from "react";
import { getAudioUrl } from "../lib/api";
import { loadSettings, saveSettings } from "../lib/settings";

interface UseAudioPlayerOptions {
  scriptId: string;
  sentenceCount: number;
}

export function useAudioPlayer({ scriptId, sentenceCount }: UseAudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => loadSettings().speed);
  const [preloaded, setPreloaded] = useState<Set<number>>(new Set());

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preservesPitch = true;
    audioRef.current = audio;

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Update playback rate when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    saveSettings({ speed });
  }, [speed]);

  // Preload audio files
  useEffect(() => {
    const loaded = new Set<number>();
    for (let i = 0; i < sentenceCount; i++) {
      const audio = new Audio(getAudioUrl(scriptId, i));
      audio.addEventListener("canplaythrough", () => {
        loaded.add(i);
        setPreloaded(new Set(loaded));
      });
    }
  }, [scriptId, sentenceCount]);

  const loadAndPlay = useCallback(
    async (index: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.src = getAudioUrl(scriptId, index);
      audio.playbackRate = speed;
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        // Autoplay blocked - user needs to interact
        setIsPlaying(false);
      }
    },
    [scriptId, speed],
  );

  const play = useCallback(() => {
    loadAndPlay(currentIndex);
  }, [currentIndex, loadAndPlay]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= sentenceCount) return;
      setCurrentIndex(index);
      if (isPlaying) {
        loadAndPlay(index);
      }
    },
    [sentenceCount, isPlaying, loadAndPlay],
  );

  const next = useCallback(() => {
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  const prev = useCallback(() => {
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  const onEnded = useCallback((handler: () => void) => {
    const audio = audioRef.current;
    if (!audio) return () => {};
    audio.addEventListener("ended", handler);
    return () => audio.removeEventListener("ended", handler);
  }, []);

  return {
    currentIndex,
    isPlaying,
    speed,
    setSpeed,
    preloaded,
    play,
    pause,
    togglePlay,
    goTo,
    next,
    prev,
    loadAndPlay,
    onEnded,
    audioRef,
  };
}

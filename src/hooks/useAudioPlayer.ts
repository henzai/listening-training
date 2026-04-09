import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioUrl } from "../lib/api";
import { getCachedAudioUrl } from "../lib/scriptCache";
import { loadSettings, saveSettings } from "../lib/settings";

interface UseAudioPlayerOptions {
  scriptId: string;
  sentenceCount: number;
}

export function useAudioPlayer({ scriptId, sentenceCount }: UseAudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(() => loadSettings().speed);
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
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Update playback rate when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    saveSettings({ speed });
  }, [speed]);

  const loadAndPlay = useCallback(
    async (index: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }

      const cachedUrl = await getCachedAudioUrl(scriptId, index);
      if (cachedUrl) {
        blobUrlRef.current = cachedUrl;
      }

      audio.src = cachedUrl ?? getAudioUrl(scriptId, index);
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

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

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
    pause,
    goTo,
    loadAndPlay,
    onEnded,
  };
}

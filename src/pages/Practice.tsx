import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { useImmersiveControls } from "../hooks/useImmersiveControls";
import { usePracticeSession } from "../hooks/usePracticeSession";
import type { PracticeMode } from "../lib/types";
import { SPEED_PRESETS } from "../lib/types";
import styles from "./Practice.module.css";

const MODE_LABELS: Record<PracticeMode, string> = {
  "listen-read": "Listen & Read",
  "guided-shadow": "Guided Shadow",
  "blind-shadow": "Blind Shadow",
};

export function Practice() {
  const { scriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();

  const session = usePracticeSession(scriptId!);
  const player = useAudioPlayer({
    scriptId: scriptId!,
    sentenceCount: session.sentences.length,
  });
  const { controlsVisible, showControls, toggleControls } = useImmersiveControls();

  const sentenceRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-play first sentence when loaded
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once when sentences are ready
  useEffect(() => {
    if (session.sentences.length > 0) {
      player.loadAndPlay(0);
    }
  }, [session.sentences.length]);

  // Auto-advance to next sentence when current one ends
  const handleNext = useCallback(() => {
    if (player.currentIndex < session.sentences.length - 1) {
      const nextIndex = player.currentIndex + 1;
      player.goTo(nextIndex);
      player.loadAndPlay(nextIndex);
    }
  }, [player, session.sentences.length]);

  useEffect(() => {
    return player.onEnded(() => {
      handleNext();
    });
  }, [player.onEnded, handleNext]);

  // Mark as practiced when user starts playing
  // biome-ignore lint/correctness/useExhaustiveDependencies: markPracticed is stable
  useEffect(() => {
    if (player.isPlaying) {
      session.markPracticed();
    }
  }, [player.isPlaying]);

  // Auto-scroll to current sentence
  useEffect(() => {
    sentenceRefs.current[player.currentIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [player.currentIndex]);

  if (session.loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (session.error || !session.script) {
    return (
      <div className={styles.error}>
        <p>{session.error ?? "スクリプトが見つかりません"}</p>
        <button type="button" onClick={() => navigate("/library")}>
          ライブラリに戻る
        </button>
      </div>
    );
  }

  const overlayClass = controlsVisible ? styles.overlayVisible : "";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tap-to-toggle controls overlay
    <div
      className={styles.container}
      onClick={toggleControls}
      onKeyDown={(e) => {
        if (e.key === "Escape") toggleControls();
      }}
      role="presentation"
    >
      {/* Full-screen sentence list */}
      <div className={styles.sentenceList}>
        {session.sentences.map((s, i) => (
          <button
            type="button"
            key={s.id}
            ref={(el) => {
              sentenceRefs.current[i] = el;
            }}
            className={`${styles.sentenceItem} ${i === player.currentIndex ? styles.sentenceActive : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (player.isPlaying && i === player.currentIndex) {
                player.pause();
              } else {
                player.goTo(i);
                player.loadAndPlay(i);
              }
              showControls();
            }}
          >
            <div className={styles.sentenceText}>
              {session.showEnglish && (
                <p className={styles.textEn}>
                  {s.speaker && (i === 0 || session.sentences[i - 1].speaker !== s.speaker) && (
                    <span className={styles.speakerLabel}>{s.speaker}</span>
                  )}
                  {s.text_en}
                </p>
              )}
              {session.showJapanese && s.text_ja && <p className={styles.textJa}>{s.text_ja}</p>}
              {!session.showEnglish && !session.showJapanese && (
                <p className={styles.blindHint}>───</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Top overlay: header + mode + toggles */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay tap handler */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by container */}
      <div
        className={`${styles.overlayTop} ${overlayClass}`}
        onClick={(e) => {
          e.stopPropagation();
          showControls();
        }}
      >
        <div className={styles.header}>
          <button type="button" className={styles.backButton} onClick={() => navigate(-1)}>
            ←
          </button>
          <div className={styles.headerInfo}>
            <span className={styles.topic}>{session.script.topic}</span>
            <span className={styles.counter}>
              {player.currentIndex + 1} / {session.sentences.length}
            </span>
          </div>
        </div>

        <div className={styles.modeSelector}>
          {(["listen-read", "guided-shadow", "blind-shadow"] as const).map((m) => (
            <button
              type="button"
              key={m}
              className={`${styles.modeButton} ${session.mode === m ? styles.modeActive : ""}`}
              onClick={() => session.setMode(m)}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className={styles.toggleRow}>
          <button
            type="button"
            className={`${styles.toggleButton} ${session.showEnglish ? styles.toggleActive : ""}`}
            onClick={() => session.setShowEnglish(!session.showEnglish)}
          >
            EN
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${session.showJapanese ? styles.toggleActive : ""}`}
            onClick={() => session.setShowJapanese(!session.showJapanese)}
          >
            JA
          </button>
        </div>
      </div>

      {/* Bottom overlay: playback + speed */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay tap handler */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by container */}
      <div
        className={`${styles.overlayBottom} ${overlayClass}`}
        onClick={(e) => {
          e.stopPropagation();
          showControls();
        }}
      >
        <div className={styles.speedSection}>
          <span className={styles.sectionLabel}>Speed</span>
          <div className={styles.speedPresets}>
            {SPEED_PRESETS.map((s) => (
              <button
                type="button"
                key={s}
                className={`${styles.presetButton} ${player.speed === s ? styles.presetActive : ""}`}
                onClick={() => player.setSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={player.speed}
            onChange={(e) => player.setSpeed(Number(e.target.value))}
            className={styles.slider}
          />
          <span className={styles.speedValue}>{player.speed.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
}

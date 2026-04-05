import { SPEED_PRESETS } from "../lib/types";
import styles from "./SpeedControl.module.css";

interface SpeedControlProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function SpeedControl({ speed, onSpeedChange }: SpeedControlProps) {
  return (
    <div className={styles.speedSection}>
      <span className={styles.sectionLabel}>Speed</span>
      <div className={styles.speedPresets}>
        {SPEED_PRESETS.map((s) => (
          <button
            type="button"
            key={s}
            className={`${styles.presetButton} ${speed === s ? styles.presetActive : ""}`}
            onClick={() => onSpeedChange(s)}
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
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className={styles.slider}
      />
      <span className={styles.speedValue}>{speed.toFixed(1)}x</span>
    </div>
  );
}

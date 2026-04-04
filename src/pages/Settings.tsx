import { useState } from "react";
import { loadSettings, saveSettings } from "../lib/settings";
import { SPEED_PRESETS } from "../lib/types";
import styles from "./Settings.module.css";

export function Settings() {
  const [settings, setSettings] = useState(() => loadSettings());

  function update(patch: Parameters<typeof saveSettings>[0]) {
    saveSettings(patch);
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      {/* Speed Control */}
      <div className={styles.speedSection}>
        <span className={styles.sectionLabel}>Speed</span>
        <div className={styles.speedPresets}>
          {SPEED_PRESETS.map((s) => (
            <button
              type="button"
              key={s}
              className={`${styles.presetButton} ${settings.speed === s ? styles.presetActive : ""}`}
              onClick={() => update({ speed: s })}
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
          value={settings.speed}
          onChange={(e) => update({ speed: Number(e.target.value) })}
          className={styles.slider}
        />
        <span className={styles.speedValue}>{settings.speed.toFixed(1)}x</span>
      </div>
    </div>
  );
}

import { useState } from "react";
import { SpeedControl } from "../components/SpeedControl";
import { loadSettings, saveSettings } from "../lib/settings";
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
      <SpeedControl speed={settings.speed} onSpeedChange={(s) => update({ speed: s })} />
    </div>
  );
}

const STORAGE_KEY = "shadowing-settings";

interface Settings {
  speed: number;
  repeatCount: number;
  pauseDuration: number;
  autoRepeat: boolean;
}

const DEFAULTS: Settings = {
  speed: 1.0,
  repeatCount: 1,
  pauseDuration: 1,
  autoRepeat: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: Partial<Settings>): void {
  const current = loadSettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...settings }));
}

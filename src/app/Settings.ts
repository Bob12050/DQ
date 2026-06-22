/** UI/audio preferences. Stored in localStorage (small, non-critical data). */
export interface GameSettings {
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  battleSpeed: 1 | 2 | 3; // animation speed multiplier
  targetFps: 30 | 60;
  lowEffects: boolean;
  devMode: boolean;
}

const KEY = 'eob.settings';

const DEFAULTS: GameSettings = {
  bgmVolume: 0.6,
  sfxVolume: 0.8,
  muted: false,
  battleSpeed: 1,
  targetFps: 60,
  lowEffects: false,
  devMode: false,
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<GameSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

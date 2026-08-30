// 全局设置：与存档无关，所有世界共用，单独存在 localStorage
const SETTINGS_KEY = "mc-clone-settings-v1"

export interface Settings {
  renderDistance: number
  mouseSensitivity: number
  fov: number
  simulationDistance: number
  shadows: boolean
  autoJump: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  renderDistance: 4,
  mouseSensitivity: 1,
  fov: 75,
  simulationDistance: 8,
  shadows: true,
  autoJump: true,
}

export function loadGlobalSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveGlobalSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {
    /* noop */
  }
}

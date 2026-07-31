export const CANVAS_WIDTH = 1024
export const CANVAS_HEIGHT = 768

export const TRACK = {
  centerX: 512,
  centerY: 384,
  outerRadiusX: 460,
  outerRadiusY: 330,
  innerRadiusX: 220,
  innerRadiusY: 150,
  startAngle: -Math.PI / 2,
  width: 120
}

export const GAME_CONFIG = {
  totalLaps: 3,
  maxKarts: 4,
  itemBoxCount: 8,
  itemBoxRespawnMs: 5000,
  spinOutDuration: 1200,
  starDuration: 5000,
  boostDuration: 2000,
  lightningDuration: 3000
}

export const WEAPONS = {
  GREEN_SHELL: "green_shell",
  RED_SHELL: "red_shell",
  BANANA: "banana",
  MUSHROOM: "mushroom",
  STAR: "star",
  LIGHTNING: "lightning"
}

export const WEAPON_POOL = [
  WEAPONS.GREEN_SHELL,
  WEAPONS.GREEN_SHELL,
  WEAPONS.RED_SHELL,
  WEAPONS.BANANA,
  WEAPONS.BANANA,
  WEAPONS.MUSHROOM,
  WEAPONS.MUSHROOM,
  WEAPONS.STAR,
  WEAPONS.LIGHTNING
]

export const KART_COLORS = [
  { body: "#e63946", accent: "#ff6b6b", name: "Red Racer" },
  { body: "#457b9d", accent: "#a8dadc", name: "Blue Bolt" },
  { body: "#2a9d8f", accent: "#52b788", name: "Green Machine" },
  { body: "#e9c46a", accent: "#f4a261", name: "Gold Kart" }
]

export function randomWeapon() {
  return WEAPON_POOL[Math.floor(Math.random() * WEAPON_POOL.length)]
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

export function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2
  while (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

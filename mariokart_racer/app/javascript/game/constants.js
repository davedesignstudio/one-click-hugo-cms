export const CANVAS_WIDTH = 900;
export const CANVAS_HEIGHT = 600;
export const TOTAL_LAPS = 3;

export const TRACK = {
  cx: 450,
  cy: 300,
  outerRx: 380,
  outerRy: 250,
  innerRx: 220,
  innerRy: 140,
};

export const WEAPONS = {
  GREEN_SHELL: { id: "green_shell", icon: "🐢", name: "Green Shell" },
  RED_SHELL: { id: "red_shell", icon: "🔴", name: "Red Shell" },
  BANANA: { id: "banana", icon: "🍌", name: "Banana" },
  MUSHROOM: { id: "mushroom", icon: "🍄", name: "Mushroom" },
  STAR: { id: "star", icon: "⭐", name: "Star" },
  LIGHTNING: { id: "lightning", icon: "⚡", name: "Lightning" },
};

export const WEAPON_POOL = Object.values(WEAPONS);

export const KART_COLORS = [
  { body: "#e63946", accent: "#ff6b6b", name: "Red Racer" },
  { body: "#457b9d", accent: "#a8dadc", name: "Blue Bolt" },
  { body: "#2a9d8f", accent: "#76c7c0", name: "Green Machine" },
  { body: "#e9c46a", accent: "#f4d35e", name: "Gold Flash" },
];

export const AI_NAMES = ["Peach", "Bowser", "Toad"];

export function randomWeapon() {
  return WEAPON_POOL[Math.floor(Math.random() * WEAPON_POOL.length)];
}

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalizeAngle(angle) {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

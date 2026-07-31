export const TOTAL_LAPS = 3
export const KART_COUNT = 4
export const WORLD = { width: 2400, height: 1600 }

export const ITEM_TYPES = {
  banana: { id: "banana", label: "Banana", color: "#e6b400" },
  green_shell: { id: "green_shell", label: "Green Shell", color: "#2db84c" },
  red_shell: { id: "red_shell", label: "Red Shell", color: "#e23b3b" },
  mushroom: { id: "mushroom", label: "Mushroom", color: "#e23b5a" },
  lightning: { id: "lightning", label: "Lightning", color: "#f0b400" },
  oil: { id: "oil", label: "Oil Slick", color: "#2a3038" }
}

export const ITEM_POOL = [
  "banana",
  "banana",
  "green_shell",
  "green_shell",
  "red_shell",
  "mushroom",
  "mushroom",
  "lightning",
  "oil"
]

export const KART_COLORS = ["#c8f542", "#3de0d0", "#ff5a3c", "#ffb020"]
export const KART_NAMES = ["You", "Nitro", "Zip", "Blitz"]

export const PLACE_SUFFIX = ["th", "st", "nd", "rd"]

export function placeLabel(n) {
  const v = n % 100
  return `${n}${PLACE_SUFFIX[(v - 20) % 10] || PLACE_SUFFIX[v] || PLACE_SUFFIX[0]}`
}

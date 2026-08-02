// Temporary art catalog. Swap files under /public/game/placeholders/
// keeping the same filenames — no code changes required.

export const PLACEHOLDER_BASE = "/game/placeholders"

export const PLACEHOLDER_PATHS = {
  kartPlayer: `${PLACEHOLDER_BASE}/kart-player.svg`,
  kartNova: `${PLACEHOLDER_BASE}/kart-nova.svg`,
  kartBlaze: `${PLACEHOLDER_BASE}/kart-blaze.svg`,
  kartEcho: `${PLACEHOLDER_BASE}/kart-echo.svg`,
  itemBox: `${PLACEHOLDER_BASE}/item-box.svg`,
  banana: `${PLACEHOLDER_BASE}/banana.svg`,
  greenShell: `${PLACEHOLDER_BASE}/green-shell.svg`,
  redShell: `${PLACEHOLDER_BASE}/red-shell.svg`,
  mushroom: `${PLACEHOLDER_BASE}/mushroom.svg`,
  oil: `${PLACEHOLDER_BASE}/oil.svg`,
  lightning: `${PLACEHOLDER_BASE}/lightning.svg`,
  grandstand: `${PLACEHOLDER_BASE}/grandstand.svg`,
  boostFlame: `${PLACEHOLDER_BASE}/boost-flame.svg`
}

const KART_KEYS_BY_COLOR = {
  "#e85d04": "kartPlayer",
  "#2a9d8f": "kartNova",
  "#ef476f": "kartBlaze",
  "#4cc9f0": "kartEcho"
}

const ITEM_KEYS = {
  banana: "banana",
  green_shell: "greenShell",
  red_shell: "redShell",
  mushroom: "mushroom",
  oil: "oil",
  lightning: "lightning"
}

export function kartAssetKey(kart) {
  if (kart.isPlayer) return "kartPlayer"
  return KART_KEYS_BY_COLOR[kart.color] || "kartNova"
}

export function itemAssetKey(type) {
  return ITEM_KEYS[type] || null
}

export function loadPlaceholders(paths = PLACEHOLDER_PATHS) {
  const entries = Object.entries(paths)
  const images = {}

  return Promise.all(
    entries.map(
      ([key, src]) =>
        new Promise((resolve) => {
          const img = new Image()
          img.decoding = "async"
          img.onload = () => {
            images[key] = img
            resolve()
          }
          img.onerror = () => {
            images[key] = null
            resolve()
          }
          img.src = src
        })
    )
  ).then(() => images)
}

export function drawPlaceholder(ctx, img, x, y, width, height, options = {}) {
  if (!img) return false
  const { centered = true, rotation = 0 } = options
  ctx.save()
  if (centered) ctx.translate(x, y)
  else ctx.translate(x + width / 2, y + height / 2)
  if (rotation) ctx.rotate(rotation)
  ctx.drawImage(img, -width / 2, -height / 2, width, height)
  ctx.restore()
  return true
}

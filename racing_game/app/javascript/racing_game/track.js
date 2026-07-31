// Oval circuit track geometry and collision helpers

export const CANVAS_WIDTH = 1024
export const CANVAS_HEIGHT = 768
export const TRACK_CENTER = { x: 512, y: 384 }
export const OUTER_RX = 440
export const OUTER_RY = 310
export const INNER_RX = 240
export const INNER_RY = 140
export const ROAD_WIDTH = OUTER_RX - INNER_RX

export const ITEM_BOX_POSITIONS = [
  { x: 512, y: 120 },
  { x: 880, y: 280 },
  { x: 880, y: 500 },
  { x: 512, y: 660 },
  { x: 144, y: 500 },
  { x: 144, y: 280 }
]

export const START_LINE = { x: 512, y: 620, width: 120 }

export function isOnTrack(x, y) {
  const dx = x - TRACK_CENTER.x
  const dy = y - TRACK_CENTER.y
  const outer = (dx * dx) / (OUTER_RX * OUTER_RX) + (dy * dy) / (OUTER_RY * OUTER_RY)
  const inner = (dx * dx) / (INNER_RX * INNER_RX) + (dy * dy) / (INNER_RY * INNER_RY)
  return outer <= 1 && inner >= 1
}

export function clampToTrack(x, y) {
  const dx = x - TRACK_CENTER.x
  const dy = y - TRACK_CENTER.y
  const angle = Math.atan2(dy / OUTER_RY, dx / OUTER_RX)
  const outerDist = Math.hypot(OUTER_RX * Math.cos(angle), OUTER_RY * Math.sin(angle))
  const innerDist = Math.hypot(INNER_RX * Math.cos(angle), INNER_RY * Math.sin(angle))
  const dist = Math.hypot(dx, dy)
  const midDist = (outerDist + innerDist) / 2
  if (dist > outerDist - 8) {
    return {
      x: TRACK_CENTER.x + (outerDist - 12) * Math.cos(angle) * (OUTER_RX / outerDist) * (dist / Math.hypot(dx, dy)),
      y: TRACK_CENTER.y + (outerDist - 12) * Math.sin(angle) * (OUTER_RY / outerDist) * (dist / Math.hypot(dx, dy))
    }
  }
  if (dist < innerDist + 8) {
    const push = innerDist + 14
    const norm = Math.hypot(dx, dy) || 1
    return { x: TRACK_CENTER.x + (dx / norm) * push, y: TRACK_CENTER.y + (dy / norm) * push }
  }
  return { x, y }
}

export function getTrackAngle(x, y) {
  const dx = x - TRACK_CENTER.x
  const dy = y - TRACK_CENTER.y
  return Math.atan2(dy / OUTER_RY, dx / OUTER_RX)
}

export function drawTrack(ctx) {
  ctx.save()

  // Grass background
  const grass = ctx.createRadialGradient(TRACK_CENTER.x, TRACK_CENTER.y, 100, TRACK_CENTER.x, TRACK_CENTER.y, 520)
  grass.addColorStop(0, "#2d6a2d")
  grass.addColorStop(1, "#1a4a1a")
  ctx.fillStyle = grass
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Outer curb
  ctx.beginPath()
  ctx.ellipse(TRACK_CENTER.x, TRACK_CENTER.y, OUTER_RX + 6, OUTER_RY + 6, 0, 0, Math.PI * 2)
  ctx.fillStyle = "#cc2222"
  ctx.fill()

  // Road surface
  ctx.beginPath()
  ctx.ellipse(TRACK_CENTER.x, TRACK_CENTER.y, OUTER_RX, OUTER_RY, 0, 0, Math.PI * 2)
  ctx.fillStyle = "#3a3a3a"
  ctx.fill()

  // Inner island
  ctx.beginPath()
  ctx.ellipse(TRACK_CENTER.x, TRACK_CENTER.y, INNER_RX, INNER_RY, 0, 0, Math.PI * 2)
  const island = ctx.createRadialGradient(TRACK_CENTER.x, TRACK_CENTER.y, 20, TRACK_CENTER.x, TRACK_CENTER.y, INNER_RX)
  island.addColorStop(0, "#4a8f4a")
  island.addColorStop(1, "#2d6a2d")
  ctx.fillStyle = island
  ctx.fill()

  // Inner curb
  ctx.beginPath()
  ctx.ellipse(TRACK_CENTER.x, TRACK_CENTER.y, INNER_RX - 4, INNER_RY - 4, 0, 0, Math.PI * 2)
  ctx.strokeStyle = "#ffffff"
  ctx.lineWidth = 3
  ctx.setLineDash([12, 12])
  ctx.stroke()
  ctx.setLineDash([])

  // Center dashed racing line
  const midRx = (OUTER_RX + INNER_RX) / 2
  const midRy = (OUTER_RY + INNER_RY) / 2
  ctx.beginPath()
  ctx.ellipse(TRACK_CENTER.x, TRACK_CENTER.y, midRx, midRy, 0, 0, Math.PI * 2)
  ctx.strokeStyle = "rgba(255,255,255,0.35)"
  ctx.lineWidth = 2
  ctx.setLineDash([16, 20])
  ctx.stroke()
  ctx.setLineDash([])

  // Start / finish line
  ctx.save()
  ctx.translate(START_LINE.x, START_LINE.y)
  const stripeW = START_LINE.width / 8
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#111111"
    ctx.fillRect(-START_LINE.width / 2 + i * stripeW, -8, stripeW, 16)
  }
  ctx.restore()

  // Decorative trees on inner island
  const trees = [
    { x: 480, y: 360 }, { x: 540, y: 350 }, { x: 500, y: 410 },
    { x: 460, y: 390 }, { x: 560, y: 400 }, { x: 520, y: 330 }
  ]
  trees.forEach(t => drawTree(ctx, t.x, t.y))

  ctx.restore()
}

function drawTree(ctx, x, y) {
  ctx.fillStyle = "#5c3d1e"
  ctx.fillRect(x - 4, y, 8, 14)
  ctx.beginPath()
  ctx.moveTo(x, y - 22)
  ctx.lineTo(x - 14, y + 2)
  ctx.lineTo(x + 14, y + 2)
  ctx.closePath()
  ctx.fillStyle = "#1f6b1f"
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x, y - 14)
  ctx.lineTo(x - 11, y + 6)
  ctx.lineTo(x + 11, y + 6)
  ctx.closePath()
  ctx.fillStyle = "#2d8a2d"
  ctx.fill()
}

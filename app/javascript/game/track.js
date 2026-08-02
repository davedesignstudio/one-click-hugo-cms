// Coastal circuit centerline waypoints (canvas space 1200x720)
export const TRACK_WIDTH = 118
export const CANVAS_W = 1200
export const CANVAS_H = 720

export const CENTERLINE = [
  { x: 600, y: 600 },
  { x: 820, y: 600 },
  { x: 980, y: 560 },
  { x: 1060, y: 460 },
  { x: 1080, y: 340 },
  { x: 1020, y: 220 },
  { x: 880, y: 150 },
  { x: 700, y: 130 },
  { x: 520, y: 130 },
  { x: 340, y: 150 },
  { x: 200, y: 220 },
  { x: 140, y: 340 },
  { x: 150, y: 460 },
  { x: 230, y: 560 },
  { x: 400, y: 600 },
  { x: 520, y: 600 }
]

export const ITEM_SPAWNS = [
  { x: 900, y: 580 },
  { x: 1070, y: 400 },
  { x: 960, y: 180 },
  { x: 600, y: 130 },
  { x: 250, y: 180 },
  { x: 140, y: 400 },
  { x: 280, y: 580 },
  { x: 720, y: 600 }
]

export function dist(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

export function nearestWaypointIndex(point) {
  let best = 0
  let bestD = Infinity
  CENTERLINE.forEach((wp, i) => {
    const d = dist(point, wp)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

export function progressAlongTrack(point, waypointIndex) {
  const current = CENTERLINE[waypointIndex]
  const next = CENTERLINE[(waypointIndex + 1) % CENTERLINE.length]
  const segLen = dist(current, next) || 1
  const dx = next.x - current.x
  const dy = next.y - current.y
  const t = ((point.x - current.x) * dx + (point.y - current.y) * dy) / (segLen * segLen)
  return waypointIndex + Math.max(0, Math.min(1, t))
}

export function distanceToCenterline(point) {
  let min = Infinity
  for (let i = 0; i < CENTERLINE.length; i++) {
    const a = CENTERLINE[i]
    const b = CENTERLINE[(i + 1) % CENTERLINE.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy || 1
    let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    const px = a.x + dx * t
    const py = a.y + dy * t
    min = Math.min(min, Math.hypot(point.x - px, point.y - py))
  }
  return min
}

export function onTrack(point) {
  return distanceToCenterline(point) <= TRACK_WIDTH * 0.5
}

export function drawTrack(ctx, { sprites = {} } = {}) {
  // Grass / sand field
  const grass = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grass.addColorStop(0, "#1f6f5b")
  grass.addColorStop(0.55, "#2f8f63")
  grass.addColorStop(1, "#c9a66b")
  ctx.fillStyle = grass
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Decorative water edge
  ctx.fillStyle = "#0e5f63"
  ctx.beginPath()
  ctx.ellipse(1100, 80, 220, 90, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "rgba(215, 242, 239, 0.25)"
  ctx.beginPath()
  ctx.ellipse(1085, 70, 140, 40, 0.2, 0, Math.PI * 2)
  ctx.fill()

  // Track asphalt ribbon
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.strokeStyle = "#2a3230"
  ctx.lineWidth = TRACK_WIDTH + 18
  strokeCenterline(ctx)

  ctx.strokeStyle = "#3a4541"
  ctx.lineWidth = TRACK_WIDTH
  strokeCenterline(ctx)

  // Lane dashes
  ctx.save()
  ctx.setLineDash([18, 22])
  ctx.strokeStyle = "rgba(247, 241, 232, 0.55)"
  ctx.lineWidth = 3
  strokeCenterline(ctx)
  ctx.restore()

  // Outer / inner curbs
  ctx.strokeStyle = "#f2b705"
  ctx.lineWidth = 6
  ctx.globalAlpha = 0.85
  strokeOffset(ctx, TRACK_WIDTH * 0.5 + 4)
  strokeOffset(ctx, -(TRACK_WIDTH * 0.5 + 4))
  ctx.globalAlpha = 1

  // Start / finish line
  const start = CENTERLINE[0]
  const next = CENTERLINE[1]
  const angle = Math.atan2(next.y - start.y, next.x - start.x)
  ctx.save()
  ctx.translate(start.x, start.y)
  ctx.rotate(angle)
  for (let i = -5; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#f7f1e8" : "#142018"
    ctx.fillRect(-8, i * 10, 16, 10)
  }
  ctx.restore()

  // Grandstand (placeholder art when available)
  const stand = sprites.grandstand
  if (stand) {
    ctx.drawImage(stand, 500, 240, 200, 80)
  } else {
    ctx.fillStyle = "rgba(20, 32, 24, 0.55)"
    roundRect(ctx, 520, 250, 180, 70, 10)
    ctx.fill()
    ctx.fillStyle = "rgba(242, 183, 5, 0.35)"
    roundRect(ctx, 540, 265, 140, 16, 6)
    ctx.fill()
  }
}

function strokeCenterline(ctx) {
  ctx.beginPath()
  ctx.moveTo(CENTERLINE[0].x, CENTERLINE[0].y)
  for (let i = 1; i < CENTERLINE.length; i++) {
    ctx.lineTo(CENTERLINE[i].x, CENTERLINE[i].y)
  }
  ctx.closePath()
  ctx.stroke()
}

function strokeOffset(ctx, offset) {
  const pts = offsetPolyline(CENTERLINE, offset)
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
  ctx.closePath()
  ctx.stroke()
}

function offsetPolyline(points, offset) {
  return points.map((p, i) => {
    const prev = points[(i - 1 + points.length) % points.length]
    const next = points[(i + 1) % points.length]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    return { x: p.x + nx * offset, y: p.y + ny * offset }
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

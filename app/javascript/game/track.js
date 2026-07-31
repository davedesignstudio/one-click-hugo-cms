import { WORLD } from "game/constants"

// Closed-loop centerline waypoints for an oval-ish circuit with infield cut.
export const TRACK_PATH = [
  { x: 500, y: 350 },
  { x: 900, y: 280 },
  { x: 1400, y: 280 },
  { x: 1850, y: 360 },
  { x: 2050, y: 560 },
  { x: 2050, y: 980 },
  { x: 1850, y: 1220 },
  { x: 1400, y: 1320 },
  { x: 950, y: 1320 },
  { x: 520, y: 1220 },
  { x: 320, y: 980 },
  { x: 320, y: 560 },
  { x: 420, y: 420 }
]

export const TRACK_HALF_WIDTH = 95

export function pathLength(path = TRACK_PATH) {
  let len = 0
  for (let i = 0; i < path.length; i++) {
    const a = path[i]
    const b = path[(i + 1) % path.length]
    len += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return len
}

export const TRACK_LENGTH = pathLength()

export function pointOnTrack(t, path = TRACK_PATH) {
  const target = ((t % 1) + 1) % 1 * TRACK_LENGTH
  let traveled = 0

  for (let i = 0; i < path.length; i++) {
    const a = path[i]
    const b = path[(i + 1) % path.length]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (traveled + seg >= target) {
      const u = (target - traveled) / seg
      const x = a.x + (b.x - a.x) * u
      const y = a.y + (b.y - a.y) * u
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      return { x, y, angle }
    }
    traveled += seg
  }

  const last = path[0]
  return { x: last.x, y: last.y, angle: 0 }
}

export function progressAlongTrack(x, y, path = TRACK_PATH) {
  let bestDist = Infinity
  let bestProgress = 0
  let traveled = 0

  for (let i = 0; i < path.length; i++) {
    const a = path[i]
    const b = path[(i + 1) % path.length]
    const abx = b.x - a.x
    const aby = b.y - a.y
    const segLen = Math.hypot(abx, aby) || 1
    const apx = x - a.x
    const apy = y - a.y
    const u = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (segLen * segLen)))
    const px = a.x + abx * u
    const py = a.y + aby * u
    const dist = Math.hypot(x - px, y - py)

    if (dist < bestDist) {
      bestDist = dist
      bestProgress = (traveled + segLen * u) / TRACK_LENGTH
    }
    traveled += segLen
  }

  return { progress: bestProgress, distanceFromCenter: bestDist }
}

export function isOnTrack(x, y) {
  const { distanceFromCenter } = progressAlongTrack(x, y)
  return distanceFromCenter <= TRACK_HALF_WIDTH
}

export function offTrackFactor(x, y) {
  const { distanceFromCenter } = progressAlongTrack(x, y)
  if (distanceFromCenter <= TRACK_HALF_WIDTH) return 1
  if (distanceFromCenter >= TRACK_HALF_WIDTH + 80) return 0.25
  const t = (distanceFromCenter - TRACK_HALF_WIDTH) / 80
  return 1 - t * 0.75
}

export function startGrid(count) {
  const spots = []
  for (let i = 0; i < count; i++) {
    const lane = i % 2 === 0 ? -36 : 36
    const back = i * 48
    const base = pointOnTrack(1 - back / TRACK_LENGTH)
    const nx = Math.cos(base.angle + Math.PI / 2)
    const ny = Math.sin(base.angle + Math.PI / 2)
    spots.push({
      x: base.x + nx * lane,
      y: base.y + ny * lane,
      angle: base.angle
    })
  }
  return spots
}

export function itemBoxSpawns() {
  const offsets = [0.12, 0.28, 0.47, 0.63, 0.78, 0.91]
  return offsets.flatMap((t, idx) => {
    const p = pointOnTrack(t)
    const nx = Math.cos(p.angle + Math.PI / 2)
    const ny = Math.sin(p.angle + Math.PI / 2)
    return [
      { x: p.x + nx * 28, y: p.y + ny * 28, id: `box-${idx}-a` },
      { x: p.x - nx * 28, y: p.y - ny * 28, id: `box-${idx}-b` }
    ]
  })
}

export function drawTrack(ctx) {
  // Grass / dirt field
  const grass = ctx.createLinearGradient(0, 0, WORLD.width, WORLD.height)
  grass.addColorStop(0, "#1f4d2e")
  grass.addColorStop(0.5, "#163822")
  grass.addColorStop(1, "#214f31")
  ctx.fillStyle = grass
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)

  // Soft hills
  ctx.fillStyle = "rgba(10, 40, 20, 0.35)"
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.ellipse(200 + i * 280, 180 + (i % 3) * 40, 140, 50, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Asphalt ribbon
  ctx.save()
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.strokeStyle = "#2a3340"
  ctx.lineWidth = TRACK_HALF_WIDTH * 2 + 28
  strokePath(ctx)
  ctx.strokeStyle = "#3a4554"
  ctx.lineWidth = TRACK_HALF_WIDTH * 2 + 8
  strokePath(ctx)
  ctx.strokeStyle = "#4a5564"
  ctx.lineWidth = TRACK_HALF_WIDTH * 2
  strokePath(ctx)

  // Center dashes
  ctx.setLineDash([28, 22])
  ctx.strokeStyle = "rgba(232, 239, 228, 0.55)"
  ctx.lineWidth = 4
  strokePath(ctx)
  ctx.setLineDash([])

  // Outer / inner curb accents
  ctx.strokeStyle = "#ff5a3c"
  ctx.lineWidth = 8
  ctx.setLineDash([18, 18])
  ctx.lineWidth = TRACK_HALF_WIDTH * 2 + 18
  strokePath(ctx)
  ctx.strokeStyle = "#f2f5f0"
  strokePath(ctx)
  ctx.setLineDash([])
  ctx.restore()

  // Start / finish line
  const start = pointOnTrack(0)
  ctx.save()
  ctx.translate(start.x, start.y)
  ctx.rotate(start.angle)
  for (let i = -5; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#f2f5f0" : "#10151c"
      ctx.fillRect(j * 14 - 14, i * 18, 14, 18)
    }
  }
  ctx.restore()
}

function strokePath(ctx, path = TRACK_PATH) {
  ctx.beginPath()
  ctx.moveTo(path[0].x, path[0].y)
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y)
  ctx.closePath()
  ctx.stroke()
}

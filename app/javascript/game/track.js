// Neon Loop — closed circuit defined by a centerline polyline.
const RAW_POINTS = [
  [180, 360], [260, 220], [420, 150], [620, 130], [820, 160],
  [980, 240], [1080, 340], [1100, 460], [1020, 560], [860, 610],
  [680, 620], [520, 580], [400, 520], [300, 480], [220, 500],
  [160, 450]
]

export const TRACK_WIDTH = 118
export const LAP_COUNT = 3
export const WORLD = { width: 1280, height: 720 }

function closeLoop(points) {
  return [...points, points[0]]
}

function polylineLength(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    total += Math.hypot(dx, dy)
  }
  return total
}

function resample(points, spacing = 12) {
  const closed = closeLoop(points)
  const samples = []
  let carry = 0
  samples.push([...closed[0]])

  for (let i = 1; i < closed.length; i++) {
    let x0 = closed[i - 1][0]
    let y0 = closed[i - 1][1]
    const x1 = closed[i][0]
    const y1 = closed[i][1]
    let segLen = Math.hypot(x1 - x0, y1 - y0)
    if (segLen === 0) continue

    while (carry + segLen >= spacing) {
      const t = (spacing - carry) / segLen
      x0 += (x1 - x0) * t
      y0 += (y1 - y0) * t
      samples.push([x0, y0])
      segLen = Math.hypot(x1 - x0, y1 - y0)
      carry = 0
    }
    carry += segLen
  }

  return samples
}

export const CENTERLINE = resample(RAW_POINTS, 14)
export const TRACK_LENGTH = polylineLength(closeLoop(CENTERLINE))

export function nearestPoint(x, y) {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < CENTERLINE.length; i++) {
    const dx = CENTERLINE[i][0] - x
    const dy = CENTERLINE[i][1] - y
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return { index: best, dist: Math.sqrt(bestDist), point: CENTERLINE[best] }
}

export function progressAt(x, y) {
  const { index, dist } = nearestPoint(x, y)
  return { index, dist, progress: index / CENTERLINE.length }
}

export function pointAtProgress(t) {
  const wrapped = ((t % 1) + 1) % 1
  const idx = Math.floor(wrapped * CENTERLINE.length) % CENTERLINE.length
  return CENTERLINE[idx]
}

export function tangentAt(index) {
  const a = CENTERLINE[index]
  const b = CENTERLINE[(index + 1) % CENTERLINE.length]
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

export function onTrack(x, y, margin = 0) {
  return nearestPoint(x, y).dist <= TRACK_WIDTH * 0.5 + margin
}

export function startPose(lane = 0) {
  const index = 0
  const angle = tangentAt(index)
  const [cx, cy] = CENTERLINE[index]
  const nx = Math.cos(angle + Math.PI / 2)
  const ny = Math.sin(angle + Math.PI / 2)
  const offset = (lane - 2) * 22
  return {
    x: cx + nx * offset,
    y: cy + ny * offset,
    angle,
    progressIndex: index
  }
}

export const ITEM_BOX_SPAWNS = [0.12, 0.28, 0.45, 0.62, 0.78, 0.9].map((t) => {
  const p = pointAtProgress(t)
  const idx = Math.floor(t * CENTERLINE.length) % CENTERLINE.length
  const angle = tangentAt(idx)
  return {
    x: p[0] + Math.cos(angle + Math.PI / 2) * 18,
    y: p[1] + Math.sin(angle + Math.PI / 2) * 18,
    active: true,
    cooldown: 0
  }
})

export function drawTrack(ctx) {
  const w = WORLD.width
  const h = WORLD.height

  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, "#10182c")
  sky.addColorStop(1, "#1a2744")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)

  // grass / offroad
  ctx.fillStyle = "#1f3d2d"
  ctx.beginPath()
  for (let i = 0; i < CENTERLINE.length; i++) {
    const [x, y] = CENTERLINE[i]
    const ang = tangentAt(i)
    const ox = Math.cos(ang + Math.PI / 2) * (TRACK_WIDTH * 0.5 + 54)
    const oy = Math.sin(ang + Math.PI / 2) * (TRACK_WIDTH * 0.5 + 54)
    if (i === 0) ctx.moveTo(x + ox, y + oy)
    else ctx.lineTo(x + ox, y + oy)
  }
  for (let i = CENTERLINE.length - 1; i >= 0; i--) {
    const [x, y] = CENTERLINE[i]
    const ang = tangentAt(i)
    const ox = Math.cos(ang + Math.PI / 2) * -(TRACK_WIDTH * 0.5 + 54)
    const oy = Math.sin(ang + Math.PI / 2) * -(TRACK_WIDTH * 0.5 + 54)
    ctx.lineTo(x + ox, y + oy)
  }
  ctx.closePath()
  ctx.fill()

  // asphalt
  ctx.fillStyle = "#2b3348"
  ctx.beginPath()
  for (let i = 0; i < CENTERLINE.length; i++) {
    const [x, y] = CENTERLINE[i]
    const ang = tangentAt(i)
    const ox = Math.cos(ang + Math.PI / 2) * (TRACK_WIDTH * 0.5)
    const oy = Math.sin(ang + Math.PI / 2) * (TRACK_WIDTH * 0.5)
    if (i === 0) ctx.moveTo(x + ox, y + oy)
    else ctx.lineTo(x + ox, y + oy)
  }
  for (let i = CENTERLINE.length - 1; i >= 0; i--) {
    const [x, y] = CENTERLINE[i]
    const ang = tangentAt(i)
    const ox = Math.cos(ang + Math.PI / 2) * -(TRACK_WIDTH * 0.5)
    const oy = Math.sin(ang + Math.PI / 2) * -(TRACK_WIDTH * 0.5)
    ctx.lineTo(x + ox, y + oy)
  }
  ctx.closePath()
  ctx.fill()

  // curb stripes
  for (let i = 0; i < CENTERLINE.length; i += 2) {
    const [x, y] = CENTERLINE[i]
    const ang = tangentAt(i)
    const nx = Math.cos(ang + Math.PI / 2)
    const ny = Math.sin(ang + Math.PI / 2)
    ctx.strokeStyle = i % 4 === 0 ? "#ff4d2e" : "#f4f7ff"
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(x + nx * (TRACK_WIDTH * 0.5 - 2), y + ny * (TRACK_WIDTH * 0.5 - 2))
    ctx.lineTo(x + nx * (TRACK_WIDTH * 0.5 + 8), y + ny * (TRACK_WIDTH * 0.5 + 8))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - nx * (TRACK_WIDTH * 0.5 - 2), y - ny * (TRACK_WIDTH * 0.5 - 2))
    ctx.lineTo(x - nx * (TRACK_WIDTH * 0.5 + 8), y - ny * (TRACK_WIDTH * 0.5 + 8))
    ctx.stroke()
  }

  // dashed center line
  ctx.setLineDash([16, 18])
  ctx.strokeStyle = "rgba(255,255,255,0.28)"
  ctx.lineWidth = 3
  ctx.beginPath()
  CENTERLINE.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.stroke()
  ctx.setLineDash([])

  // start/finish
  const [sx, sy] = CENTERLINE[0]
  const sang = tangentAt(0)
  const snx = Math.cos(sang + Math.PI / 2)
  const sny = Math.sin(sang + Math.PI / 2)
  for (let i = -5; i < 5; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#111" : "#f4f7ff"
      const px = sx + snx * (i * 11) + Math.cos(sang) * (j * 10 - 5)
      const py = sy + sny * (i * 11) + Math.sin(sang) * (j * 10 - 5)
      ctx.fillRect(px - 5, py - 5, 10, 10)
    }
  }
}

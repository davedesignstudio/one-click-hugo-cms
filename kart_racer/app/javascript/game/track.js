import { TRACK, distance } from "game/constants"

export function isOnTrack(x, y) {
  const dx = (x - TRACK.centerX) / TRACK.outerRadiusX
  const dy = (y - TRACK.centerY) / TRACK.outerRadiusY
  const outerDist = dx * dx + dy * dy

  const idx = (x - TRACK.centerX) / TRACK.innerRadiusX
  const idy = (y - TRACK.centerY) / TRACK.innerRadiusY
  const innerDist = idx * idx + idy * idy

  return outerDist <= 1 && innerDist >= 1
}

export function getTrackAngle(x, y) {
  return Math.atan2(y - TRACK.centerY, x - TRACK.centerX)
}

export function pushToTrack(x, y) {
  const angle = getTrackAngle(x, y)
  const midRadiusX = (TRACK.outerRadiusX + TRACK.innerRadiusX) / 2
  const midRadiusY = (TRACK.outerRadiusY + TRACK.innerRadiusY) / 2
  return {
    x: TRACK.centerX + Math.cos(angle) * midRadiusX,
    y: TRACK.centerY + Math.sin(angle) * midRadiusY
  }
}

export function getCheckpointProgress(angle) {
  let normalized = angle - TRACK.startAngle
  while (normalized < 0) normalized += Math.PI * 2
  return normalized / (Math.PI * 2)
}

export function generateItemBoxPositions(count) {
  const positions = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.PI / 4
    const radiusX = (TRACK.outerRadiusX + TRACK.innerRadiusX) / 2
    const radiusY = (TRACK.outerRadiusY + TRACK.innerRadiusY) / 2
    positions.push({
      x: TRACK.centerX + Math.cos(angle) * radiusX,
      y: TRACK.centerY + Math.sin(angle) * radiusY,
      active: true,
      respawnAt: 0
    })
  }
  return positions
}

export function getStartPositions(count) {
  const positions = []
  const baseAngle = TRACK.startAngle
  const radiusX = TRACK.outerRadiusX - 40
  const radiusY = TRACK.outerRadiusY - 30

  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * 0.08
    const angle = baseAngle + offset
    positions.push({
      x: TRACK.centerX + Math.cos(angle) * radiusX,
      y: TRACK.centerY + Math.sin(angle) * radiusY,
      angle: angle + Math.PI / 2
    })
  }
  return positions
}

export function drawTrack(ctx) {
  ctx.save()

  // Grass background
  ctx.fillStyle = "#2d6a4f"
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  // Outer track surface
  ctx.beginPath()
  ctx.ellipse(TRACK.centerX, TRACK.centerY, TRACK.outerRadiusX, TRACK.outerRadiusY, 0, 0, Math.PI * 2)
  ctx.fillStyle = "#495057"
  ctx.fill()

  // Inner grass island
  ctx.beginPath()
  ctx.ellipse(TRACK.centerX, TRACK.centerY, TRACK.innerRadiusX, TRACK.innerRadiusY, 0, 0, Math.PI * 2)
  ctx.fillStyle = "#40916c"
  ctx.fill()

  // Track racing line markings
  ctx.strokeStyle = "rgba(255,255,255,0.15)"
  ctx.lineWidth = 2
  const midRX = (TRACK.outerRadiusX + TRACK.innerRadiusX) / 2
  const midRY = (TRACK.outerRadiusY + TRACK.innerRadiusY) / 2
  ctx.beginPath()
  ctx.ellipse(TRACK.centerX, TRACK.centerY, midRX, midRY, 0, 0, Math.PI * 2)
  ctx.stroke()

  // Start/finish line
  const startX = TRACK.centerX + Math.cos(TRACK.startAngle) * TRACK.outerRadiusX
  const startY = TRACK.centerY + Math.sin(TRACK.startAngle) * TRACK.outerRadiusY
  const endX = TRACK.centerX + Math.cos(TRACK.startAngle) * TRACK.innerRadiusX
  const endY = TRACK.centerY + Math.sin(TRACK.startAngle) * TRACK.innerRadiusY

  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 6
  ctx.setLineDash([12, 12])
  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()
  ctx.setLineDash([])

  // Checkered pattern on start line
  const segments = 8
  for (let i = 0; i < segments; i++) {
    const t1 = i / segments
    const t2 = (i + 1) / segments
    if (i % 2 === 0) {
      ctx.fillStyle = "#fff"
      ctx.beginPath()
      ctx.moveTo(lerp(startX, endX, t1), lerp(startY, endY, t1))
      ctx.lineTo(lerp(startX, endX, t2), lerp(startY, endY, t2))
      ctx.lineTo(lerp(startX, endX, t2) + 8, lerp(startY, endY, t2))
      ctx.lineTo(lerp(startX, endX, t1) + 8, lerp(startY, endY, t1))
      ctx.fill()
    }
  }

  // Curbs (red/white alternating)
  drawCurb(ctx, TRACK.outerRadiusX, TRACK.outerRadiusY, true)
  drawCurb(ctx, TRACK.innerRadiusX, TRACK.innerRadiusY, false)

  ctx.restore()
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function drawCurb(ctx, radiusX, radiusY, outward) {
  const segments = 48
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * Math.PI * 2
    const a2 = ((i + 1) / segments) * Math.PI * 2
    ctx.fillStyle = i % 2 === 0 ? "#e63946" : "#fff"
    ctx.beginPath()
    ctx.moveTo(
      TRACK.centerX + Math.cos(a1) * radiusX,
      TRACK.centerY + Math.sin(a1) * radiusY
    )
    ctx.lineTo(
      TRACK.centerX + Math.cos(a2) * radiusX,
      TRACK.centerY + Math.sin(a2) * radiusY
    )
    const offset = outward ? 8 : -8
    const r2x = radiusX + offset
    const r2y = radiusY + offset
    ctx.lineTo(
      TRACK.centerX + Math.cos(a2) * r2x,
      TRACK.centerY + Math.sin(a2) * r2y
    )
    ctx.lineTo(
      TRACK.centerX + Math.cos(a1) * r2x,
      TRACK.centerY + Math.sin(a1) * r2y
    )
    ctx.closePath()
    ctx.fill()
  }
}

export function drawItemBox(ctx, box) {
  if (!box.active) return

  const pulse = Math.sin(Date.now() / 200) * 3
  const size = 18 + pulse

  ctx.save()
  ctx.translate(box.x, box.y)
  ctx.rotate(Date.now() / 1000)

  // Box glow
  ctx.shadowColor = "#ffd60a"
  ctx.shadowBlur = 15

  ctx.fillStyle = "#ffd60a"
  ctx.fillRect(-size / 2, -size / 2, size, size)

  ctx.strokeStyle = "#fff"
  ctx.lineWidth = 2
  ctx.strokeRect(-size / 2, -size / 2, size, size)

  // Question mark
  ctx.shadowBlur = 0
  ctx.fillStyle = "#e85d04"
  ctx.font = "bold 16px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("?", 0, 1)

  ctx.restore()
}

export function checkItemBoxCollision(kart, box) {
  if (!box.active) return false
  return distance(kart.x, kart.y, box.x, box.y) < 28
}

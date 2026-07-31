import { nearestPoint, onTrack, tangentAt, CENTERLINE } from "game/track"

let nextId = 1

export class Kart {
  constructor({ name, color, accent, isPlayer = false, skill = 0.7 }) {
    this.id = nextId++
    this.name = name
    this.color = color
    this.accent = accent
    this.isPlayer = isPlayer
    this.skill = skill
    this.x = 0
    this.y = 0
    this.angle = 0
    this.speed = 0
    this.radius = 16
    this.alive = true
    this.lap = 0
    this.checkpoint = 0
    this.progressIndex = 0
    this.finished = false
    this.finishTime = null
    this.finishPlace = null
    this.item = null
    this.spinTimer = 0
    this.boostTimer = 0
    this.invincible = 0
    this.shrinkTimer = 0
    this.lapTimes = []
    this.lapStart = 0
    this.itemsUsed = 0
    this.input = { up: false, down: false, left: false, right: false, item: false }
    this._itemLatched = false
    this._lastProgressIndex = 0
    this._passedMid = false
  }

  placeAt(pose) {
    this.x = pose.x
    this.y = pose.y
    this.angle = pose.angle
    this.progressIndex = pose.progressIndex
  }

  get maxSpeed() {
    let base = this.isPlayer ? 265 : 240 + this.skill * 40
    if (this.boostTimer > 0) base *= 1.45
    if (this.invincible > 0) base *= 1.25
    if (this.shrinkTimer > 0) base *= 0.55
    if (!onTrack(this.x, this.y, 4)) base *= 0.55
    return base
  }

  update(dt) {
    if (this.finished) {
      this.speed *= 0.96
      this.x += Math.cos(this.angle) * this.speed * dt
      this.y += Math.sin(this.angle) * this.speed * dt
      return
    }

    if (this.spinTimer > 0) {
      this.spinTimer -= dt
      this.angle += 9 * dt
      this.speed *= 0.9
      this.x += Math.cos(this.angle) * this.speed * dt * 0.35
      this.y += Math.sin(this.angle) * this.speed * dt * 0.35
      this._refreshProgress()
      return
    }

    if (this.boostTimer > 0) this.boostTimer -= dt
    if (this.invincible > 0) this.invincible -= dt
    if (this.shrinkTimer > 0) this.shrinkTimer -= dt

    const accel = this.isPlayer ? 220 : 190 + this.skill * 40
    const brake = 280
    const drag = 55

    if (this.input.up) this.speed += accel * dt
    if (this.input.down) this.speed -= brake * dt
    this.speed -= Math.sign(this.speed) * drag * dt
    if (Math.abs(this.speed) < 4 && !this.input.up && !this.input.down) this.speed = 0
    this.speed = Math.max(-90, Math.min(this.maxSpeed, this.speed))

    const steer = (this.input.left ? -1 : 0) + (this.input.right ? 1 : 0)
    const turnPower = 2.5 * (0.35 + Math.min(1, Math.abs(this.speed) / 180))
    this.angle += steer * turnPower * dt * Math.sign(this.speed || 1)

    this.x += Math.cos(this.angle) * this.speed * dt
    this.y += Math.sin(this.angle) * this.speed * dt

    // soft walls at world edge
    this.x = Math.max(20, Math.min(1260, this.x))
    this.y = Math.max(20, Math.min(700, this.y))

    this._refreshProgress()
    this._updateLap()
  }

  _refreshProgress() {
    const near = nearestPoint(this.x, this.y)
    this.progressIndex = near.index
  }

  _updateLap() {
    const total = CENTERLINE.length
    const prev = this._lastProgressIndex
    const curr = this.progressIndex

    if (curr > total * 0.4 && curr < total * 0.75) {
      this._passedMid = true
    }

    // Crossed the start/finish line traveling forward.
    if (this._passedMid && prev > total * 0.78 && curr < total * 0.12) {
      this.lap += 1
      this.checkpoint += 4
      this._passedMid = false
      const now = performance.now()
      if (this.lapStart > 0) this.lapTimes.push(now - this.lapStart)
      this.lapStart = now
    }

    this._lastProgressIndex = curr
  }

  raceDistance() {
    return this.lap * CENTERLINE.length + this.progressIndex
  }

  hit(power = 1) {
    if (this.invincible > 0 || this.finished) return
    this.spinTimer = 1.1 * power
    this.speed *= 0.2
    this.boostTimer = 0
  }

  shrink(duration = 3.2) {
    if (this.invincible > 0 || this.finished) return
    this.shrinkTimer = duration
    this.speed *= 0.5
  }

  applyBoost(duration = 1.1) {
    this.boostTimer = Math.max(this.boostTimer, duration)
  }

  applyStar(duration = 3.5) {
    this.invincible = Math.max(this.invincible, duration)
    this.boostTimer = Math.max(this.boostTimer, duration * 0.6)
    this.shrinkTimer = 0
  }

  draw(ctx, time) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    const scale = this.shrinkTimer > 0 ? 0.65 : 1
    ctx.scale(scale, scale)

    if (this.invincible > 0) {
      ctx.strokeStyle = `hsl(${(time * 240) % 360} 90% 60%)`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(0, 0, 24, 0, Math.PI * 2)
      ctx.stroke()
    }

    // body
    ctx.fillStyle = this.color
    ctx.strokeStyle = this.accent
    ctx.lineWidth = 2
    roundRect(ctx, -18, -12, 36, 24, 7)
    ctx.fill()
    ctx.stroke()

    // cockpit
    ctx.fillStyle = "rgba(255,255,255,0.35)"
    roundRect(ctx, -4, -8, 14, 16, 5)
    ctx.fill()

    // spoiler
    ctx.fillStyle = this.accent
    ctx.fillRect(-20, -10, 5, 20)

    // wheels
    ctx.fillStyle = "#111"
    ctx.fillRect(-14, -15, 10, 5)
    ctx.fillRect(-14, 10, 10, 5)
    ctx.fillRect(6, -15, 10, 5)
    ctx.fillRect(6, 10, 10, 5)

    if (this.boostTimer > 0) {
      ctx.fillStyle = "rgba(255, 209, 102, 0.75)"
      ctx.beginPath()
      ctx.moveTo(-22, -6)
      ctx.lineTo(-34 - Math.random() * 10, 0)
      ctx.lineTo(-22, 6)
      ctx.fill()
    }

    ctx.restore()

    // nameplate
    ctx.save()
    ctx.font = "600 12px Outfit, sans-serif"
    ctx.textAlign = "center"
    ctx.fillStyle = "rgba(0,0,0,0.45)"
    ctx.fillRect(this.x - 28, this.y - 34, 56, 16)
    ctx.fillStyle = this.isPlayer ? "#ffd166" : "#f4f7ff"
    ctx.fillText(this.name, this.x, this.y - 22)
    ctx.restore()
  }
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

export function sortedByRace(karts) {
  return [...karts].sort((a, b) => b.raceDistance() - a.raceDistance())
}

export function aiDrive(kart, karts, dt) {
  if (kart.finished || kart.spinTimer > 0) {
    kart.input = { up: false, down: false, left: false, right: false, item: false }
    return
  }

  const look = (kart.progressIndex + Math.floor(18 + kart.skill * 16)) % CENTERLINE.length
  const target = CENTERLINE[look]
  const desired = Math.atan2(target[1] - kart.y, target[0] - kart.x)
  let diff = desired - kart.angle
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2

  // stay near centerline with slight skill-based noise
  const near = nearestPoint(kart.x, kart.y)
  const trackAngle = tangentAt(near.index)
  const centerPull = Math.atan2(
    near.point[1] - kart.y,
    near.point[0] - kart.x
  )
  if (near.dist > 28) {
    let pullDiff = centerPull - kart.angle
    while (pullDiff > Math.PI) pullDiff -= Math.PI * 2
    while (pullDiff < -Math.PI) pullDiff += Math.PI * 2
    diff = diff * 0.45 + pullDiff * 0.55
  }

  kart.input.up = true
  kart.input.down = false
  kart.input.left = diff < -0.08
  kart.input.right = diff > 0.08

  // avoid walls by slowing in sharp turns
  if (Math.abs(diff) > 0.7) kart.input.up = kart.speed < 140

  // rubber band: if far behind player, push a bit
  const player = karts.find((k) => k.isPlayer)
  if (player && !player.finished) {
    const gap = player.raceDistance() - kart.raceDistance()
    if (gap > 80) kart.applyBoost(0.2)
  }

  // item use
  if (kart.item) {
    const place = sortedByRace(karts).findIndex((k) => k.id === kart.id)
    const ahead = sortedByRace(karts).find((k) => k.raceDistance() > kart.raceDistance())
    const roll = Math.random()
    if (kart.item === "mushroom" || kart.item === "star") {
      kart.input.item = roll < 0.02
    } else if (kart.item === "lightning") {
      kart.input.item = place > 1 && roll < 0.015
    } else if (kart.item === "banana") {
      kart.input.item = roll < 0.01
    } else if (kart.item === "green_shell" || kart.item === "red_shell") {
      kart.input.item = ahead && Math.hypot(ahead.x - kart.x, ahead.y - kart.y) < 260 && roll < 0.03
    }
  } else {
    kart.input.item = false
  }

  // tiny wobble so AI feels alive
  if (Math.random() < 0.01 * (1 - kart.skill)) {
    kart.input.left = !kart.input.left
    kart.input.right = false
  }
}

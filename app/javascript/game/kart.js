import { offTrackFactor, progressAlongTrack, pointOnTrack } from "game/track"

export class Kart {
  constructor({ id, name, color, x, y, angle, isPlayer = false }) {
    this.id = id
    this.name = name
    this.color = color
    this.x = x
    this.y = y
    this.angle = angle
    this.isPlayer = isPlayer
    this.speed = 0
    this.maxSpeed = isPlayer ? 5.4 : 4.9 + Math.random() * 0.35
    this.accel = isPlayer ? 0.12 : 0.1 + Math.random() * 0.02
    this.turnRate = 0.055
    this.friction = 0.982
    this.lap = 0
    this.progress = 0
    this.lastProgress = 0
    this.finished = false
    this.finishTime = null
    this.item = null
    this.spinTimer = 0
    this.boostTimer = 0
    this.shockTimer = 0
    this.invulnTimer = 0
    this.scale = 1
    this.weaponHits = 0
    this.aiTargetOffset = (Math.random() - 0.5) * 50
    this.aiAggression = 0.6 + Math.random() * 0.4
  }

  get raceDistance() {
    return this.lap + this.progress
  }

  hit(kind = "spin") {
    if (this.invulnTimer > 0 || this.finished) return false
    this.weaponHits += 1
    if (kind === "shock") {
      this.shockTimer = 180
      this.scale = 0.65
      this.speed *= 0.35
    } else {
      this.spinTimer = 70
      this.speed *= 0.2
    }
    this.invulnTimer = 45
    this.item = null
    return true
  }

  giveItem(type) {
    if (!this.item && !this.finished) this.item = type
  }

  update(input, dt) {
    if (this.finished) {
      this.speed *= 0.94
      this.x += Math.cos(this.angle) * this.speed
      this.y += Math.sin(this.angle) * this.speed
      return
    }

    if (this.invulnTimer > 0) this.invulnTimer -= 1
    if (this.boostTimer > 0) this.boostTimer -= 1
    if (this.shockTimer > 0) {
      this.shockTimer -= 1
      if (this.shockTimer <= 0) this.scale = 1
    }

    if (this.spinTimer > 0) {
      this.spinTimer -= 1
      this.angle += 0.28
      this.speed *= 0.9
      this.x += Math.cos(this.angle) * this.speed * 0.4
      this.y += Math.sin(this.angle) * this.speed * 0.4
      this._syncProgress()
      return
    }

    const surface = offTrackFactor(this.x, this.y)
    const shocked = this.shockTimer > 0
    const max = this.maxSpeed * surface * (shocked ? 0.45 : 1) * (this.boostTimer > 0 ? 1.55 : 1)
    const accel = this.accel * (shocked ? 0.5 : 1)

    if (input.up) this.speed += accel
    if (input.down) this.speed -= accel * 0.85
    if (!input.up && !input.down) this.speed *= this.friction

    this.speed = Math.max(-max * 0.4, Math.min(max, this.speed))

    const steer = (this.speed / Math.max(max, 0.01)) * this.turnRate * (this.boostTimer > 0 ? 0.85 : 1)
    if (input.left) this.angle -= steer * (this.speed >= 0 ? 1 : -1)
    if (input.right) this.angle += steer * (this.speed >= 0 ? 1 : -1)

    // Mild traction loss off-road
    if (surface < 0.9) this.angle += (Math.random() - 0.5) * 0.02

    this.x += Math.cos(this.angle) * this.speed
    this.y += Math.sin(this.angle) * this.speed
    this._syncProgress()
  }

  _syncProgress() {
    const { progress } = progressAlongTrack(this.x, this.y)
    // Crossing start/finish forward
    if (this.lastProgress > 0.85 && progress < 0.15) {
      this.lap += 1
    } else if (this.lastProgress < 0.15 && progress > 0.85) {
      // Prevent reverse cheese
      this.lap = Math.max(0, this.lap - 1)
    }
    this.lastProgress = this.progress
    this.progress = progress
  }

  aiInput(leadProgress) {
    const look = pointOnTrack((this.progress + 0.045) % 1)
    const lane = pointOnTrack((this.progress + 0.02) % 1)
    const nx = Math.cos(lane.angle + Math.PI / 2)
    const ny = Math.sin(lane.angle + Math.PI / 2)
    const tx = look.x + nx * this.aiTargetOffset
    const ty = look.y + ny * this.aiTargetOffset
    const desired = Math.atan2(ty - this.y, tx - this.x)
    let diff = desired - this.angle
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2

    const behind = leadProgress - this.raceDistance
    const push = behind > 0.15 ? 1 : this.aiAggression

    return {
      up: Math.random() < 0.92 * push,
      down: false,
      left: diff < -0.05,
      right: diff > 0.05,
      useItem: Boolean(this.item) && (behind > 0.05 || Math.random() < 0.01)
    }
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)
    ctx.scale(this.scale, this.scale)

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)"
    ctx.beginPath()
    ctx.ellipse(4, 8, 22, 12, 0, 0, Math.PI * 2)
    ctx.fill()

    // Body
    ctx.fillStyle = this.color
    roundRect(ctx, -18, -12, 36, 24, 6)
    ctx.fill()

    // Cabin
    ctx.fillStyle = "rgba(16, 21, 28, 0.75)"
    roundRect(ctx, -4, -8, 14, 16, 4)
    ctx.fill()

    // Nose stripe
    ctx.fillStyle = "#f2f5f0"
    ctx.fillRect(10, -3, 8, 6)

    // Wheels
    ctx.fillStyle = "#10151c"
    ctx.fillRect(-14, -15, 10, 5)
    ctx.fillRect(-14, 10, 10, 5)
    ctx.fillRect(6, -15, 10, 5)
    ctx.fillRect(6, 10, 10, 5)

    if (this.boostTimer > 0) {
      ctx.fillStyle = "rgba(255, 176, 32, 0.85)"
      ctx.beginPath()
      ctx.moveTo(-18, -6)
      ctx.lineTo(-34 - Math.random() * 10, 0)
      ctx.lineTo(-18, 6)
      ctx.fill()
    }

    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 4) % 2 === 0) {
      ctx.strokeStyle = "rgba(242,245,240,0.8)"
      ctx.lineWidth = 2
      ctx.strokeRect(-20, -14, 40, 28)
    }

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

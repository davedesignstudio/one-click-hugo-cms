import { ITEM_POOL, ITEM_TYPES } from "game/constants"

let nextProjectileId = 1

export function randomItemType() {
  return ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)]
}

export class ItemBox {
  constructor({ id, x, y }) {
    this.id = id
    this.x = x
    this.y = y
    this.cooldown = 0
    this.pulse = Math.random() * Math.PI * 2
  }

  get active() {
    return this.cooldown <= 0
  }

  update() {
    if (this.cooldown > 0) this.cooldown -= 1
    this.pulse += 0.08
  }

  collect() {
    this.cooldown = 240
    return randomItemType()
  }

  draw(ctx) {
    if (!this.active) return
    const bob = Math.sin(this.pulse) * 4
    ctx.save()
    ctx.translate(this.x, this.y + bob)
    ctx.rotate(this.pulse * 0.25)
    ctx.fillStyle = "rgba(0,0,0,0.25)"
    ctx.beginPath()
    ctx.ellipse(0, 14, 16, 7, 0, 0, Math.PI * 2)
    ctx.fill()
    const g = ctx.createLinearGradient(-14, -14, 14, 14)
    g.addColorStop(0, "#ffe36b")
    g.addColorStop(1, "#ff9f1a")
    ctx.fillStyle = g
    ctx.fillRect(-14, -14, 28, 28)
    ctx.strokeStyle = "#10151c"
    ctx.lineWidth = 3
    ctx.strokeRect(-14, -14, 28, 28)
    ctx.fillStyle = "#10151c"
    ctx.font = "bold 18px Teko, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("?", 0, 1)
    ctx.restore()
  }
}

export class Hazard {
  constructor({ type, x, y, ownerId = null }) {
    this.type = type
    this.x = x
    this.y = y
    this.ownerId = ownerId
    this.life = type === "oil" ? 900 : 1200
    this.radius = type === "oil" ? 28 : 16
  }

  update() {
    this.life -= 1
  }

  get dead() {
    return this.life <= 0
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    if (this.type === "banana") {
      ctx.fillStyle = "#e6b400"
      ctx.beginPath()
      ctx.ellipse(0, 0, 14, 8, -0.4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#8a6a00"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(-2, 0, 10, 0.2, Math.PI - 0.2)
      ctx.stroke()
    } else {
      ctx.fillStyle = "rgba(20, 24, 30, 0.85)"
      ctx.beginPath()
      ctx.ellipse(0, 0, this.radius, this.radius * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "rgba(90, 100, 112, 0.7)"
      ctx.stroke()
    }
    ctx.restore()
  }
}

export class Projectile {
  constructor({ type, x, y, angle, ownerId, targetId = null }) {
    this.id = nextProjectileId++
    this.type = type
    this.x = x
    this.y = y
    this.angle = angle
    this.ownerId = ownerId
    this.targetId = targetId
    this.speed = type === "red_shell" ? 7.2 : 6.4
    this.life = type === "red_shell" ? 260 : 180
    this.radius = 12
  }

  update(karts) {
    this.life -= 1
    if (this.type === "red_shell" && this.targetId != null) {
      const target = karts.find((k) => k.id === this.targetId && !k.finished)
      if (target) {
        const desired = Math.atan2(target.y - this.y, target.x - this.x)
        let diff = desired - this.angle
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        this.angle += Math.max(-0.12, Math.min(0.12, diff))
      }
    }
    this.x += Math.cos(this.angle) * this.speed
    this.y += Math.sin(this.angle) * this.speed
  }

  get dead() {
    return this.life <= 0
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)
    ctx.fillStyle = this.type === "red_shell" ? "#e23b3b" : "#2db84c"
    ctx.beginPath()
    ctx.arc(0, 0, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(255,255,255,0.35)"
    ctx.beginPath()
    ctx.arc(-3, -3, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function useItem(kart, state) {
  if (!kart.item || kart.finished || kart.spinTimer > 0) return
  const type = kart.item
  kart.item = null

  if (type === "banana" || type === "oil") {
    const behind = kart.angle + Math.PI
    state.hazards.push(
      new Hazard({
        type,
        x: kart.x + Math.cos(behind) * 36,
        y: kart.y + Math.sin(behind) * 36,
        ownerId: kart.id
      })
    )
    return
  }

  if (type === "green_shell" || type === "red_shell") {
    let targetId = null
    if (type === "red_shell") {
      const ahead = state.karts
        .filter((k) => k.id !== kart.id && !k.finished && k.raceDistance >= kart.raceDistance)
        .sort((a, b) => a.raceDistance - b.raceDistance)[0]
      const fallback = state.karts
        .filter((k) => k.id !== kart.id && !k.finished)
        .sort((a, b) => b.raceDistance - a.raceDistance)[0]
      targetId = (ahead || fallback)?.id ?? null
    }
    state.projectiles.push(
      new Projectile({
        type,
        x: kart.x + Math.cos(kart.angle) * 30,
        y: kart.y + Math.sin(kart.angle) * 30,
        angle: kart.angle,
        ownerId: kart.id,
        targetId
      })
    )
    return
  }

  if (type === "mushroom") {
    kart.boostTimer = 70
    kart.speed = Math.max(kart.speed, kart.maxSpeed * 1.2)
    return
  }

  if (type === "lightning") {
    state.flashTimer = 24
    for (const other of state.karts) {
      if (other.id !== kart.id) other.hit("shock")
    }
  }
}

export function itemLabel(type) {
  return ITEM_TYPES[type]?.label || "—"
}

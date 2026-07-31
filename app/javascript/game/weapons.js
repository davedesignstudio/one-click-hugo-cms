export const ITEMS = {
  banana: { label: "Banana", weightByPlace: [1, 2, 3, 4, 5] },
  green_shell: { label: "Green Shell", weightByPlace: [2, 3, 3, 3, 2] },
  red_shell: { label: "Red Shell", weightByPlace: [1, 2, 3, 4, 5] },
  mushroom: { label: "Mushroom", weightByPlace: [4, 3, 2, 2, 1] },
  lightning: { label: "Lightning", weightByPlace: [0, 1, 2, 3, 4] },
  star: { label: "Star", weightByPlace: [0, 1, 1, 2, 3] }
}

export function rollItem(placeIndex) {
  const place = Math.max(0, Math.min(placeIndex, 4))
  const bag = []
  Object.entries(ITEMS).forEach(([id, meta]) => {
    const weight = meta.weightByPlace[place] || 0
    for (let i = 0; i < weight; i++) bag.push(id)
  })
  if (bag.length === 0) return "mushroom"
  return bag[Math.floor(Math.random() * bag.length)]
}

export function itemLabel(id) {
  return ITEMS[id]?.label || "—"
}

export class Projectile {
  constructor({ type, x, y, angle, ownerId, targetId = null }) {
    this.type = type
    this.x = x
    this.y = y
    this.angle = angle
    this.ownerId = ownerId
    this.targetId = targetId
    this.speed = type === "red_shell" ? 320 : 290
    this.life = type === "red_shell" ? 5.5 : 4.2
    this.radius = 12
    this.alive = true
  }
}

export class Hazard {
  constructor({ type, x, y, ownerId }) {
    this.type = type
    this.x = x
    this.y = y
    this.ownerId = ownerId
    this.radius = 14
    this.alive = true
    this.life = 18
  }
}

export function updateProjectiles(projectiles, karts, dt) {
  const events = []

  for (const shell of projectiles) {
    if (!shell.alive) continue
    shell.life -= dt
    if (shell.life <= 0) {
      shell.alive = false
      continue
    }

    if (shell.type === "red_shell" && shell.targetId != null) {
      const target = karts.find((k) => k.id === shell.targetId && k.alive)
      if (target) {
        const desired = Math.atan2(target.y - shell.y, target.x - shell.x)
        let diff = desired - shell.angle
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        shell.angle += Math.max(-3.4 * dt, Math.min(3.4 * dt, diff))
      }
    }

    shell.x += Math.cos(shell.angle) * shell.speed * dt
    shell.y += Math.sin(shell.angle) * shell.speed * dt

    for (const kart of karts) {
      if (!kart.alive || kart.id === shell.ownerId) continue
      if (kart.invincible > 0) continue
      const d = Math.hypot(kart.x - shell.x, kart.y - shell.y)
      if (d < shell.radius + kart.radius) {
        shell.alive = false
        events.push({ type: "hit", kart, power: shell.type === "red_shell" ? 1.15 : 1 })
        break
      }
    }
  }

  return events
}

export function updateHazards(hazards, karts, dt) {
  const events = []
  for (const hazard of hazards) {
    if (!hazard.alive) continue
    hazard.life -= dt
    if (hazard.life <= 0) {
      hazard.alive = false
      continue
    }

    for (const kart of karts) {
      if (!kart.alive || kart.id === hazard.ownerId) continue
      if (kart.invincible > 0) continue
      const d = Math.hypot(kart.x - hazard.x, kart.y - hazard.y)
      if (d < hazard.radius + kart.radius) {
        hazard.alive = false
        events.push({ type: "spin", kart })
        break
      }
    }
  }
  return events
}

export function drawWeapons(ctx, projectiles, hazards, time) {
  for (const hazard of hazards) {
    if (!hazard.alive) continue
    ctx.save()
    ctx.translate(hazard.x, hazard.y)
    ctx.rotate(Math.sin(time * 3) * 0.2)
    ctx.fillStyle = "#f4d35e"
    ctx.beginPath()
    ctx.ellipse(0, 0, 16, 8, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = "#b08900"
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }

  for (const shell of projectiles) {
    if (!shell.alive) continue
    ctx.save()
    ctx.translate(shell.x, shell.y)
    const color = shell.type === "red_shell" ? "#e63946" : "#2a9d8f"
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 16)
    glow.addColorStop(0, "#fff")
    glow.addColorStop(0.35, color)
    glow.addColorStop(1, "transparent")
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(0, 0, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

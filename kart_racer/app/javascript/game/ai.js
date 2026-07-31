import { normalizeAngle, distance } from "game/constants"
import { getTrackAngle, isOnTrack } from "game/track"

export class AIController {
  constructor(kart, difficulty = 0.85) {
    this.kart = kart
    this.difficulty = difficulty
    this.reactionDelay = 0
    this.weaponUseCooldown = 0
  }

  getInput(karts) {
    const k = this.kart
    const targetAngle = this.getTargetAngle()
    let angleDiff = normalizeAngle(targetAngle - k.angle)

    const input = { up: true, down: false, left: false, right: false }

    // Steering
    if (angleDiff > 0.15) {
      input.right = true
    } else if (angleDiff < -0.15) {
      input.left = true
    }

    // Slow down for sharp turns
    if (Math.abs(angleDiff) > 0.8) {
      input.up = false
      input.down = true
    }

    // Off-road recovery
    if (!isOnTrack(k.x, k.y)) {
      input.up = false
      input.down = true
      if (angleDiff > 0) input.right = true
      else input.left = true
    }

    // Random slight variation for personality
    const variation = Math.sin(Date.now() / 500 + k.id) * 0.05
    if (variation > 0.03) input.right = true
    if (variation < -0.03) input.left = true

    // Weapon usage
    if (k.weapon && this.weaponUseCooldown <= 0) {
      const shouldUse = this.shouldUseWeapon(k, karts)
      if (shouldUse) {
        input.useWeapon = true
        this.weaponUseCooldown = 60
      }
    }

    if (this.weaponUseCooldown > 0) this.weaponUseCooldown--

    return input
  }

  getTargetAngle() {
    const k = this.kart
    const currentAngle = getTrackAngle(k.x, k.y)
    const lookAhead = 0.25 + (1 - this.difficulty) * 0.15
    const targetAngle = currentAngle + lookAhead

    // Add some racing line offset
    const offset = Math.sin(targetAngle * 3) * 0.05
    return targetAngle + Math.PI / 2 + offset
  }

  shouldUseWeapon(kart, karts) {
    const weapon = kart.weapon

    // Always use defensive/offensive items when opponents nearby
    const nearbyOpponent = karts.some(other => {
      if (other.id === kart.id) return false
      return distance(kart.x, kart.y, other.x, other.y) < 150
    })

    if (weapon === "mushroom" || weapon === "star") {
      return Math.random() < 0.02
    }

    if (weapon === "lightning") {
      const opponentsAhead = karts.filter(o => o.id !== kart.id && o.checkpointProgress > kart.checkpointProgress)
      return opponentsAhead.length >= 1 && Math.random() < 0.03
    }

    if (nearbyOpponent) {
      return Math.random() < 0.04
    }

    return Math.random() < 0.005
  }
}

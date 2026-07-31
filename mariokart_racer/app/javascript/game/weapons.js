import { distance, normalizeAngle } from "game/constants";

let nextProjectileId = 0;

export class Projectile {
  constructor({ x, y, angle, type, ownerId, homing = false }) {
    this.id = nextProjectileId++;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.type = type;
    this.ownerId = ownerId;
    this.homing = homing;
    this.speed = homing ? 5 : 6;
    this.active = true;
    this.lifetime = 300;
  }

  update(targets) {
    this.lifetime--;
    if (this.lifetime <= 0) {
      this.active = false;
      return;
    }

    if (this.homing && targets.length > 0) {
      const target = targets[0];
      const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
      let diff = normalizeAngle(targetAngle - this.angle + Math.PI) - Math.PI;
      this.angle += Math.sign(diff) * Math.min(Math.abs(diff), 0.08);
    }

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    if (this.x < 0 || this.x > 900 || this.y < 0 || this.y > 600) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.type === "green_shell") {
      ctx.fillStyle = "#3cb371";
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2e8b57";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.type === "red_shell") {
      ctx.fillStyle = "#e63946";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class BananaPeel {
  constructor({ x, y, ownerId }) {
    this.id = nextProjectileId++;
    this.x = x;
    this.y = y;
    this.ownerId = ownerId;
    this.active = true;
    this.lifetime = 600;
  }

  update() {
    this.lifetime--;
    if (this.lifetime <= 0) this.active = false;
  }

  draw(ctx) {
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🍌", this.x, this.y);
  }
}

export class WeaponSystem {
  constructor() {
    this.projectiles = [];
    this.bananas = [];
    this.effects = [];
  }

  clear() {
    this.projectiles = [];
    this.bananas = [];
    this.effects = [];
  }

  useWeapon(kart, karts) {
    if (!kart.item || kart.isStunned) return null;

    const weapon = kart.item;
    kart.clearItem();
    const result = { weapon, effects: [] };

    switch (weapon.id) {
      case "green_shell": {
        const offset = 20;
        this.projectiles.push(
          new Projectile({
            x: kart.x + Math.cos(kart.angle) * offset,
            y: kart.y + Math.sin(kart.angle) * offset,
            angle: kart.angle,
            type: "green_shell",
            ownerId: kart.id,
          })
        );
        break;
      }
      case "red_shell": {
        const opponents = karts.filter((k) => k.id !== kart.id && !k.finished);
        opponents.sort(
          (a, b) => distance(kart.x, kart.y, a.x, a.y) - distance(kart.x, kart.y, b.x, b.y)
        );
        const offset = 20;
        this.projectiles.push(
          new Projectile({
            x: kart.x + Math.cos(kart.angle) * offset,
            y: kart.y + Math.sin(kart.angle) * offset,
            angle: kart.angle,
            type: "red_shell",
            ownerId: kart.id,
            homing: true,
          })
        );
        result.homingTarget = opponents[0];
        break;
      }
      case "banana": {
        const behind = 25;
        this.bananas.push(
          new BananaPeel({
            x: kart.x - Math.cos(kart.angle) * behind,
            y: kart.y - Math.sin(kart.angle) * behind,
            ownerId: kart.id,
          })
        );
        break;
      }
      case "mushroom":
        kart.boostTimer = 120;
        result.effects.push({ type: "boost", kart });
        break;
      case "star":
        kart.starTimer = 240;
        result.effects.push({ type: "star", kart });
        break;
      case "lightning":
        karts.forEach((k) => {
          if (k.id !== kart.id && !k.isInvincible) {
            k.shrinkTimer = 180;
            k.stunTimer = 60;
            k.speed *= 0.5;
          }
        });
        result.effects.push({ type: "lightning" });
        break;
    }

    return result;
  }

  update(karts) {
    this.projectiles.forEach((p) => {
      if (!p.active) return;
      const targets = karts.filter((k) => {
        if (k.id === p.ownerId || k.finished || k.isInvincible) return false;
        return distance(p.x, p.y, k.x, k.y) < 200;
      });
      targets.sort(
        (a, b) => distance(p.x, p.y, a.x, a.y) - distance(p.x, p.y, b.x, b.y)
      );
      p.update(p.homing ? targets : []);
    });

    this.bananas.forEach((b) => b.update());

    this.checkCollisions(karts);

    this.projectiles = this.projectiles.filter((p) => p.active);
    this.bananas = this.bananas.filter((b) => b.active);
  }

  checkCollisions(karts) {
    this.projectiles.forEach((p) => {
      if (!p.active) return;
      karts.forEach((k) => {
        if (k.id === p.ownerId || k.finished) return;
        if (distance(p.x, p.y, k.x, k.y) < 20) {
          if (k.takeHit()) {
            p.active = false;
          }
        }
      });
    });

    this.bananas.forEach((b) => {
      if (!b.active) return;
      karts.forEach((k) => {
        if (k.finished) return;
        if (distance(b.x, b.y, k.x, k.y) < 18) {
          if (k.takeHit()) {
            b.active = false;
          }
        }
      });
    });

    // Kart-to-kart bumping
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i];
        const b = karts[j];
        if (a.finished || b.finished) continue;
        const d = distance(a.x, a.y, b.x, b.y);
        if (d < 28 && d > 0) {
          const overlap = 28 - d;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          if (!a.isInvincible) {
            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;
            a.speed *= 0.85;
          }
          if (!b.isInvincible) {
            b.x += nx * overlap * 0.5;
            b.y += ny * overlap * 0.5;
            b.speed *= 0.85;
          }
        }
      }
    }
  }

  draw(ctx) {
    this.bananas.forEach((b) => b.draw(ctx));
    this.projectiles.forEach((p) => p.draw(ctx));
  }

  drawLightningFlash(ctx) {
    if (this.effects.some((e) => e.type === "lightning")) {
      ctx.fillStyle = "rgba(255, 255, 200, 0.3)";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }
}

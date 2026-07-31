import { TOTAL_LAPS, KART_COLORS, randomWeapon } from "game/constants";
import {
  drawTrack,
  drawItemBox,
  checkItemBoxCollision,
  getItemBoxPositions,
  getStartPositions,
} from "game/track";
import { createKarts, calculateRankings } from "game/kart";
import { WeaponSystem } from "game/weapons";

class RacingGame {
  constructor() {
    this.canvas = document.getElementById("race-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.overlay = document.getElementById("race-overlay");
    this.countdownEl = document.getElementById("countdown");
    this.startBtn = document.getElementById("start-btn");
    this.restartBtn = document.getElementById("restart-btn");
    this.playerNameInput = document.getElementById("player-name");

    this.state = "menu"; // menu, countdown, racing, finished
    this.karts = [];
    this.itemBoxes = [];
    this.weaponSystem = new WeaponSystem();
    this.input = { up: false, down: false, left: false, right: false, useItem: false };
    this.raceStartTime = 0;
    this.elapsedTime = 0;
    this.playerName = "Player";
    this.countdownValue = 0;
    this.animationId = null;

    this.bindEvents();
    this.showOverlay("Kart Blitz", "Enter your name and hit Start Race!");
  }

  bindEvents() {
    this.startBtn.addEventListener("click", () => this.startRace());
    this.restartBtn.addEventListener("click", () => this.resetToMenu());

    window.addEventListener("keydown", (e) => this.handleKey(e, true));
    window.addEventListener("keyup", (e) => this.handleKey(e, false));

    this.canvas.addEventListener("click", () => this.canvas.focus());
  }

  handleKey(e, pressed) {
    if (e.code === "Space" && pressed && this.state === "racing") {
      e.preventDefault();
      this.usePlayerItem();
      return;
    }

    if (e.code === "KeyR" && pressed) {
      this.resetToMenu();
      return;
    }

    const map = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      KeyW: "up",
      KeyS: "down",
      KeyA: "left",
      KeyD: "right",
    };

    if (map[e.code]) {
      e.preventDefault();
      this.input[map[e.code]] = pressed;
    }
  }

  showOverlay(title, message, showRestart = false) {
    document.getElementById("overlay-title").textContent = title;
    document.getElementById("overlay-message").textContent = message;
    this.overlay.classList.remove("hidden");
    this.startBtn.classList.toggle("hidden", showRestart);
    this.restartBtn.classList.toggle("hidden", !showRestart);
    this.playerNameInput.classList.toggle("hidden", showRestart);
  }

  hideOverlay() {
    this.overlay.classList.add("hidden");
  }

  startRace() {
    this.playerName = this.playerNameInput.value.trim() || "Player";
    this.hideOverlay();
    this.initRace();
    this.beginCountdown();
  }

  initRace() {
    const starts = getStartPositions();
    this.karts = createKarts(starts, KART_COLORS, this.playerName);
    this.itemBoxes = getItemBoxPositions();
    this.weaponSystem.clear();
    this.elapsedTime = 0;
    this.raceStartTime = 0;
  }

  beginCountdown() {
    this.state = "countdown";
    this.countdownValue = 3;
    this.countdownEl.classList.remove("hidden");
    this.countdownEl.textContent = "3";

    const tick = () => {
      this.countdownValue--;
      if (this.countdownValue > 0) {
        this.countdownEl.textContent = String(this.countdownValue);
        setTimeout(tick, 800);
      } else if (this.countdownValue === 0) {
        this.countdownEl.textContent = "GO!";
        setTimeout(() => {
          this.countdownEl.classList.add("hidden");
          this.state = "racing";
          this.raceStartTime = Date.now();
          this.canvas.focus();
        }, 600);
      }
    };

    setTimeout(tick, 800);
  }

  resetToMenu() {
    this.state = "menu";
    this.countdownEl.classList.add("hidden");
    this.showOverlay("Kart Blitz", "Enter your name and hit Start Race!");
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  usePlayerItem() {
    const player = this.karts.find((k) => k.isPlayer);
    if (!player) return;
    this.weaponSystem.useWeapon(player, this.karts);
    this.updateHUD();
  }

  updateItemBoxes() {
    this.itemBoxes.forEach((box) => {
      if (!box.active) {
        box.respawnTimer--;
        if (box.respawnTimer <= 0) box.active = true;
        return;
      }

      this.karts.forEach((kart) => {
        if (kart.finished) return;
        if (checkItemBoxCollision(kart, box)) {
          box.active = false;
          box.respawnTimer = 300;
          kart.giveItem(randomWeapon());
        }
      });
    });
  }

  updateAI() {
    this.karts.forEach((kart) => {
      if (kart.isPlayer || kart.finished) return;
      const action = kart.update(this.input, 1, this.karts);
      if (action === "use_item" && kart.item) {
        this.weaponSystem.useWeapon(kart, this.karts);
        kart.aiItemCooldown = 120;
      }
    });
  }

  checkRaceEnd() {
    const player = this.karts.find((k) => k.isPlayer);
    const now = Date.now();

    this.karts.forEach((kart) => {
      if (!kart.finished && kart.lap > TOTAL_LAPS) {
        kart.finished = true;
        kart.finishTime = now - this.raceStartTime;
      }
    });

    if (player && player.finished && this.state === "racing") {
      this.state = "finished";
      this.submitScore(player);
      const position = player.rank;
      const ordinals = ["1st", "2nd", "3rd", "4th"];
      this.showOverlay(
        "Race Complete!",
        `You finished ${ordinals[position - 1] || position + "th"} in ${this.formatTime(player.finishTime)}!`,
        true
      );
    }
  }

  async submitScore(player) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    try {
      const response = await fetch("/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          player_name: this.playerName,
          position: player.rank,
          time_ms: player.finishTime,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.refreshLeaderboard(data.rank);
      }
    } catch {
      // Leaderboard update is best-effort
    }
  }

  async refreshLeaderboard(playerRank) {
    try {
      const response = await fetch("/scores");
      const scores = await response.json();
      const list = document.getElementById("leaderboard");
      list.innerHTML = scores
        .map(
          (s, i) => `
          <li>
            <span class="lb-rank">${i + 1}</span>
            <span class="lb-name">${this.escapeHtml(s.player_name)}</span>
            <span class="lb-time">${this.formatTime(s.time_ms)}</span>
          </li>`
        )
        .join("");

      const empty = document.querySelector(".empty-leaderboard");
      if (empty) empty.remove();
    } catch {
      // ignore
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(ms) {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
  }

  updateHUD() {
    const player = this.karts.find((k) => k.isPlayer);
    if (!player) return;

    document.getElementById("hud-lap").textContent = `${Math.min(player.lap, TOTAL_LAPS)} / ${TOTAL_LAPS}`;
    document.getElementById("hud-speed").textContent = `${Math.round(Math.abs(player.speed) * 20)} km/h`;
    document.getElementById("hud-position").textContent = `${player.rank}${this.ordinalSuffix(player.rank)}`;

    const itemEl = document.getElementById("hud-item");
    if (player.item) {
      itemEl.innerHTML = `<span title="${player.item.name}">${player.item.icon}</span>`;
      itemEl.classList.add("has-item");
    } else {
      itemEl.innerHTML = '<span class="item-empty">No item</span>';
      itemEl.classList.remove("has-item");
    }

    const rankings = calculateRankings(this.karts);
    const standingsEl = document.getElementById("standings");
    standingsEl.innerHTML = rankings
      .map(
        (k) => `
        <li class="${k.isPlayer ? "player" : ""}">
          <span class="pos pos-${k.rank}">${k.rank}</span>
          <span class="name">${this.escapeHtml(k.name)}</span>
          <span class="lap">L${Math.min(k.lap, TOTAL_LAPS)}</span>
        </li>`
      )
      .join("");
  }

  ordinalSuffix(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  draw() {
    drawTrack(this.ctx);

    this.itemBoxes.forEach((box) => drawItemBox(this.ctx, box));

    this.weaponSystem.draw(this.ctx);
    this.karts.forEach((kart) => kart.draw(this.ctx));

    // Lightning flash overlay
    if (this.weaponSystem.effects?.some((e) => e.type === "lightning")) {
      this.ctx.fillStyle = "rgba(255, 255, 200, 0.4)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.state === "racing" && this.raceStartTime) {
      this.elapsedTime = Date.now() - this.raceStartTime;
      this.ctx.fillStyle = "rgba(0,0,0,0.5)";
      this.ctx.fillRect(10, 10, 120, 30);
      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 16px sans-serif";
      this.ctx.textAlign = "left";
      this.ctx.fillText(this.formatTime(this.elapsedTime), 20, 30);
    }
  }

  update() {
    if (this.state !== "racing") return;

    const player = this.karts.find((k) => k.isPlayer);
    if (player && !player.finished) {
      player.update(this.input, 1, this.karts);
    }

    this.updateAI();
    this.updateItemBoxes();
    this.weaponSystem.update(this.karts);
    calculateRankings(this.karts);
    this.checkRaceEnd();
    this.updateHUD();
  }

  gameLoop() {
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  start() {
    this.gameLoop();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const game = new RacingGame();
  game.start();
});

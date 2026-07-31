import { Controller } from "@hotwired/stimulus"
import { RaceEngine, formatTime } from "game/engine"

export default class extends Controller {
  static targets = [
    "canvas",
    "hud",
    "position",
    "lap",
    "timer",
    "item",
    "overlay",
    "overlayCard",
    "overlayKicker",
    "overlayTitle",
    "overlayBody",
    "startButton",
    "finishActions"
  ]

  static values = {
    playerName: String,
    character: String,
    characterColor: String,
    characterAccent: String,
    characterName: String,
    resultsUrl: String
  }

  connect() {
    this.engine = new RaceEngine({
      canvas: this.canvasTarget,
      playerName: this.playerNameValue,
      character: this.characterValue,
      characterColor: this.characterColorValue,
      characterAccent: this.characterAccentValue,
      onHud: (hud) => this.updateHud(hud),
      onFinish: (payload) => this.handleFinish(payload)
    })

    this.finishActionsTarget.hidden = true
    this.startButtonTarget.hidden = false
    this.overlayKickerTarget.textContent = `${this.characterNameValue} · Neon Loop`
    this.overlayTitleTarget.textContent = "Ready to Roll"
    this.overlayBodyTarget.textContent =
      "Arrows / WASD to drive. Space fires your item. First to 3 laps wins."
    this.engine.preview()
  }

  disconnect() {
    this.engine?.stop()
  }

  start() {
    this.overlayTarget.hidden = true
    this.startButtonTarget.hidden = true
    this.finishActionsTarget.hidden = true
    this.engine.start()
  }

  updateHud(hud) {
    this.positionTarget.textContent = hud.position
    this.lapTarget.textContent = hud.lap
    this.timerTarget.textContent = hud.timer
    this.itemTarget.textContent = hud.item
  }

  async handleFinish(payload) {
    this.engine.stop()
    this.overlayTarget.hidden = false
    this.startButtonTarget.hidden = true
    this.finishActionsTarget.hidden = false

    const place = payload.finish_position
    const medal = place === 1 ? "Winner!" : place === 2 ? "Podium finish" : place === 3 ? "On the box" : "Race complete"
    this.overlayKickerTarget.textContent = medal
    this.overlayTitleTarget.textContent = `P${place}`
    this.overlayBodyTarget.textContent = `Total ${formatTime(payload.total_time_ms)} · Best lap ${formatTime(payload.best_lap_ms)} · Items used ${payload.items_used}`

    try {
      const token = document.querySelector("meta[name='csrf-token']")?.content
      const response = await fetch(this.resultsUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-Token": token
        },
        body: JSON.stringify({ race_result: payload })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.rank) {
          this.overlayBodyTarget.textContent += ` · Leaderboard #${data.rank}`
        }
      }
    } catch (_) {
      // Offline / network issues shouldn't block the finish screen.
    }
  }

  pressLeft(e) { e.preventDefault(); this.engine.setTouch("left", true) }
  releaseLeft(e) { e.preventDefault(); this.engine.setTouch("left", false) }
  pressRight(e) { e.preventDefault(); this.engine.setTouch("right", true) }
  releaseRight(e) { e.preventDefault(); this.engine.setTouch("right", false) }
  pressUp(e) { e.preventDefault(); this.engine.setTouch("up", true) }
  releaseUp(e) { e.preventDefault(); this.engine.setTouch("up", false) }
  pressItem(e) { e.preventDefault(); this.engine.setTouch("item", true) }
  releaseItem(e) { e.preventDefault(); this.engine.setTouch("item", false) }
}

import { Controller } from "@hotwired/stimulus"
import { BlastkartEngine } from "game/engine"

export default class extends Controller {
  static targets = [
    "canvas",
    "place",
    "lap",
    "timer",
    "item",
    "overlay",
    "overlayTitle",
    "overlayText",
    "startBtn",
    "homeLink"
  ]

  static values = {
    player: String,
    track: String,
    resultsUrl: String
  }

  connect() {
    this.engine = null
    this.fitCanvas()
    this._onResize = () => this.fitCanvas()
    window.addEventListener("resize", this._onResize)
  }

  disconnect() {
    window.removeEventListener("resize", this._onResize)
    this.engine?.stop()
  }

  fitCanvas() {
    if (!this.hasCanvasTarget) return
    const canvas = this.canvasTarget
    // Keep internal resolution fixed for gameplay consistency
    canvas.width = 1280
    canvas.height = 720
  }

  start() {
    this.overlayTarget.hidden = true
    this.engine?.stop()
    this.engine = new BlastkartEngine({
      canvas: this.canvasTarget,
      playerName: this.playerValue || "RACER",
      trackId: this.trackValue || "coastal_loop",
      onHud: (hud) => this.renderHud(hud),
      onFinish: (result) => this.handleFinish(result)
    })
    this.engine.start()
  }

  renderHud(hud) {
    if (this.hasPlaceTarget) this.placeTarget.textContent = hud.place
    if (this.hasLapTarget) this.lapTarget.textContent = hud.lap
    if (this.hasTimerTarget) this.timerTarget.textContent = hud.timer
    if (this.hasItemTarget) this.itemTarget.textContent = hud.item
  }

  async handleFinish(result) {
    this.overlayTarget.hidden = false
    this.overlayTitleTarget.textContent = `Finished P${result.place}`
    this.overlayTextTarget.textContent = "Saving your lap..."
    this.startBtnTarget.textContent = "Race Again"
    this.homeLinkTarget.hidden = false

    try {
      const response = await fetch(this.resultsUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector("meta[name='csrf-token']")?.content,
          Accept: "application/json"
        },
        body: JSON.stringify({
          race_result: {
            player_name: result.playerName,
            time_ms: result.timeMs,
            laps: result.laps,
            weapons_used: result.weaponsUsed,
            place: result.place,
            track: result.track
          }
        })
      })
      const data = await response.json()
      if (data.ok) {
        this.overlayTextTarget.textContent = `Time ${data.formatted_time} · Board rank #${data.rank}`
      } else {
        this.overlayTextTarget.textContent = (data.errors || ["Could not save time"]).join(", ")
      }
    } catch (_err) {
      this.overlayTextTarget.textContent = "Race done — leaderboard save failed."
    }

    this.engine?.stop()
  }

  pressLeft(e) {
    e.preventDefault()
    this.engine?.setTouch("left", true)
  }
  releaseLeft(e) {
    e.preventDefault()
    this.engine?.setTouch("left", false)
  }
  pressRight(e) {
    e.preventDefault()
    this.engine?.setTouch("right", true)
  }
  releaseRight(e) {
    e.preventDefault()
    this.engine?.setTouch("right", false)
  }
  pressAccel(e) {
    e.preventDefault()
    this.engine?.setTouch("accel", true)
  }
  releaseAccel(e) {
    e.preventDefault()
    this.engine?.setTouch("accel", false)
  }
  fire(e) {
    e.preventDefault()
    this.engine?.fireFromTouch()
  }
}

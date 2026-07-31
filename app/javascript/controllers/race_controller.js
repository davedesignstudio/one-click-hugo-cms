import { Controller } from "@hotwired/stimulus"
import { RaceEngine, formatRaceTime } from "game/engine"

export default class extends Controller {
  static targets = [
    "canvas",
    "lap",
    "place",
    "timer",
    "itemName",
    "itemSlot",
    "standings",
    "countdown",
    "overlay",
    "overlayTitle",
    "overlayMessage",
    "nameInput",
    "finishOverlay",
    "finishTitle",
    "finishMessage",
    "saveNameInput",
    "saveButton",
    "saveStatus",
    "touchControls"
  ]

  static values = {
    laps: { type: Number, default: 3 },
    resultsUrl: String
  }

  connect() {
    this.engine = null
    this.finishPayload = null
    this.boundKeyDown = (e) => this.onKey(e, true)
    this.boundKeyUp = (e) => this.onKey(e, false)
    window.addEventListener("keydown", this.boundKeyDown)
    window.addEventListener("keyup", this.boundKeyUp)
    this.drawIdle()
  }

  disconnect() {
    window.removeEventListener("keydown", this.boundKeyDown)
    window.removeEventListener("keyup", this.boundKeyUp)
    this.engine?.stop()
  }

  drawIdle() {
    const canvas = this.canvasTarget
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#173028"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "rgba(247, 241, 232, 0.7)"
    ctx.font = "600 28px Outfit, sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("Waiting for lights out…", canvas.width / 2, canvas.height / 2)
  }

  startRace(event) {
    event.preventDefault()
    const name = (this.nameInputTarget.value || "You").trim().slice(0, 16) || "You"
    this.overlayTarget.hidden = true
    this.finishOverlayTarget.hidden = true
    this.saveStatusTarget.hidden = true
    this.finishPayload = null
    this.runCountdown().then(() => {
      this.engine?.stop()
      this.engine = new RaceEngine({
        canvas: this.canvasTarget,
        totalLaps: this.lapsValue,
        playerName: name,
        onHud: (hud) => this.renderHud(hud),
        onFinish: (payload) => this.handleFinish(payload, name)
      })
      this.engine.start()
    })
  }

  async runCountdown() {
    const steps = ["3", "2", "1", "GO"]
    this.countdownTarget.hidden = false
    for (const step of steps) {
      this.countdownTarget.textContent = step
      this.countdownTarget.style.animation = "none"
      void this.countdownTarget.offsetWidth
      this.countdownTarget.style.animation = ""
      await wait(700)
    }
    this.countdownTarget.hidden = true
  }

  renderHud(hud) {
    this.lapTarget.textContent = `${hud.lap} / ${this.lapsValue}`
    this.placeTarget.textContent = hud.placeLabel
    this.timerTarget.textContent = formatRaceTime(hud.timeMs)
    this.itemNameTarget.textContent = hud.itemLabel
    this.itemSlotTarget.classList.toggle("armed", hud.itemLabel !== "—")

    this.standingsTarget.innerHTML = hud.standings
      .map(
        (row) => `
        <li>
          <span>${row.place}</span>
          <span><i class="swatch" style="background:${row.color}"></i> ${escapeHtml(row.name)}</span>
          <span>${row.finished ? "FIN" : `L${row.lap}`}</span>
        </li>`
      )
      .join("")
  }

  handleFinish(payload, name) {
    this.finishPayload = payload
    this.finishOverlayTarget.hidden = false
    this.saveNameInputTarget.value = name
    this.saveButtonTarget.disabled = false
    this.finishTitleTarget.textContent =
      payload.place === 1 ? "You won!" : `Finished ${ordinal(payload.place)}`
    this.finishMessageTarget.textContent = `Time ${formatRaceTime(payload.timeMs)}. ${payload.standings
      .map((s) => `${s.place}. ${s.name}`)
      .join(" · ")}`
  }

  async saveResult(event) {
    event.preventDefault()
    if (!this.finishPayload) return

    const token = document.querySelector("meta[name='csrf-token']")?.content
    const playerName = (this.saveNameInputTarget.value || "You").trim().slice(0, 16) || "You"

    this.saveButtonTarget.disabled = true
    this.saveStatusTarget.hidden = false
    this.saveStatusTarget.textContent = "Saving…"

    try {
      const response = await fetch(this.resultsUrlValue, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-Token": token
        },
        body: JSON.stringify({
          race_result: {
            player_name: playerName,
            finish_time_ms: this.finishPayload.timeMs,
            place: this.finishPayload.place,
            laps: this.finishPayload.laps
          }
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.errors?.join(", ") || "Could not save result")
      }

      this.saveStatusTarget.textContent = "Posted to the leaderboard."
    } catch (error) {
      this.saveButtonTarget.disabled = false
      this.saveStatusTarget.textContent = error.message
    }
  }

  restart() {
    this.engine?.stop()
    this.finishOverlayTarget.hidden = true
    this.overlayTarget.hidden = false
    this.drawIdle()
  }

  onKey(event, down) {
    if (!this.engine) return
    const codes = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space"]
    if (!codes.includes(event.code)) return
    event.preventDefault()
    this.engine.setKey(event.code, down)
  }

  pressLeft(e) { e.preventDefault(); this.engine?.setKey("ArrowLeft", true) }
  releaseLeft(e) { e.preventDefault(); this.engine?.setKey("ArrowLeft", false) }
  pressRight(e) { e.preventDefault(); this.engine?.setKey("ArrowRight", true) }
  releaseRight(e) { e.preventDefault(); this.engine?.setKey("ArrowRight", false) }
  pressUp(e) { e.preventDefault(); this.engine?.setKey("ArrowUp", true) }
  releaseUp(e) { e.preventDefault(); this.engine?.setKey("ArrowUp", false) }
  pressDown(e) { e.preventDefault(); this.engine?.setKey("ArrowDown", true) }
  releaseDown(e) { e.preventDefault(); this.engine?.setKey("ArrowDown", false) }
  pressFire(e) { e.preventDefault(); this.engine?.setKey("Space", true) }
  releaseFire(e) { e.preventDefault(); this.engine?.setKey("Space", false) }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ordinal(n) {
  if (n === 1) return "1st"
  if (n === 2) return "2nd"
  if (n === 3) return "3rd"
  return `${n}th`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

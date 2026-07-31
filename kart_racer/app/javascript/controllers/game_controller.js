import { Controller } from "@hotwired/stimulus"
import { KartRacerEngine } from "game/engine"

export default class extends Controller {
  static targets = [
    "canvas", "lap", "position", "weapon", "speed", "timer",
    "overlay", "playerName", "nameInput", "startButton", "saveForm",
    "saveName", "saveButton", "resultText"
  ]

  connect() {
    this.engine = null
    this.resizeCanvas()
    window.addEventListener("resize", this.resizeCanvas.bind(this))
  }

  disconnect() {
    if (this.engine) this.engine.destroy()
    window.removeEventListener("resize", this.resizeCanvas.bind(this))
  }

  resizeCanvas() {
    if (!this.hasCanvasTarget) return
    const container = this.canvasTarget.parentElement
    const maxWidth = container.clientWidth
    const scale = Math.min(1, maxWidth / 1024)
    this.canvasTarget.style.width = `${1024 * scale}px`
    this.canvasTarget.style.height = `${768 * scale}px`
  }

  startRace() {
    const name = this.hasNameInputTarget ? this.nameInputTarget.value.trim() : "Player"
    if (!name) {
      this.nameInputTarget.focus()
      return
    }

    if (this.engine) this.engine.destroy()

    this.overlayTarget.classList.add("hidden")
    this.saveFormTarget.classList.add("hidden")

    this.engine = new KartRacerEngine(this.canvasTarget, {
      playerName: name,
      onUpdate: (data) => this.updateHUD(data),
      onRaceEnd: (result) => this.handleRaceEnd(result)
    })
    this.engine.start()
  }

  updateHUD(data) {
    if (this.hasLapTarget) {
      this.lapTarget.textContent = `Lap ${data.lap}/${data.totalLaps}`
    }
    if (this.hasPositionTarget) {
      const ordinals = ["1st", "2nd", "3rd", "4th"]
      this.positionTarget.textContent = `${ordinals[data.position - 1] || data.position + "th"} / ${data.totalRacers}`
    }
    if (this.hasWeaponTarget) {
      this.weaponTarget.textContent = data.weapon || "—"
    }
    if (this.hasSpeedTarget) {
      this.speedTarget.textContent = `${data.speed} mph`
    }
    if (this.hasTimerTarget) {
      this.timerTarget.textContent = `${data.raceTime}s`
    }
  }

  handleRaceEnd(result) {
    const ordinals = ["1st", "2nd", "3rd", "4th"]
    this.resultTextTarget.textContent =
      `${result.playerName} finished ${ordinals[result.position - 1]} in ${result.totalTime.toFixed(2)}s!`
    this.saveNameTarget.value = result.playerName
    this.saveFormTarget.dataset.position = result.position
    this.saveFormTarget.dataset.totalTime = result.totalTime
    this.saveFormTarget.dataset.laps = result.laps
    this.saveFormTarget.classList.remove("hidden")
  }

  async saveScore() {
    const form = this.saveFormTarget
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    try {
      const response = await fetch("/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
          score: {
            player_name: this.saveNameTarget.value,
            position: parseInt(form.dataset.position),
            total_time: parseFloat(form.dataset.totalTime),
            laps: parseInt(form.dataset.laps)
          }
        })
      })

      if (response.ok) {
        this.saveButtonTarget.textContent = "Saved!"
        this.saveButtonTarget.disabled = true
      }
    } catch (e) {
      console.error("Failed to save score", e)
    }
  }

  restart() {
    if (this.engine) this.engine.destroy()
    this.saveFormTarget.classList.add("hidden")
    this.saveButtonTarget.textContent = "Save Score"
    this.saveButtonTarget.disabled = false
    this.overlayTarget.classList.remove("hidden")
  }
}

import { RaceGame, formatRaceTime } from "game/race"

function boot() {
  const shell = document.querySelector(".game-shell")
  const canvas = document.getElementById("race-canvas")
  if (!shell || !canvas) return

  const resultsUrl = shell.dataset.raceResultsUrlValue
  const csrf = shell.dataset.raceCsrfValue

  const hudLap = document.getElementById("hud-lap")
  const hudPlace = document.getElementById("hud-place")
  const hudTime = document.getElementById("hud-time")
  const hudItem = document.getElementById("hud-item")
  const standings = document.getElementById("standings")
  const overlayStart = document.getElementById("overlay-start")
  const overlayFinish = document.getElementById("overlay-finish")
  const finishTitle = document.getElementById("finish-title")
  const finishDetail = document.getElementById("finish-detail")
  const scoreForm = document.getElementById("score-form")
  const scoreStatus = document.getElementById("score-status")
  const nameInput = document.getElementById("player-name")

  let pendingResult = null

  const game = new RaceGame(canvas, {
    onHud({ lap, totalLaps, placeLabel, time, item, standings: rows }) {
      if (hudLap) hudLap.textContent = `${lap}/${totalLaps}`
      if (hudPlace) hudPlace.textContent = placeLabel
      if (hudTime) hudTime.textContent = formatRaceTime(time)
      if (hudItem) hudItem.textContent = item
      if (standings) {
        standings.innerHTML = rows
          .map(
            (row) =>
              `<li class="${row.you ? "you" : ""}"><span>${row.place}. ${row.name}</span><span>${
                row.finished ? "FIN" : `L${row.lap}`
              }</span></li>`
          )
          .join("")
      }
    },
    onFinish(result) {
      pendingResult = result
      if (overlayFinish) overlayFinish.classList.remove("overlay--hidden")
      if (finishTitle) {
        finishTitle.textContent =
          result.position === 1 ? "You win!" : `Finished ${result.position}${suffix(result.position)}`
      }
      if (finishDetail) {
        finishDetail.textContent = `Time ${formatRaceTime(result.finish_time)} · ${result.weapon_hits} hits taken`
      }
      if (scoreStatus) {
        scoreStatus.hidden = true
        scoreStatus.textContent = ""
      }
      if (scoreForm) scoreForm.hidden = false
    }
  })

  document.getElementById("btn-start")?.addEventListener("click", () => {
    overlayStart?.classList.add("overlay--hidden")
    overlayFinish?.classList.add("overlay--hidden")
    game.start()
  })

  document.getElementById("btn-retry")?.addEventListener("click", () => {
    overlayFinish?.classList.add("overlay--hidden")
    overlayStart?.classList.add("overlay--hidden")
    pendingResult = null
    game.start()
  })

  scoreForm?.addEventListener("submit", async (event) => {
    event.preventDefault()
    if (!pendingResult || !resultsUrl) return

    const playerName = (nameInput?.value || "Racer").trim() || "Racer"
    scoreStatus.hidden = false
    scoreStatus.textContent = "Saving…"

    try {
      const response = await fetch(resultsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-Token": csrf
        },
        body: JSON.stringify({
          race_result: {
            player_name: playerName,
            ...pendingResult
          }
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.errors?.join(", ") || "Could not save")
      scoreStatus.textContent = `Saved! Rank #${data.rank}`
      scoreForm.hidden = true
      pendingResult = null
    } catch (error) {
      scoreStatus.textContent = error.message || "Save failed"
    }
  })

  document.querySelectorAll("[data-touch]").forEach((btn) => {
    const action = btn.getAttribute("data-touch")
    const press = (pressed) => (event) => {
      event.preventDefault()
      game.setTouch(action, pressed)
    }
    btn.addEventListener("pointerdown", press(true))
    btn.addEventListener("pointerup", press(false))
    btn.addEventListener("pointerleave", press(false))
    btn.addEventListener("pointercancel", press(false))
  })

  // Keep canvas sharp on resize
  const fit = () => {
    const stage = canvas.parentElement
    if (!stage) return
    const ratio = 1280 / 720
    let w = stage.clientWidth
    let h = stage.clientHeight
    if (w / h > ratio) w = h * ratio
    else h = w / ratio
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
  }
  fit()
  window.addEventListener("resize", fit)
}

function suffix(n) {
  const v = n % 100
  if (v >= 11 && v <= 13) return "th"
  return ["th", "st", "nd", "rd"][n % 10] || "th"
}

document.addEventListener("DOMContentLoaded", boot)

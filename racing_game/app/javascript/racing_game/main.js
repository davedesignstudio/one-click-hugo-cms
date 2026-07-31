import { RacingGame } from "racing_game/game"
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "racing_game/track"

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("racing-canvas")
  if (!canvas) return

  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const game = new RacingGame(canvas)
  game.start()

  window.addEventListener("beforeunload", () => game.destroy())
})

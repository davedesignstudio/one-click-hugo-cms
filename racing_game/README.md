# Kart Racer — Mario Kart-Style Web Racing Game

A browser-based kart racing game built with **Ruby on Rails 8** and **HTML5 Canvas**. Race around an oval circuit, collect item boxes, and use weapons to take down your opponents!

## Features

- **3-lap circuit race** against 3 AI opponents
- **6 Mario Kart-style weapons:**
  - **Banana** — Drop behind you to spin out trailing racers
  - **Green Shell** — Fire a shell straight ahead
  - **Red Shell** — Homing shell that tracks the nearest opponent
  - **Mushroom** — Speed boost
  - **Star** — Invincibility + speed boost; knock others aside
  - **Lightning** — Shrink all opponents temporarily
- **Item boxes** (?) scattered around the track
- **Live HUD** with position, lap counter, timer, speedometer, and mini leaderboard
- **Countdown start** and **results screen**

## Getting Started

### Prerequisites

- Ruby 3.2+
- Bundler

### Setup

```bash
cd racing_game
bundle install
bin/rails db:prepare
```

### Run the Game

```bash
bin/rails server
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Controls

| Key | Action |
|-----|--------|
| Arrow Keys / WASD | Drive |
| Space | Use collected weapon |
| Enter | Start race / Race again |

## Tech Stack

- **Ruby on Rails 8** — Web framework and server
- **Propshaft** — Asset pipeline
- **Importmap** — JavaScript modules (no Node.js build step)
- **HTML5 Canvas** — Game rendering and physics
- **SQLite** — Database (Rails default)

## Project Structure

```
racing_game/
├── app/
│   ├── controllers/game_controller.rb   # Serves the game page
│   ├── javascript/racing_game/
│   │   ├── main.js      # Entry point
│   │   ├── game.js      # Game loop, state, UI
│   │   ├── entities.js  # Cars, weapons, item boxes
│   │   └── track.js     # Track geometry and rendering
│   └── views/game/index.html.erb
└── config/routes.rb     # root → game#index
```

## License

MIT

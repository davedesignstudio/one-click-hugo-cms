# Kart Racer 🏎️

A Mario Kart-style browser racing game built with **Ruby on Rails 8** and HTML5 Canvas.

Race around an oval track against 3 AI opponents, collect item boxes, and use weapons to gain the advantage!

## Features

- **Top-down kart racing** with 3-lap races
- **6 weapon types**: Green Shell, Red Shell (homing), Banana Peel, Mushroom Boost, Star Power, Lightning
- **AI opponents** with racing line logic and weapon usage
- **Item boxes** that respawn after use
- **Leaderboard** to save your best race results
- **Responsive canvas** that scales to your screen

## Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Accelerate |
| `S` / `↓` | Brake / Reverse |
| `A` / `←` | Turn Left |
| `D` / `→` | Turn Right |
| `Space` | Use Weapon |

## Getting Started

### Prerequisites

- Ruby 3.2+
- Bundler
- SQLite3

### Setup

```bash
cd kart_racer
bundle config set --local path 'vendor/bundle'
bundle install
bin/rails db:prepare
bin/rails tailwindcss:build
```

### Run the Game

```bash
bin/rails server
```

Open [http://localhost:3000](http://localhost:3000) in your browser and click **Start Racing!**

Or use the dev script (Rails + Tailwind watcher):

```bash
bin/dev
```

## Tech Stack

- **Ruby on Rails 8** — web framework, API for scores
- **Hotwire (Stimulus)** — game controller integration
- **HTML5 Canvas** — real-time game rendering
- **Tailwind CSS** — UI styling
- **SQLite** — leaderboard storage

## Project Structure

```
app/javascript/game/
  constants.js   # Game config, weapons, helpers
  track.js       # Track rendering, item boxes, collision
  kart.js        # Kart physics, projectiles, hazards
  ai.js          # AI opponent behavior
  engine.js      # Main game loop and state management
```

## License

MIT

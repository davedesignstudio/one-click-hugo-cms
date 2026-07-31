# Kart Blitz

A Mario Kart-style top-down racing game built with **Ruby on Rails** and HTML5 Canvas. Race against 3 AI opponents on an oval track, collect item boxes, and use weapons to gain the advantage!

## Features

- **Top-down kart racing** with acceleration, braking, steering, and drift boost
- **3-lap races** against AI opponents (Toad, Yoshi, Bowser)
- **Mario Kart-style weapons:**
  - 🟢 **Green Shell** — fires straight ahead
  - 🔴 **Red Shell** — homing projectile
  - 🍌 **Banana** — drop a hazard behind you
  - 🍄 **Mushroom** — speed boost
  - ⭐ **Star** — invincibility + speed
  - ⚡ **Lightning** — stuns and shrinks opponents
- **Item boxes** scattered around the track
- **HUD** with lap counter, position, speedometer, item slot, and minimap
- **Drift boost** — hold Shift while turning at speed

## Controls

| Key | Action |
|-----|--------|
| ↑ / W | Accelerate |
| ↓ / S | Brake / Reverse |
| ← → / A D | Steer |
| Space | Use weapon |
| Shift | Drift (build boost) |

## Getting Started

### Prerequisites

- Ruby 3.2+
- Bundler

### Setup

```bash
cd kart_racer
bundle config set --local path 'vendor/bundle'
bundle install
```

### Run the Game

```bash
bundle exec rails server
```

Open [http://localhost:3000](http://localhost:3000) in your browser and click **Start Race**!

## Tech Stack

- **Ruby on Rails 8** — web server and routing
- **HTML5 Canvas** — game rendering and physics
- **Propshaft** — asset pipeline

## Project Structure

```
kart_racer/
├── app/
│   ├── controllers/game_controller.rb   # Serves the game page
│   ├── views/game/index.html.erb        # Game canvas + HUD
│   ├── assets/
│   │   ├── javascripts/kart_racer.js    # Full game engine
│   │   └── stylesheets/game.css         # Game UI styles
│   └── ...
└── config/routes.rb                     # root → game#index
```

## License

MIT

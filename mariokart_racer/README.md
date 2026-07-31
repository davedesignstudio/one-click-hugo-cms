# Kart Blitz — Mario Kart-style web racing game built with Ruby on Rails.

Race around an oval track against three AI opponents. Grab item boxes for weapons, blast rivals with shells, drop banana peels, boost with mushrooms, and more.

## Features

- **Top-down kart racing** on a Mario Kart-inspired oval circuit
- **4 racers** — you vs Peach, Bowser, and Toad
- **3-lap races** with live standings and lap tracking
- **6 weapons** inspired by Mario Kart:
  - Green Shell — fires straight ahead
  - Red Shell — homing projectile
  - Banana — drop a peel behind you
  - Mushroom — speed boost
  - Star — temporary invincibility
  - Lightning — shrinks and stuns rivals
- **Leaderboard** — best race times saved to the database

## Requirements

- Ruby 3.2+
- Bundler
- SQLite3

## Setup

```bash
cd mariokart_racer
bundle config set --local path 'vendor/bundle'  # if needed
bundle install
bin/rails db:setup
```

## Run

```bash
bin/rails server
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Accelerate |
| S / ↓ | Brake / reverse |
| A / ← | Turn left |
| D / → | Turn right |
| Space | Use weapon |
| R | Restart |

## Tech Stack

- **Ruby on Rails 8** — web framework, leaderboard API
- **HTML5 Canvas** — real-time game rendering
- **Importmap** — ES modules, no Node build step for game code
- **SQLite** — race score persistence

## Project Structure

```
mariokart_racer/
├── app/
│   ├── controllers/     # Game and scores API
│   ├── javascript/game/ # Canvas racing engine
│   ├── models/          # RaceScore leaderboard
│   └── views/game/      # Game page
└── config/routes.rb     # root → game#index
```

## License

MIT

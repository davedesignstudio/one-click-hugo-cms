# TurboShell Rally

A Mario Kart–style racing game built with **Ruby on Rails** and a canvas game engine in the browser.

## Features

- Top-down night circuit (**Neon Loop**)
- Player kart + 4 AI rivals
- Item crates with banana peels, green/red shells, mushrooms, lightning, and stars
- 3-lap races with position, lap, and timer HUD
- Touch controls on mobile
- Persistent leaderboard (SQLite)

## Stack

- Ruby on Rails 8
- Hotwire (Turbo + Stimulus)
- Importmap-powered ES modules
- SQLite
- Canvas 2D race engine

## Setup

```bash
bundle install
bin/rails db:prepare
bin/rails server
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

| Action | Keys |
|--------|------|
| Accelerate | `↑` / `W` |
| Brake | `↓` / `S` |
| Steer | `←` `→` / `A` `D` |
| Use item | `Space` |

## Play flow

1. Pick a racer name and kart on the home page
2. Race three laps while collecting crates
3. Finish time is saved to the leaderboard

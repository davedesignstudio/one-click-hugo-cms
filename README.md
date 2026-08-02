# KartBlitz

A Mario Kart–style weapon racing game built with **Ruby on Rails** and an HTML5 Canvas client.

## Features

- Top-down coastal circuit with three-lap races
- Player kart plus three AI rivals
- Item crates that grant weapons:
  - **Banana** — drop a spin trap
  - **Green Shell** — straight projectile
  - **Red Shell** — seeks the racer ahead
  - **Mushroom** — speed boost
  - **Oil Slick** — send rivals sliding
  - **Lightning** — slow the whole field
- On-screen touch controls for mobile
- Leaderboard powered by Active Record + SQLite

## Controls

| Action | Keys |
| --- | --- |
| Accelerate | `↑` / `W` |
| Brake / reverse | `↓` / `S` |
| Steer | `←` `→` / `A` `D` |
| Use weapon | `Space` |

## Setup

```bash
bundle config set --local path 'vendor/bundle'
bundle install
bin/rails db:prepare
bin/rails server
```

Open [http://localhost:3000](http://localhost:3000), then hit **Start race**.

## Placeholder art

Game sprites live in `public/game/placeholders/` as labeled temporary SVGs (karts, item box, weapons, grandstand).

Replace any file in place with final art — keep the same filename. The loader is `app/javascript/game/placeholders.js`.

## Stack

- Ruby on Rails 8
- Importmap + Stimulus
- SQLite for race results
- Canvas 2D game engine under `app/javascript/game/`
- Placeholder SVG sprites under `public/game/placeholders/`

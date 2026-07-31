# BashKart

Arcade kart racing in the browser, served by **Ruby on Rails**, with Mario Kart-style weapons.

## Features

- Top-down circuit racing with camera follow
- Player kart + 3 AI rivals, 3-lap races
- Item crates and weapons: banana, green shell, red shell, mushroom, lightning, oil slick
- HUD, standings, countdown, finish screen
- Race times saved to SQLite via `RaceResult`

## Controls

| Action | Keys |
| --- | --- |
| Accelerate | `↑` / `W` |
| Brake / reverse | `↓` / `S` |
| Steer | `←` `→` / `A` `D` |
| Use weapon | `Space` |

Touch buttons appear on smaller screens.

## Setup

```bash
bundle config set --local path 'vendor/bundle'
bundle install
bin/rails db:prepare
bin/rails server
```

Open [http://localhost:3000](http://localhost:3000), then **Start Race**.

## Stack

- Ruby on Rails 8
- Importmap + vanilla JS canvas game
- SQLite for leaderboard results

# BLASTKART

A Mario Kart-style weapon racing game built with **Ruby on Rails** and a browser canvas engine.

## Features

- Top-down 3-lap races on Coastal Loop, Thunder Bowl, and Neon Canyon
- AI rivals
- Item boxes with Green Shell, Red Shell, Banana, Mushroom, Bomb, and Lightning
- Touch controls on mobile
- Persistent leaderboard (SQLite)

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Steer & accelerate |
| Space | Fire weapon |
| Shift | Drift |

## Setup

```bash
bundle install
bin/rails db:prepare
bin/rails server
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Rails 8 + SQLite
- Hotwire Stimulus + importmap
- Canvas 2D race engine (`app/javascript/game/engine.js`)

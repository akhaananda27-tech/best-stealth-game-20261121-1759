# NIGHTSHIFT — Museum Heist Stealth

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/akhaananda27-tech/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/akhaananda27-tech/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down 2D stealth game built for the [make.fun "Make the best stealth game" bounty](https://make.fun/bounty/best-stealth-game-20261121-1759). Join make.fun with my referral: https://make.fun/r/jfeejy4f

## The game

You are **Shade**, a thief slipping through a night museum to steal the **Star Sapphire** and reach the green exit — unseen.

- **4–6 guards** walk learnable patrol routes, each with a visible **vision cone**: yellow when calm, orange with `?` when suspicious, red with `!` when chasing.
- **Detection meter** fills while a guard sees you and drains when you break line of sight. Being fully spotted triggers an alarm and a chase — not an instant fail. You have **3 lives**; getting caught costs one and the guards lose you in the dark.
- **Cover** — display cases, pillars and walls — blocks both movement and sight. Hold **SHIFT to sneak** (slow, silent); running is fast but loud, and guards hear the noise ring and come to look.
- **3 floors** of rising difficulty: The Marble Hall, The Gallery of Kings, The Vault of the Star Sapphire.
- Original art, names and sounds — everything is drawn in code on canvas, sounds are WebAudio oscillators, no external assets, no network.

## Play

Serve `game/` with any static server and open `index.html` in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| SHIFT | Sneak (silent, slow) |
| M | Mute |
| R | Restart |
| ENTER | Start / next floor |

## Screenshots

`?shot=1..4` stages a scene from the live game (patrol + cones, red-alert chase, the exit escape, the vault) for screenshot capture.

## Layout

- `game/index.html` — page + HUD
- `game/style.css` — museum-night page chrome
- `game/js/main.js` — state, input, loop, rules
- `game/js/levels.js` — the three museum floor plans
- `game/js/guards.js` — patrols, vision cones, line of sight, detection
- `game/js/render.js` — all canvas drawing
- `game/js/audio.js` — WebAudio oscillator sounds
- `main.ts` — hand-in program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`

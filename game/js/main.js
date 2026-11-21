// NIGHTSHIFT — the game itself: state, input, the loop, the rules.
// Shade steals the Star Sapphire from a night museum and leaves by the
// green exit unseen. Guards patrol, their cones fill the suspicion meter,
// and getting caught costs a life — but the meter forgives: break line of
// sight and it drains away.

import { LEVELS, TILE, parseLevel } from './levels.js';
import { makeGuard, updateGuard, guardSeesPlayer, hearNoise, CATCH_DISTANCE } from './guards.js';
import { drawFloor, drawSolids, drawSapphire, drawExit, drawGuard, drawPlayer, drawNoiseRing, drawDarkness } from './render.js';
import { playStep, playPickup, playAlert, playCaught, playWin, toggleMute, isMuted } from './audio.js';

const W = 960;
const H = 640;
const WALK_SPEED = 135;
const SNEAK_SPEED = 70;
const RUN_SPEED = 205;
const PLAYER_RADIUS = 11;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hud = {
  level: document.getElementById('hud-level'),
  objective: document.getElementById('hud-objective'),
  lives: document.getElementById('hud-lives'),
  meter: document.getElementById('hud-meter-fill'),
  meterLabel: document.getElementById('hud-meter-label'),
  timer: document.getElementById('hud-timer'),
  toast: document.getElementById('hud-toast'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayText: document.getElementById('overlay-text'),
  overlayHint: document.getElementById('overlay-hint'),
};

const game = {
  state: 'title', // title | playing | levelclear | gameover | win
  levelIndex: 0,
  level: null,
  solids: [],
  sapphire: null,
  exit: null,
  start: null,
  guards: [],
  player: null,
  suspicion: 0,
  lastSeen: null,
  lives: 3,
  time: 0,
  levelTime: 0,
  score: 0,
  ghosts: 0, // times fully spotted
  noiseRings: [],
  stepTimer: 0,
  noiseTimer: 0,
  toastTimer: 0,
  invulnerable: 0,
  alerted: false,
  shot: null,
};

// Exposed for automated play-testing; harmless in normal play.
window.__NIGHTSHIFT__ = game;

const keys = new Set();

function showOverlay(title, text, hint) {
  hud.overlayTitle.textContent = title;
  hud.overlayText.textContent = text;
  hud.overlayHint.textContent = hint;
  hud.overlay.classList.remove('hidden');
}

function hideOverlay() {
  hud.overlay.classList.add('hidden');
}

function showToast(text) {
  hud.toast.textContent = text;
  hud.toast.classList.remove('hidden');
  game.toastTimer = 2.2;
}

function loadLevel(index) {
  const def = LEVELS[index];
  const parsed = parseLevel(def);
  game.level = def;
  game.solids = parsed.solids;
  game.sapphire = parsed.sapphire;
  game.exit = parsed.exit;
  game.start = parsed.start;
  game.guards = def.guards.map(makeGuard);
  game.player = {
    x: parsed.start.x,
    y: parsed.start.y,
    sneaking: false,
    running: false,
    moving: false,
    hasSapphire: false,
  };
  game.suspicion = 0;
  game.lastSeen = null;
  game.levelTime = 0;
  game.noiseRings = [];
  game.invulnerable = 0;
  game.alerted = false;
  hud.level.textContent = def.name;
}

function circleHitsSolid(x, y, r) {
  for (const s of game.solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

function movePlayer(dt) {
  const p = game.player;
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
  p.moving = dx !== 0 || dy !== 0;
  if (!p.moving) {
    p.sneaking = false;
    p.running = false;
    return;
  }
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  p.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
  p.running = !p.sneaking;
  const speed = p.sneaking ? SNEAK_SPEED : p.running ? RUN_SPEED : WALK_SPEED;
  const nx = p.x + dx * speed * dt;
  if (!circleHitsSolid(nx, p.y, PLAYER_RADIUS)) p.x = nx;
  const ny = p.y + dy * speed * dt;
  if (!circleHitsSolid(p.x, ny, PLAYER_RADIUS)) p.y = ny;
  p.x = Math.max(PLAYER_RADIUS, Math.min(W - PLAYER_RADIUS, p.x));
  p.y = Math.max(PLAYER_RADIUS, Math.min(H - PLAYER_RADIUS, p.y));
  // Footsteps: quiet while sneaking, loud while running.
  game.stepTimer -= dt;
  if (game.stepTimer <= 0) {
    playStep(p.sneaking);
    game.stepTimer = p.sneaking ? 0.55 : p.running ? 0.26 : 0.38;
  }
  if (p.running) {
    game.noiseTimer -= dt;
    if (game.noiseTimer <= 0) {
      game.noiseRings.push({ x: p.x, y: p.y, radius: 170, age: 0, life: 0.8 });
      hearNoise(game.guards, p.x, p.y, 170);
      game.noiseTimer = 0.5;
    }
  }
}

function onCaught() {
  game.lives -= 1;
  game.ghosts += 1;
  playCaught();
  if (game.lives <= 0) {
    game.state = 'gameover';
    showOverlay('CAUGHT — GAME OVER', `The night guards boxed Shade in on ${game.level.name}. The Star Sapphire stays in its case… this time.`, 'Press ENTER to try the heist again');
    return;
  }
  // Forgiving catch: Shade slips away and restarts the floor with one
  // life fewer; the guards go back to their patrols.
  game.player.x = game.start.x;
  game.player.y = game.start.y;
  game.player.hasSapphire = false;
  game.suspicion = 0;
  game.invulnerable = 2.5;
  game.alerted = false;
  for (const g of game.guards) {
    g.state = 'patrol';
    g.investigate = null;
    g.pauseTimer = 0;
    const [tx, ty] = [g.waypoints[0].x, g.waypoints[0].y];
    g.x = tx;
    g.y = ty;
    g.wpIndex = 1;
  }
  showToast(`Caught! ${game.lives} ${game.lives === 1 ? 'life' : 'lives'} left — the guards lost you in the dark.`);
}

function update(dt) {
  game.time += dt;
  if (game.state !== 'playing') return;
  game.levelTime += dt;
  if (game.toastTimer > 0) {
    game.toastTimer -= dt;
    if (game.toastTimer <= 0) hud.toast.classList.add('hidden');
  }
  if (game.invulnerable > 0) game.invulnerable -= dt;
  movePlayer(dt);
  const p = game.player;
  for (const g of game.guards) {
    if (updateGuard(g, dt, p, game.solids, game) === 'caught' && game.invulnerable <= 0) {
      onCaught();
      return;
    }
  }
  // Suspicion drains only when no guard can actually see Shade — a guard
  // standing nearby but blocked by a display case does not count.
  let seen = false;
  for (const g of game.guards) {
    if (guardSeesPlayer(g, p, game.solids)) {
      seen = true;
      break;
    }
  }
  if (!seen) {
    game.suspicion = Math.max(0, game.suspicion - dt * 16);
    if (game.suspicion < 100) game.alerted = false;
  }
  // Full meter: every guard gives chase at once.
  if (game.suspicion >= 100 && !game.alerted) {
    game.alerted = true;
    game.suspicion = 60;
    playAlert();
    showToast('SPOTTED! Break line of sight — now!');
    for (const g of game.guards) {
      g.state = 'chase';
      g.chaseTimer = 5;
    }
  }
  for (const r of game.noiseRings) r.age += dt;
  game.noiseRings = game.noiseRings.filter((r) => r.age < r.life);
  // Pick up the sapphire.
  if (!p.hasSapphire && game.sapphire) {
    const d = Math.hypot(p.x - game.sapphire.x, p.y - game.sapphire.y);
    if (d < 26) {
      p.hasSapphire = true;
      playPickup();
      showToast('Star Sapphire secured — now reach the green EXIT, unseen!');
    }
  }
  // Reach the exit with the sapphire.
  if (game.exit) {
    const d = Math.hypot(p.x - game.exit.x, p.y - game.exit.y);
    if (d < 28) {
      if (p.hasSapphire) {
        levelClear();
      } else {
        showToast('The exit is locked — you need the Star Sapphire first!');
        p.x -= (p.x - game.exit.x) * 0.02;
        p.y -= (p.y - game.exit.y) * 0.02;
      }
    }
  }
  updateHud();
}

function levelClear() {
  const def = game.level;
  const parBonus = Math.max(0, Math.round((def.par - game.levelTime) * 10));
  const ghostBonus = game.ghosts === 0 ? 500 : 0;
  const gained = 1000 + parBonus + ghostBonus;
  game.score += gained;
  playWin();
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.state = 'win';
    const mins = Math.floor(game.time / 60);
    const secs = Math.floor(game.time % 60).toString().padStart(2, '0');
    showOverlay(
      'THE PERFECT HEIST',
      `Shade slipped out of the museum with the Star Sapphire — all three floors, ${game.ghosts === 0 ? 'never once fully spotted' : `spotted ${game.ghosts} time${game.ghosts === 1 ? '' : 's'}`}. Final score ${game.score} in ${mins}:${secs}.`,
      'Press ENTER to run the heist again',
    );
  } else {
    game.state = 'levelclear';
    game.levelIndex += 1;
    showOverlay(
      `${def.name} — CLEAR`,
      `Sapphire secured and out unseen. +${gained} points (par bonus ${parBonus}, ghost bonus ${ghostBonus}).`,
      'Press ENTER for the next floor',
    );
  }
}

function updateHud() {
  const p = game.player;
  hud.objective.textContent = p.hasSapphire
    ? 'Sapphire secured — reach the green EXIT!'
    : 'Steal the Star Sapphire, then reach the green EXIT';
  hud.lives.textContent = '♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives));
  const pct = Math.round(game.suspicion);
  hud.meter.style.width = `${pct}%`;
  hud.meter.style.background = pct >= 100 ? '#ff5040' : pct >= 45 ? '#ffa028' : '#ffd950';
  hud.meterLabel.textContent = game.alerted ? 'SPOTTED!' : pct >= 45 ? 'SUSPICIOUS' : pct > 2 ? 'SEEN…' : 'HIDDEN';
  const mins = Math.floor(game.levelTime / 60);
  const secs = Math.floor(game.levelTime % 60).toString().padStart(2, '0');
  hud.timer.textContent = `${mins}:${secs} · ${game.score} pts`;
}

function render() {
  ctx.clearRect(0, 0, W, H);
  drawFloor(ctx, W, H);
  drawSolids(ctx, game.solids);
  drawSapphire(ctx, game.sapphire, game.player.hasSapphire, game.time);
  drawExit(ctx, game.exit, game.player.hasSapphire, game.time);
  for (const r of game.noiseRings) drawNoiseRing(ctx, r);
  // Cones first so guards and Shade draw on top of them.
  for (const g of game.guards) drawGuard(ctx, g, game.time);
  if (game.invulnerable <= 0 || Math.floor(game.time * 8) % 2 === 0) {
    drawPlayer(ctx, game.player, game.time);
  }
  drawDarkness(ctx, W, H, game.player, game.sapphire, game.exit);
}

// Staged scenes for the screenshots (?shot=1..4). The game is frozen in
// the pose so the shot is a real render of the live code.
function stageShot(n) {
  game.shot = n;
  if (n === 1) {
    // Sneaking behind a display case, sapphire in sight, cones sweeping.
    loadLevel(0);
    game.player.x = 17 * TILE + 20;
    game.player.y = 5 * TILE + 20;
    game.player.sneaking = true;
    game.player.moving = true;
    game.suspicion = 55;
    game.guards[0].state = 'suspicious';
    game.guards[0].investigate = { x: game.player.x, y: game.player.y };
    game.guards[0].x = 14 * TILE + 20;
    game.guards[0].y = 3 * TILE + 20;
    game.guards[0].dir = Math.PI * 0.35;
    game.guards[1].x = 16 * TILE;
    game.guards[1].y = 9 * TILE;
    game.guards[1].dir = -Math.PI * 0.6;
  } else if (n === 2) {
    // Red alert: a guard has spotted Shade and gives chase.
    loadLevel(1);
    game.player.x = 10 * TILE;
    game.player.y = 9 * TILE;
    game.player.running = true;
    game.player.moving = true;
    game.suspicion = 100;
    game.alerted = true;
    game.guards[2].state = 'chase';
    game.guards[2].x = 8 * TILE + 10;
    game.guards[2].y = 9 * TILE;
    game.guards[2].dir = 0;
    game.guards[2].chaseTimer = 5;
    game.guards[4].state = 'suspicious';
    game.guards[4].x = 12 * TILE;
    game.guards[4].y = 6 * TILE;
    game.guards[4].dir = Math.PI * 0.5;
    game.noiseRings.push({ x: game.player.x, y: game.player.y, radius: 170, age: 0.4, life: 0.8 });
  } else if (n === 3) {
    // The win: sapphire in hand, Shade slipping out the green exit.
    loadLevel(0);
    game.player.hasSapphire = true;
    game.player.x = game.exit.x - 40;
    game.player.y = game.exit.y + 6;
    game.player.moving = true;
    game.suspicion = 0;
    game.guards[3].x = 18 * TILE;
    game.guards[3].y = 11 * TILE;
    game.guards[3].dir = Math.PI;
  } else {
    // The vault: six guards, long cones, Shade threading the middle.
    loadLevel(2);
    game.player.x = 12 * TILE;
    game.player.y = 8 * TILE;
    game.player.sneaking = true;
    game.player.moving = true;
    game.suspicion = 20;
    game.guards[0].dir = Math.PI * 0.4;
    game.guards[1].dir = Math.PI * 0.7;
    game.guards[2].dir = 0;
    game.guards[3].dir = Math.PI;
    game.guards[4].dir = -Math.PI * 0.5;
    game.guards[5].dir = Math.PI * 0.5;
  }
  game.state = 'playing';
  updateHud();
  hideOverlay();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.shot === null) {
    update(dt);
  } else {
    game.time += dt;
  }
  render();
  requestAnimationFrame(loop);
}

function startGame() {
  game.levelIndex = 0;
  game.lives = 3;
  game.score = 0;
  game.ghosts = 0;
  game.time = 0;
  loadLevel(0);
  game.state = 'playing';
  hideOverlay();
  updateHud();
}

function showTitle() {
  game.state = 'title';
  loadLevel(0);
  showOverlay(
    'NIGHTSHIFT',
    'A museum heist in the dark. You are Shade. Steal the Star Sapphire and slip out the green exit — unseen. Guards patrol with vision cones: yellow is calm, orange ? is suspicious, red ! is a chase. Shift sneaks silently, running is fast but loud.',
    'Press ENTER to begin the heist · WASD / arrows to move · SHIFT to sneak · M to mute',
  );
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Enter') {
    if (game.state === 'title' || game.state === 'gameover' || game.state === 'win') {
      startGame();
    } else if (game.state === 'levelclear') {
      loadLevel(game.levelIndex);
      game.state = 'playing';
      hideOverlay();
      updateHud();
    }
  }
  if (e.code === 'KeyM') {
    showToast(isMuted() ? 'Sound on' : 'Sound off');
    toggleMute();
  }
  if (e.code === 'KeyR' && (game.state === 'playing' || game.state === 'gameover')) startGame();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// Boot: a ?shot=N query stages a screenshot scene, otherwise the title.
const params = new URLSearchParams(window.location.search);
const shot = Number(params.get('shot'));
if (shot >= 1 && shot <= 4) {
  stageShot(shot);
} else {
  showTitle();
}
requestAnimationFrame(loop);

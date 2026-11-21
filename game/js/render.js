// NIGHTSHIFT — every pixel the game draws.
// Top-down museum at night: checkerboard marble floor, warm pools of light
// around the exhibits, dark corners where Shade is safe. Vision cones are
// painted as translucent wedges so the danger is readable at a glance.

import { TILE } from './levels.js';
import { CONE_HALF_ANGLE } from './guards.js';

const FLOOR_A = '#2b2f45';
const FLOOR_B = '#262a3d';

export function drawFloor(ctx, w, h) {
  for (let y = 0; y < h / TILE; y++) {
    for (let x = 0; x < w / TILE; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
  // Faint grout lines and a worn red carpet down the middle hall.
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= w; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y <= h; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(122,32,44,0.55)';
  ctx.fillRect(w / 2 - 46, TILE, 92, h - 2 * TILE);
  ctx.fillStyle = 'rgba(212,175,105,0.35)';
  ctx.fillRect(w / 2 - 46, TILE, 3, h - 2 * TILE);
  ctx.fillRect(w / 2 + 43, TILE, 3, h - 2 * TILE);
}

export function drawSolids(ctx, solids) {
  for (const s of solids) {
    if (s.kind === 'wall') {
      ctx.fillStyle = '#171a26';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#3a4060';
      ctx.fillRect(s.x, s.y, s.w, 5);
    } else if (s.kind === 'case') {
      ctx.fillStyle = '#1d2b33';
      ctx.fillRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      ctx.fillStyle = 'rgba(140,220,255,0.28)';
      ctx.fillRect(s.x + 7, s.y + 7, s.w - 14, s.h - 14);
      ctx.strokeStyle = '#d4af69';
      ctx.lineWidth = 2;
      ctx.strokeRect(s.x + 3.5, s.y + 3.5, s.w - 7, s.h - 7);
      ctx.fillStyle = '#d4af69';
      ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + s.h / 2, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#4a4f6d';
      ctx.beginPath(); ctx.arc(s.x + TILE / 2, s.y + TILE / 2, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a70a0';
      ctx.beginPath(); ctx.arc(s.x + TILE / 2, s.y + TILE / 2, 10, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function drawSapphire(ctx, sapphire, taken, time) {
  if (taken) return;
  const pulse = 0.7 + Math.sin(time * 3) * 0.3;
  const glow = ctx.createRadialGradient(sapphire.x, sapphire.y, 2, sapphire.x, sapphire.y, 46);
  glow.addColorStop(0, `rgba(120,200,255,${0.55 * pulse})`);
  glow.addColorStop(1, 'rgba(120,200,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sapphire.x, sapphire.y, 46, 0, Math.PI * 2); ctx.fill();
  // Pedestal.
  ctx.fillStyle = '#3a3f5c';
  ctx.fillRect(sapphire.x - 12, sapphire.y - 12, 24, 24);
  ctx.fillStyle = '#565d85';
  ctx.fillRect(sapphire.x - 9, sapphire.y - 9, 18, 18);
  // The gem itself, a cut diamond.
  ctx.fillStyle = '#8fd4ff';
  ctx.beginPath();
  ctx.moveTo(sapphire.x, sapphire.y - 11);
  ctx.lineTo(sapphire.x + 9, sapphire.y - 2);
  ctx.lineTo(sapphire.x, sapphire.y + 10);
  ctx.lineTo(sapphire.x - 9, sapphire.y - 2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e8f6ff';
  ctx.beginPath();
  ctx.moveTo(sapphire.x, sapphire.y - 11);
  ctx.lineTo(sapphire.x + 9, sapphire.y - 2);
  ctx.lineTo(sapphire.x, sapphire.y - 2);
  ctx.closePath(); ctx.fill();
}

export function drawExit(ctx, exit, hasSapphire, time) {
  const pulse = hasSapphire ? 0.65 + Math.sin(time * 4) * 0.35 : 0.35;
  const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 52);
  glow.addColorStop(0, `rgba(80,255,140,${0.5 * pulse})`);
  glow.addColorStop(1, 'rgba(80,255,140,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(exit.x, exit.y, 52, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hasSapphire ? '#1f7a3d' : '#274a33';
  ctx.fillRect(exit.x - 17, exit.y - 17, 34, 34);
  ctx.strokeStyle = hasSapphire ? '#5dff8f' : '#3f7a52';
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x - 17, exit.y - 17, 34, 34);
  ctx.fillStyle = hasSapphire ? '#c8ffe0' : '#7fb892';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', exit.x, exit.y + 1);
  if (hasSapphire) {
    ctx.fillStyle = '#5dff8f';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('GO! GO! GO!', exit.x, exit.y - 28);
  }
}

function coneColor(state) {
  if (state === 'chase') return 'rgba(255,60,60,0.34)';
  if (state === 'suspicious') return 'rgba(255,150,40,0.30)';
  return 'rgba(255,220,80,0.24)';
}

export function drawGuard(ctx, guard, time) {
  // Vision cone, drawn under the guard.
  ctx.fillStyle = coneColor(guard.state);
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, guard.range, guard.dir - CONE_HALF_ANGLE, guard.dir + CONE_HALF_ANGLE);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = coneColor(guard.state).replace(/0\.\d+\)$/, '0.55)');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, guard.range, guard.dir - CONE_HALF_ANGLE, guard.dir + CONE_HALF_ANGLE);
  ctx.closePath(); ctx.stroke();
  // Body: a night guard in a navy uniform with a cap and a torch dot.
  ctx.fillStyle = '#1c2b4a';
  ctx.beginPath(); ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = guard.state === 'chase' ? '#ff5040' : '#8fa8d8';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#d8c690';
  ctx.beginPath(); ctx.arc(guard.x, guard.y, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.dir) * 13, guard.y + Math.sin(guard.dir) * 13, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // State mark: ? when suspicious, ! when chasing.
  if (guard.state !== 'patrol') {
    const bob = Math.sin(time * 5) * 2;
    ctx.fillStyle = guard.state === 'chase' ? '#ff5040' : '#ffa028';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 26 + bob);
  }
}

export function drawPlayer(ctx, player, time) {
  // Soft shadow and a faint ring while sneaking.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(player.x, player.y + 9, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(140,200,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(player.x, player.y, 17 + Math.sin(time * 4) * 1.5, 0, Math.PI * 2); ctx.stroke();
  }
  // Shade: a hooded thief in dark violet, cloak trailing behind the move.
  const bob = Math.sin(time * 8) * (player.moving ? 1.5 : 0.5);
  ctx.fillStyle = '#241a3a';
  ctx.beginPath(); ctx.arc(player.x, player.y + 2 + bob, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3b2d63';
  ctx.beginPath(); ctx.arc(player.x, player.y + bob, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6d5aa8';
  ctx.beginPath(); ctx.arc(player.x, player.y - 2 + bob, 7, 0, Math.PI * 2); ctx.fill();
  // Eyes glinting in the dark.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(player.x - 4, player.y - 4 + bob, 3, 2);
  ctx.fillRect(player.x + 1, player.y - 4 + bob, 3, 2);
  // Sapphire in hand.
  if (player.hasSapphire) {
    ctx.fillStyle = '#8fd4ff';
    ctx.beginPath();
    ctx.moveTo(player.x + 12, player.y - 12);
    ctx.lineTo(player.x + 18, player.y - 6);
    ctx.lineTo(player.x + 12, player.y);
    ctx.lineTo(player.x + 6, player.y - 6);
    ctx.closePath(); ctx.fill();
  }
}

export function drawNoiseRing(ctx, ring) {
  const age = ring.age / ring.life;
  ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - age)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius * age + 6, 0, Math.PI * 2); ctx.stroke();
}

// Night lighting: the museum is dark except for pools of lamplight and the
// glow around Shade, so the player reads at a glance where it is safe.
export function drawDarkness(ctx, w, h, player, sapphire, exit) {
  const dark = ctx.createRadialGradient(player.x, player.y, 60, player.x, player.y, 320);
  dark.addColorStop(0, 'rgba(4,6,16,0)');
  dark.addColorStop(1, 'rgba(4,6,16,0.42)');
  ctx.fillStyle = dark;
  ctx.fillRect(0, 0, w, h);
  const lamp = (x, y) => {
    const g = ctx.createRadialGradient(x, y, 4, x, y, 90);
    g.addColorStop(0, 'rgba(255,214,140,0.10)');
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 90, y - 90, 180, 180);
  };
  lamp(sapphire.x, sapphire.y);
  lamp(exit.x, exit.y);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 14;
  ctx.strokeRect(0, 0, w, h);
}

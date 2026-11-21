// NIGHTSHIFT — guard patrols, vision cones and detection.
// A guard walks a loop of waypoints, looks where it walks, and its vision
// cone is yellow when calm, orange with "?" when suspicious and red with
// "!" when it has spotted Shade and gives chase. Cover (walls, display
// cases, pillars) blocks the cone's line of sight.

import { TILE } from './levels.js';

export const CONE_HALF_ANGLE = 0.61; // ~35 degrees each side
export const CATCH_DISTANCE = 20;

// A segment from (x1,y1) to (x2,y2) hits a rectangle when the slab test
// says so. Used to check whether a wall, case or pillar stands between a
// guard's eyes and Shade.
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (const s of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can this guard see the player right now? Inside the cone, in range,
// and no cover between them.
export function guardSeesPlayer(guard, player, solids) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.range) return false;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, guard.dir)) > CONE_HALF_ANGLE) return false;
  return hasLineOfSight(guard.x, guard.y, player.x, player.y, solids);
}

export function makeGuard(def) {
  const [tx, ty] = def.waypoints[0];
  return {
    x: tx * TILE + TILE / 2,
    y: ty * TILE + TILE / 2,
    dir: 0,
    waypoints: def.waypoints.map(([wx, wy]) => ({ x: wx * TILE + TILE / 2, y: wy * TILE + TILE / 2 })),
    wpIndex: 1,
    speed: def.speed,
    range: def.range,
    state: 'patrol', // patrol | suspicious | chase
    pauseTimer: 0,
    investigate: null,
    chaseTimer: 0,
    sweep: 0,
  };
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.dir = Math.atan2(dy, dx);
  return dist - step < 2;
}

// One simulation step for a guard. Returns 'caught' when a chasing guard
// reaches Shade.
export function updateGuard(guard, dt, player, solids, game) {
  if (guard.state === 'patrol') {
    // Walk the loop; pause and look around at each corner so the patrol
    // is readable and learnable.
    if (guard.pauseTimer > 0) {
      guard.pauseTimer -= dt;
      guard.sweep += dt * 1.4;
      guard.dir += Math.sin(guard.sweep) * dt * 0.9;
    } else {
      const wp = guard.waypoints[guard.wpIndex];
      if (moveToward(guard, wp.x, wp.y, guard.speed, dt)) {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = 0.9;
        guard.sweep = 0;
      }
    }
    if (guardSeesPlayer(guard, player, solids)) {
      game.suspicion = Math.min(100, game.suspicion + dt * (player.sneaking ? 34 : 62));
      game.lastSeen = { x: player.x, y: player.y };
      if (game.suspicion >= 100) {
        // The alarm is already sounding: join the chase at once.
        guard.state = 'chase';
        guard.chaseTimer = 6;
      } else if (game.suspicion >= 45) {
        guard.state = 'suspicious';
        guard.investigate = { x: player.x, y: player.y };
      }
    }
  } else if (guard.state === 'suspicious') {
    // Walk to where Shade was last glimpsed, look around, then give up
    // and go back to the patrol.
    const target = guard.investigate;
    if (target && moveToward(guard, target.x, target.y, guard.speed * 1.15, dt)) {
      guard.pauseTimer += dt;
      guard.sweep += dt * 1.6;
      guard.dir += Math.sin(guard.sweep) * dt * 1.2;
      if (guard.pauseTimer > 2.2) {
        guard.state = 'patrol';
        guard.investigate = null;
        guard.pauseTimer = 0;
      }
    }
    if (guardSeesPlayer(guard, player, solids)) {
      game.suspicion = Math.min(100, game.suspicion + dt * 70);
      game.lastSeen = { x: player.x, y: player.y };
    }
    if (game.suspicion >= 100) {
      guard.state = 'chase';
      guard.chaseTimer = 6;
    }
  } else {
    // Chase: run at Shade's last known spot, keep hunting while seen.
    guard.chaseTimer -= dt;
    const target = guardSeesPlayer(guard, player, solids) ? player : game.lastSeen;
    if (target) moveToward(guard, target.x, target.y, guard.speed * 1.9, dt);
    if (guardSeesPlayer(guard, player, solids)) {
      game.lastSeen = { x: player.x, y: player.y };
      guard.chaseTimer = 3;
    }
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < CATCH_DISTANCE) return 'caught';
    if (guard.chaseTimer <= 0) {
      guard.state = 'suspicious';
      guard.investigate = game.lastSeen ? { ...game.lastSeen } : null;
      guard.pauseTimer = 0;
    }
  }
  return null;
}

// A noise (running footsteps) draws every guard in earshot toward it.
export function hearNoise(guards, x, y, radius) {
  for (const g of guards) {
    if (g.state === 'chase') continue;
    const dist = Math.hypot(x - g.x, y - g.y);
    if (dist < radius) {
      g.state = 'suspicious';
      g.investigate = { x, y };
      g.pauseTimer = 0;
    }
  }
}

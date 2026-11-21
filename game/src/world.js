// The game's rules and state, with no drawing and no browser in it: the player,
// the guards with their vision cones and detection meters, walls that block sight
// and movement, bushes to hide in, shards to collect, and the exit. step() advances
// one fixed step and returns what happened as bit flags, so the caller can react
// without the world knowing about screens or sound.
import {
  DETECTION,
  FIELD,
  GUARD,
  LEVELS,
  LEVEL_BONUS,
  LIVES,
  PLAYER,
  SHARD_POINTS,
  TIME_BONUS_BASE,
  TIME_BONUS_PER_SECOND,
  VISION,
} from './config.js';

export const EVENT_SHARD = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_LEVEL = 8;
export const EVENT_WIN = 16;
export const EVENT_OVER = 32;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function circleHitsRect(x, y, radius, rect) {
  const cx = clamp(x, rect.x, rect.x + rect.w);
  const cy = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < radius * radius;
}

export function createWorld() {
  const player = {
    x: 0, y: 0, radius: PLAYER.radius,
    sneaking: false, hidden: false, moving: false,
    // Facing angle, for drawing the little hooded figure.
    angle: 0,
  };
  const guards = [];
  const shards = [];
  const state = {
    player, guards, shards,
    levelIndex: 0,
    level: LEVELS[0],
    score: 0,
    lives: LIVES,
    elapsed: 0,
    levelElapsed: 0,
    shardsGot: 0,
    shardsTotal: 0,
    caughtCount: 0,
    // Highest detection among all guards right now (0..100), for the HUD eye.
    maxDetection: 0,
    // True while any guard is suspicious or hunting.
    hunted: false,
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    state.levelIndex = index;
    state.level = level;
    state.levelElapsed = 0;
    player.x = level.start.x;
    player.y = level.start.y;
    player.angle = 0;
    player.sneaking = false;
    player.hidden = false;
    guards.length = 0;
    for (const def of level.guards) {
      const first = def.waypoints[0];
      const second = def.waypoints[1] ?? first;
      guards.push({
        x: first.x, y: first.y,
        angle: Math.atan2(second.y - first.y, second.x - first.x),
        waypoints: def.waypoints,
        wpIndex: 1 % def.waypoints.length,
        pause: 0,
        detection: 0,
        state: 'patrol',
        huntTimer: 0,
        lastSeen: { x: first.x, y: first.y },
        spotted: false,
      });
    }
    shards.length = 0;
    for (const def of level.shards) shards.push({ x: def.x, y: def.y, taken: false });
    state.shardsTotal = level.shards.length;
    state.shardsGot = 0;
    state.maxDetection = 0;
    state.hunted = false;
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    state.caughtCount = 0;
    loadLevel(0);
  }

  /** True when the segment from (x1,y1) to (x2,y2) crosses any wall. */
  function blockedByWall(x1, y1, x2, y2) {
    const walls = state.level.walls;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i < steps; i += 1) {
      const x = x1 + (dx * i) / steps;
      const y = y1 + (dy * i) / steps;
      for (let w = 0; w < walls.length; w += 1) {
        if (pointInRect(x, y, walls[w])) return true;
      }
    }
    return false;
  }

  function moveCircle(body, dx, dy) {
    const walls = state.level.walls;
    const nx = clamp(body.x + dx, body.radius, FIELD.width - body.radius);
    let hit = false;
    for (let w = 0; w < walls.length; w += 1) {
      if (circleHitsRect(nx, body.y, body.radius, walls[w])) { hit = true; break; }
    }
    if (!hit) body.x = nx;
    const ny = clamp(body.y + dy, body.radius, FIELD.height - body.radius);
    hit = false;
    for (let w = 0; w < walls.length; w += 1) {
      if (circleHitsRect(body.x, ny, body.radius, walls[w])) { hit = true; break; }
    }
    if (!hit) body.y = ny;
  }

  function guardSeesPlayer(guard) {
    const level = state.level;
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    const dist = Math.hypot(dx, dy);
    const range = level.visionRange;
    if (dist > range) return 0;
    const angleToPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(angleToPlayer, guard.angle)) > VISION.halfAngle) return 0;
    if (blockedByWall(guard.x, guard.y, player.x, player.y)) return 0;
    // Hidden in a bush: invisible unless the guard is almost on top of you.
    if (player.hidden && dist > DETECTION.closeDistance) return 0;
    let rate = level.detectionRate * (1 - (dist / range) * 0.55);
    if (dist < DETECTION.closeDistance) rate *= DETECTION.closeMultiplier;
    if (player.sneaking) rate *= DETECTION.sneakMultiplier;
    return rate;
  }

  function updateGuard(guard, dt) {
    const level = state.level;
    const speed = guard.state === 'patrol' ? level.guardSpeed : GUARD.suspiciousSpeed;

    if (guard.state === 'patrol') {
      if (guard.pause > 0) {
        guard.pause -= dt;
      } else {
        const target = guard.waypoints[guard.wpIndex];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) {
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
          guard.pause = GUARD.pauseAtWaypoint;
        } else {
          const stepLen = Math.min(dist, speed * dt);
          const nx = guard.x + (dx / dist) * stepLen;
          const ny = guard.y + (dy / dist) * stepLen;
          guard.angle = Math.atan2(dy, dx);
          moveCircle(guard, nx - guard.x, ny - guard.y);
        }
      }
    } else {
      // Suspicious: walk to the last seen spot, look around, then give up.
      const dx = guard.lastSeen.x - guard.x;
      const dy = guard.lastSeen.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        const stepLen = Math.min(dist, speed * dt);
        guard.angle = Math.atan2(dy, dx);
        moveCircle(guard, (dx / dist) * stepLen, (dy / dist) * stepLen);
      } else {
        guard.huntTimer -= dt;
        guard.angle += dt * 1.6;
        if (guard.huntTimer <= 0) {
          guard.state = 'patrol';
          guard.detection = 0;
        }
      }
    }
  }

  /**
   * One fixed step. `move` is {x, y} (a unit-ish direction, 0,0 for still),
   * `sneak` slows the player and halves detection gain, `harmless` is the
   * title screen's backdrop: guards patrol but never detect or catch.
   */
  function step(dt, move, sneak, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.levelElapsed += dt;

    // --- player ---
    const speed = sneak ? PLAYER.sneakSpeed : PLAYER.speed;
    const mag = Math.hypot(move.x, move.y);
    player.moving = mag > 0.01;
    if (player.moving) {
      const nx = (move.x / mag) * speed * dt;
      const ny = (move.y / mag) * speed * dt;
      player.angle = Math.atan2(move.y, move.x);
      moveCircle(player, nx, ny);
    }
    player.sneaking = sneak;
    player.hidden = false;
    for (const bush of state.level.bushes) {
      if (Math.hypot(player.x - bush.x, player.y - bush.y) < bush.r * 0.85) {
        player.hidden = true;
        break;
      }
    }

    // --- guards: see, detect, patrol/hunt ---
    let maxDetection = 0;
    let hunted = false;
    for (const guard of guards) {
      const rate = harmless ? 0 : guardSeesPlayer(guard);
      if (rate > 0) {
        const wasBelow = guard.detection < DETECTION.suspiciousAt;
        guard.detection = Math.min(100, guard.detection + rate * dt);
        guard.lastSeen.x = player.x;
        guard.lastSeen.y = player.y;
        if (wasBelow && guard.detection >= DETECTION.suspiciousAt) {
          guard.state = 'suspicious';
          guard.huntTimer = GUARD.huntTime;
          events |= EVENT_SPOTTED;
        }
        if (guard.detection >= 100) {
          events |= EVENT_CAUGHT;
        }
      } else {
        guard.detection = Math.max(0, guard.detection - DETECTION.drainRate * dt);
        if (guard.detection < DETECTION.suspiciousAt && guard.state === 'suspicious') {
          // Keep hunting the last seen spot until the hunt timer runs out.
        }
      }
      if (guard.detection >= DETECTION.suspiciousAt) hunted = true;
      if (guard.detection > maxDetection) maxDetection = guard.detection;
      updateGuard(guard, dt);
    }
    state.maxDetection = maxDetection;
    state.hunted = hunted;

    if (events & EVENT_CAUGHT) {
      state.caughtCount += 1;
      state.lives -= 1;
      if (state.lives <= 0) {
        events |= EVENT_OVER;
        return events;
      }
      loadLevel(state.levelIndex);
      return events;
    }

    // --- shards ---
    for (const shard of shards) {
      if (shard.taken) continue;
      if (Math.hypot(player.x - shard.x, player.y - shard.y) < player.radius + 16) {
        shard.taken = true;
        state.shardsGot += 1;
        state.score += SHARD_POINTS;
        events |= EVENT_SHARD;
      }
    }

    // --- exit ---
    const exit = state.level.exit;
    if (pointInRect(player.x, player.y, exit)) {
      const timeBonus = Math.max(0, TIME_BONUS_BASE - Math.floor(state.levelElapsed) * TIME_BONUS_PER_SECOND);
      state.score += LEVEL_BONUS + timeBonus;
      if (state.levelIndex + 1 >= LEVELS.length) {
        events |= EVENT_WIN;
      } else {
        events |= EVENT_LEVEL;
      }
    }

    return events;
  }

  /** Advance to the next level after a level-complete; keeps score and lives. */
  function nextLevel() {
    loadLevel(state.levelIndex + 1);
  }

  reset();
  return { state, reset, step, nextLevel, loadLevel };
}

// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Everything is drawn in code: checkerboard floor,
// walls with lit tops, leafy bushes, glowing exit, diamond shards, hooded player,
// guards with translucent vision cones, and the HUD. Text that holds a number is
// rebuilt only when the number changes, so a frame allocates nothing.
import { FIELD, FONT, LIVES, PALETTE, VISION } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL = 'level';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 140, line: 34, bottom: 76 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('Level ');
  const shardLabel = cachedLabel('');
  const timeLabel = cachedLabel('');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawFloor() {
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Subtle checkerboard so movement reads clearly.
    context.fillStyle = PALETTE.floorAlt;
    const tile = 80;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        if ((tx + ty) % 2 === 0) context.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
  }

  function drawBushes(state) {
    for (const bush of state.level.bushes) {
      context.fillStyle = PALETTE.bush;
      context.beginPath();
      context.arc(bush.x, bush.y, bush.r, 0, Math.PI * 2);
      context.fill();
      // Leafy blobs, placed deterministically from the bush position.
      context.fillStyle = PALETTE.bushLeaf;
      for (let i = 0; i < 7; i += 1) {
        const a = (i * 2.39996) % (Math.PI * 2);
        const d = bush.r * 0.55;
        context.beginPath();
        context.arc(bush.x + Math.cos(a) * d, bush.y + Math.sin(a) * d, bush.r * 0.32, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawWalls(state) {
    for (const wall of state.level.walls) {
      context.fillStyle = PALETTE.wall;
      context.fillRect(wall.x, wall.y, wall.w, wall.h);
      context.fillStyle = PALETTE.wallTop;
      context.fillRect(wall.x, wall.y, wall.w, 6);
    }
  }

  function drawExit(state) {
    const exit = state.level.exit;
    const pulse = 0.5 + 0.5 * Math.sin(state.elapsed * 3);
    context.fillStyle = PALETTE.exit;
    context.fillRect(exit.x, exit.y, exit.w, exit.h);
    context.strokeStyle = PALETTE.exitGlow;
    context.lineWidth = 3 + pulse * 2;
    context.strokeRect(exit.x + 3, exit.y + 3, exit.w - 6, exit.h - 6);
    text('EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 + 7, 18, '#06281a', 'center');
  }

  function drawShards(state) {
    for (const shard of state.shards) {
      if (shard.taken) continue;
      const bob = Math.sin(state.elapsed * 4 + shard.x) * 3;
      const x = shard.x;
      const y = shard.y + bob;
      context.fillStyle = PALETTE.shard;
      context.beginPath();
      context.moveTo(x, y - 13);
      context.lineTo(x + 9, y);
      context.lineTo(x, y + 13);
      context.lineTo(x - 9, y);
      context.closePath();
      context.fill();
      context.fillStyle = '#fff3c4';
      context.beginPath();
      context.moveTo(x, y - 7);
      context.lineTo(x + 4, y);
      context.lineTo(x, y + 7);
      context.lineTo(x - 4, y);
      context.closePath();
      context.fill();
    }
  }

  function drawCones(state) {
    for (const guard of state.guards) {
      const range = state.level.visionRange;
      const alert = guard.detection >= 35;
      context.fillStyle = alert ? PALETTE.coneAlert : PALETTE.coneCalm;
      context.beginPath();
      context.moveTo(guard.x, guard.y);
      context.arc(guard.x, guard.y, range, guard.angle - VISION.halfAngle, guard.angle + VISION.halfAngle);
      context.closePath();
      context.fill();
    }
  }

  function drawGuard(guard) {
    // Body: red cloak with a lantern dot showing where it faces.
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffd9d6';
    context.beginPath();
    context.arc(guard.x + Math.cos(guard.angle) * 8, guard.y + Math.sin(guard.angle) * 8, 4, 0, Math.PI * 2);
    context.fill();
    // Detection ring above the guard while it is noticing you.
    if (guard.detection > 2) {
      const frac = guard.detection / 100;
      context.strokeStyle = frac >= 0.35 ? PALETTE.danger : PALETTE.guardCalm;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(guard.x, guard.y - guard.radius - 12, 9, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
      context.stroke();
      if (frac >= 0.35) {
        context.fillStyle = PALETTE.danger;
        text('!', guard.x, guard.y - guard.radius - 26, 22, PALETTE.danger, 'center');
      }
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    // A hidden player is drawn half-faded, sunk into the bush.
    context.globalAlpha = player.hidden ? 0.55 : 1;
    context.fillStyle = PALETTE.playerCloak;
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    context.fill();
    // A pale ring so the dark cloak still reads against the dark floor.
    context.strokeStyle = PALETTE.player;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    context.stroke();
    // Hood point in the facing direction, and a pale face dot.
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.arc(
      player.x + Math.cos(player.angle) * 7,
      player.y + Math.sin(player.angle) * 7,
      5, 0, Math.PI * 2,
    );
    context.fill();
    context.globalAlpha = 1;
    if (player.sneaking) {
      text('sneaking', player.x, player.y - player.radius - 8, 13, PALETTE.muted, 'center');
    }
  }

  function drawClickTarget(target) {
    if (!target) return;
    context.strokeStyle = 'rgba(238, 241, 245, 0.7)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(target.x, target.y, 10, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(target.x - 14, target.y);
    context.lineTo(target.x + 14, target.y);
    context.moveTo(target.x, target.y - 14);
    context.lineTo(target.x, target.y + 14);
    context.stroke();
  }

  function drawField(state, clickTarget) {
    drawFloor();
    drawBushes(state);
    drawExit(state);
    drawShards(state);
    drawCones(state);
    drawWalls(state);
    for (const guard of state.guards) drawGuard(guard);
    drawPlayer(state);
    drawClickTarget(clickTarget);
  }

  function formatTime(seconds) {
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 26, PALETTE.text, 'left');
    text(levelLabel(state.levelIndex + 1), FIELD.width / 2 - 130, 18, 26, PALETTE.text, 'center');
    text(state.level.name, FIELD.width / 2 + 10, 18, 26, PALETTE.muted, 'center');
    text(timeLabel(formatTime(state.levelElapsed)), FIELD.width - 210, 18, 26, PALETTE.text, 'right');
    text(shardLabel(`◆ ${state.shardsGot}/${state.shardsTotal}`), FIELD.width - 120, 18, 26, PALETTE.gold, 'right');
    // Lives as small cloaks top-left under the score.
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.player : '#2a3040';
      context.beginPath();
      context.arc(36 + life * 28, 66, 9, 0, Math.PI * 2);
      context.fill();
    }
    // Detection eye, bottom centre: fills red as any guard notices you.
    // (Bottom, so it never overlaps a shard or the level title up top.)
    const d = state.maxDetection;
    const ex = FIELD.width / 2 - 90;
    const ey = FIELD.height - 30;
    text(d >= 35 ? 'SPOTTED — BREAK LINE OF SIGHT!' : 'unseen', FIELD.width / 2, ey - 22, 15, d >= 35 ? PALETTE.danger : PALETTE.muted, 'center');
    context.fillStyle = '#232b3b';
    context.fillRect(ex, ey, 180, 12);
    context.fillStyle = d >= 35 ? PALETTE.danger : PALETTE.guardCalm;
    context.fillRect(ex, ey, 180 * (d / 100), 12);
    context.strokeStyle = '#3a4358';
    context.lineWidth = 1;
    context.strokeRect(ex, ey, 180, 12);
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = '#2c3547';
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.gold, 'center');
  }

  const TITLE_LINES = [
    'Slip past the guards. Reach the glowing exit unseen.',
    'Move: WASD / arrows — or click anywhere to walk there.',
    'Hold Shift to sneak (slower, harder to spot).',
    'Hide in bushes. Walls block sight. Grab ◆ shards for points.',
    'If a guard’s eye fills up, you are caught.',
    '',
  ];
  const PAUSED_LINES = ['The guards will wait for you.'];
  const LEVEL_LINES = ['', ''];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, clickTarget) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, clickTarget);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[5] = bestLabel(best);
      drawPanel('SHADOW VEIL', TITLE_LINES, 'Press Space or click to begin');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_LEVEL) {
      LEVEL_LINES[0] = `${state.level.name} cleared!`;
      LEVEL_LINES[1] = finalLabel(state.score);
      drawPanel('Level clear', LEVEL_LINES, 'Press Space or click for the next level');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Caught!', OVER_LINES, 'Press Space or click to try again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = bestLabel(best);
      drawPanel('You slipped away!', WIN_LINES, 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** Convert client (CSS) pixels to field coordinates. */
    screenToField(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const px = (clientX - rect.left) * ratio;
      const py = (clientY - rect.top) * ratio;
      return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
    },
  };
}

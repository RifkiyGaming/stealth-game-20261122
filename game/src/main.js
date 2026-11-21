// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between screens: title, play, paused, level-clear, caught (game over) and victory.
//
// ?seed=N fixes nothing random (levels are hand-built) but is accepted for the shot scenes.
// ?shot=start|play|stealth|win (with &seed=N) stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, PLAYER, STEP } from './config.js';
import { createWorld, EVENT_CAUGHT, EVENT_LEVEL, EVENT_OVER, EVENT_SHARD, EVENT_SPOTTED, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_LEVEL, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld();
const renderer = createRenderer(canvas);
const sound = createSound();
// Debug/test handle: lets a play-test read positions, detection and lives.
window.__veil = world;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let clickTarget = null;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each catch.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    clickTarget = null;
    accumulator = 0;
    screen = SCREEN_PLAY;
    sound.unlock();
    announce(`Playing level 1, ${world.state.level.name}. Reach the exit unseen.`);
  }

  function finishRun(win) {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    screen = win ? SCREEN_WIN : SCREEN_OVER;
    announce(win
      ? `You slipped away! Final score ${world.state.score}. Best ${best}.`
      : `Caught. Score ${world.state.score}. Best ${best}.`);
  }

  /** Keyboard direction, or a direction toward the click-to-move target. */
  function moveDirection() {
    const keys = input.keys();
    if (keys.x !== 0 || keys.y !== 0) {
      clickTarget = null;
      return keys;
    }
    const click = input.takeClick();
    if (click) {
      const field = renderer.screenToField(click.clientX, click.clientY);
      clickTarget = { x: Math.max(0, Math.min(FIELD.width, field.x)), y: Math.max(0, Math.min(FIELD.height, field.y)) };
    }
    if (clickTarget) {
      const dx = clickTarget.x - world.state.player.x;
      const dy = clickTarget.y - world.state.player.y;
      if (Math.hypot(dx, dy) < 8) {
        clickTarget = null;
        return { x: 0, y: 0 };
      }
      return { x: dx, y: dy };
    }
    return { x: 0, y: 0 };
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) {
      sound.unlock();
      sound.click();
      startGame();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_OVER) {
      sound.click();
      startGame();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_WIN) {
      sound.click();
      startGame();
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_LEVEL) {
      sound.click();
      world.nextLevel();
      clickTarget = null;
      screen = SCREEN_PLAY;
      announce(`Level ${world.state.levelIndex + 1}, ${world.state.level.name}.`);
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, false, true);
      return;
    }
    const events = world.step(STEP, moveDirection(), input.isSneaking(), false);
    if (events & EVENT_SHARD) {
      sound.pickup();
      announce(`Shard collected. Score ${world.state.score}.`);
    }
    if (events & EVENT_SPOTTED) {
      sound.spotted();
      announce('A guard spotted you! Break line of sight!');
    }
    if (events & EVENT_CAUGHT) {
      sound.caught();
      if (events & EVENT_OVER) finishRun(false);
      else announce(`Caught! ${world.state.lives} ${world.state.lives === 1 ? 'life' : 'lives'} left. Back to the start of this level.`);
    } else if (events & EVENT_LEVEL) {
      sound.level();
      screen = SCREEN_LEVEL;
      announce(`${world.state.level.name} cleared. Score ${world.state.score}.`);
    } else if (events & EVENT_WIN) {
      sound.win();
      finishRun(true);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, screen === SCREEN_PLAY ? clickTarget : null);
  }

  // Leaving the tab pauses a running game rather than letting guards spot you unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Shadow Veil. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

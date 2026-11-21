// The screenshot scenes behind ?shot=start|play|stealth|win. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// scripted path (or, for the stealth scene, staged by hand: the player hidden in a
// bush while a guard's eye is half full), so the frame is what a real game looks
// like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_LEVEL, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 6;
const LIVE_SECONDS = 2;

/** Scripted movement for the play scene: right along the bottom, up into open
 *  floor, then stand still (ends near 595, 325, clear of walls). */
function playMove(elapsed) {
  if (elapsed < 2.5) return { x: 1, y: 0 };
  if (elapsed < 4.0) return { x: 0, y: -1 };
  return { x: 0, y: 0 };
}

/**
 * Set `world` to the named scene (start, play, stealth or win; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'win') {
    world.loadLevel(2);
    world.state.score = 1840;
    // Park the player in open floor at the bottom, clear of the lives HUD.
    world.state.player.x = 640;
    world.state.player.y = 600;
    return { screen: SCREEN_WIN, best: 1840 };
  }
  if (name === 'stealth') {
    world.loadLevel(1);
    const state = world.state;
    // The player crouches in a courtyard bush while a guard closes in, half-suspicious.
    state.player.x = 950;
    state.player.y = 300;
    const guard = state.guards[1];
    guard.x = 960;
    guard.y = 430;
    guard.angle = Math.atan2(state.player.y - guard.y, state.player.x - guard.x);
    guard.state = 'suspicious';
    guard.lastSeen.x = state.player.x;
    guard.lastSeen.y = state.player.y;
    // Step first (the guard creeps toward the bush), then set the detection:
    // harmless steps drain detection, so setting it after keeps the half-full eye.
    for (let index = 0; index < 30; index += 1) world.step(STEP, { x: 0, y: 0 }, true, true);
    guard.detection = 58;
    state.maxDetection = 58;
    state.hunted = true;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'play') {
    let elapsed = 0;
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      world.step(STEP, playMove(elapsed), false, true);
      elapsed += STEP;
    }
    // A couple of live seconds standing in open floor, so a guard may start noticing.
    for (let index = 0; index < LIVE_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, false);
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // start (default): guards patrol behind the title panel.
  for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { x: 0, y: 0 }, false, true);
  return { screen: SCREEN_TITLE, best: 0 };
}

// Keep the level-clear screen reachable for a screenshot too.
export { SCREEN_LEVEL };

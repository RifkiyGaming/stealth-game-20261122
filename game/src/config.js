// Shadow Veil — every tuning number, colour and level layout in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  speed: 210,
  sneakSpeed: 115,
};

export const LIVES = 3;

export const GUARD = {
  radius: 14,
  patrolSpeed: 70,
  suspiciousSpeed: 125,
  pauseAtWaypoint: 1.4,
  /** Seconds a guard keeps hunting the last seen spot before giving up. */
  huntTime: 3.5,
};

/** Vision cone: how far a guard sees and how wide the cone is (half-angle, radians). */
export const VISION = { range: 230, halfAngle: 0.62 };

/** Detection: 0..100. Fills while the player is seen, drains while hidden. */
export const DETECTION = {
  /** Base fill per second at point-blank range, before distance/sneak modifiers. */
  baseRate: 58,
  /** Extra multiplier when the player is very close to the guard. */
  closeMultiplier: 1.8,
  closeDistance: 75,
  /** Sneaking roughly halves how fast a guard notices you. */
  sneakMultiplier: 0.45,
  drainRate: 32,
  /** Above this the guard gets suspicious and hunts your last seen spot. */
  suspiciousAt: 35,
};

export const SHARD_POINTS = 100;
export const LEVEL_BONUS = 400;
/** Time bonus on finishing a level: 300 minus 5 per second spent, never below 0. */
export const TIME_BONUS_BASE = 300;
export const TIME_BONUS_PER_SECOND = 5;

/**
 * The three levels. Walls block movement and sight; bushes hide the player
 * (a guard cannot see you inside one unless it is almost on top of you);
 * guards walk their waypoints; shards are optional pickups; reach the exit.
 */
export const LEVELS = [
  {
    name: 'Moonlit Garden',
    hint: 'Two guards patrol the garden. Slip past them and reach the glowing exit.',
    start: { x: 70, y: 640 },
    exit: { x: 1170, y: 40, w: 70, h: 70 },
    guardSpeed: 70,
    visionRange: 220,
    detectionRate: 55,
    walls: [
      { x: 300, y: 120, w: 40, h: 300 },
      { x: 300, y: 120, w: 260, h: 40 },
      { x: 640, y: 300, w: 40, h: 300 },
      { x: 640, y: 300, w: 260, h: 40 },
      { x: 940, y: 120, w: 40, h: 220 },
      { x: 180, y: 520, w: 220, h: 40 },
    ],
    bushes: [
      { x: 180, y: 180, r: 55 },
      { x: 520, y: 560, r: 55 },
      { x: 900, y: 480, r: 60 },
      { x: 1120, y: 220, r: 50 },
    ],
    guards: [
      { waypoints: [{ x: 480, y: 200 }, { x: 480, y: 520 }] },
      { waypoints: [{ x: 820, y: 420 }, { x: 1120, y: 420 }, { x: 1120, y: 120 }] },
    ],
    shards: [
      { x: 380, y: 90 },
      { x: 760, y: 620 },
      { x: 1080, y: 600 },
    ],
  },
  {
    name: 'The Courtyard',
    hint: 'Three guards now, and longer sightlines. Bushes are your best friends.',
    start: { x: 70, y: 640 },
    exit: { x: 1180, y: 30, w: 70, h: 70 },
    guardSpeed: 80,
    visionRange: 240,
    detectionRate: 60,
    walls: [
      { x: 220, y: 80, w: 40, h: 240 },
      { x: 220, y: 80, w: 300, h: 40 },
      { x: 520, y: 200, w: 40, h: 320 },
      { x: 520, y: 200, w: 280, h: 40 },
      { x: 800, y: 420, w: 40, h: 220 },
      { x: 800, y: 420, w: 240, h: 40 },
      { x: 1040, y: 120, w: 40, h: 240 },
      { x: 120, y: 480, w: 260, h: 40 },
      { x: 640, y: 560, w: 200, h: 40 },
    ],
    bushes: [
      { x: 150, y: 200, r: 55 },
      { x: 420, y: 600, r: 55 },
      { x: 700, y: 120, r: 55 },
      { x: 950, y: 300, r: 55 },
      { x: 1150, y: 560, r: 55 },
    ],
    guards: [
      { waypoints: [{ x: 400, y: 300 }, { x: 400, y: 620 }] },
      { waypoints: [{ x: 660, y: 120 }, { x: 960, y: 120 }, { x: 960, y: 360 }] },
      { waypoints: [{ x: 1150, y: 500 }, { x: 900, y: 620 }] },
    ],
    shards: [
      { x: 300, y: 600 },
      { x: 600, y: 90 },
      { x: 880, y: 540 },
      { x: 1180, y: 200 },
    ],
  },
  {
    name: 'The Vault',
    hint: 'Four guards guard the vault. Stay low, stay dark, and do not rush.',
    start: { x: 70, y: 70 },
    exit: { x: 1180, y: 620, w: 70, h: 70 },
    guardSpeed: 90,
    visionRange: 260,
    detectionRate: 65,
    walls: [
      { x: 200, y: 120, w: 40, h: 220 },
      { x: 200, y: 120, w: 240, h: 40 },
      { x: 440, y: 300, w: 40, h: 280 },
      { x: 440, y: 300, w: 240, h: 40 },
      { x: 680, y: 120, w: 40, h: 220 },
      { x: 680, y: 120, w: 240, h: 40 },
      { x: 920, y: 380, w: 140, h: 40 },
      { x: 920, y: 380, w: 40, h: 240 },
      { x: 180, y: 520, w: 220, h: 40 },
      { x: 620, y: 520, w: 220, h: 40 },
    ],
    bushes: [
      { x: 120, y: 300, r: 55 },
      { x: 360, y: 640, r: 55 },
      { x: 560, y: 180, r: 55 },
      { x: 820, y: 620, r: 55 },
      { x: 1080, y: 220, r: 55 },
      { x: 1180, y: 460, r: 50 },
    ],
    guards: [
      { waypoints: [{ x: 320, y: 220 }, { x: 320, y: 480 }] },
      { waypoints: [{ x: 560, y: 420 }, { x: 860, y: 420 }, { x: 860, y: 620 }] },
      { waypoints: [{ x: 1120, y: 220 }, { x: 1120, y: 480 }] },
      { waypoints: [{ x: 700, y: 640 }, { x: 1100, y: 640 }] },
    ],
    shards: [
      { x: 300, y: 640 },
      { x: 520, y: 90 },
      { x: 760, y: 300 },
      { x: 1000, y: 120 },
      { x: 1180, y: 300 },
    ],
  },
];

export const PALETTE = {
  backdrop: '#0a0e14',
  floor: '#141a24',
  floorAlt: '#171e2b',
  wall: '#3a4358',
  wallTop: '#4a5570',
  bush: '#1e4d2e',
  bushLeaf: '#2a6b3f',
  exit: '#39d98a',
  exitGlow: '#7dffb0',
  shard: '#ffd166',
  player: '#8ecae6',
  playerCloak: '#023047',
  guard: '#e5534b',
  guardCalm: '#f4a259',
  coneCalm: 'rgba(244, 162, 89, 0.20)',
  coneAlert: 'rgba(229, 83, 75, 0.34)',
  panel: '#1a2130',
  text: '#eef1f5',
  muted: '#9aa5b8',
  danger: '#ff5d5d',
  gold: '#ffd166',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'shadow-veil.best';

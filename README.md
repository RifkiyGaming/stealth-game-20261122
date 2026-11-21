# Shadow Veil

[![Bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/RifkiyGaming/stealth-game-20261122/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/RifkiyGaming/stealth-game-20261122/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

An original top-down stealth game for the
[Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759)
bounty. You are a lone infiltrator in a hooded cloak. Slip past the guards,
hide in the bushes, grab the data shards, and reach the glowing green exit —
unseen.

## How to play

- **Goal:** reach the glowing EXIT on each of the 3 levels without being caught.
- **Guards** patrol fixed routes and sweep the floor with vision cones. If you
  stand in a cone with a clear line of sight, the guard's detection eye fills
  up — faster the closer you are. When it fills completely, you are caught:
  you lose a life and restart the level. Three lives, then the run is over.
- **Break line of sight** to make detection drain again. A guard that grew
  suspicious hunts your last seen spot for a few seconds, then returns to its
  patrol.
- **Walls** block both movement and sight — use them as cover.
- **Bushes** hide you completely: a guard cannot see you inside one unless it
  is almost on top of you. Your cloak fades while you are hidden.
- **Sneaking** (hold Shift) makes you slower but roughly halves how fast a
  guard notices you.
- **Data shards (◆)** are optional pickups worth 100 points each. Finishing a
  level earns a 400-point bonus plus a time bonus (faster is worth more).

The three levels — *Moonlit Garden*, *The Courtyard*, and *The Vault* — add
more guards, longer sightlines and tighter cover as you go. The timer, shard
count, lives and the detection eye are always on screen.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse click | Click-to-move (walk to that spot) |
| Hold Shift | Sneak (slower, harder to spot) |
| Space / Enter / click | Start, continue to the next level, play again |
| P / Esc | Pause / resume |
| M | Mute / unmute sound |

## Sound and art

All art is drawn in code on a canvas — no image files, no copied art. All
sound effects (pickup blip, spotted sting, caught buzz, level chime, victory
arpeggio) are synthesized live with WebAudio; there are no audio files and no
network requests. The game runs fully offline from static files.

## Run it

```sh
node serve.ts        # serves game/ at http://localhost:8080
```

Open the page, press Space, and stay out of the light.

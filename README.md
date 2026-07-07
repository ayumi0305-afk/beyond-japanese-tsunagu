# つなぐ TSUNAGU

The digital home of the [Beyond Japanese](https://beyondjapanese.com) community — a warm
pixel-art study room where students visibly study together, stay close to their sensei
between lessons, and build a lifelong relationship with Japan.

Not a language-learning app. A place.

## Phase 1 (this build)

The Study Room with the complete daily ritual, single-player with simulated classmates:

- **Arrive** — greeted by name and season; sensei welcomes you from her counter
- **Sit down** — tap a free cushion, say what you'll study and for how long (that *is* checking in)
- **Study together** — classmates at the table with soft intention bubbles; those who came
  earlier leave a still-steaming cup at their place
- **Quiet encouragement** — tap a classmate to send one 🌸 (no likes, no counts)
- **Stand up** — お疲れさまでした. The day is complete. Nothing left to scroll.

Plus the living-room layer: a wandering cat, steam, lantern glow after real-JST dusk.

## Run

```bash
npm install
npm run dev      # http://localhost:5173 — best viewed in a phone-sized viewport
npm run build
```

## Architecture

World state lives outside React in one mutable `World` class, drawn imperatively on a
canvas at integer pixel zoom (crisp pixels, no per-frame React renders). React renders
only the whisper-quiet chrome (check-in sheet, session pill, お疲れさま).

```
src/world/
  loop.ts       rAF game loop (update/render, clamped dt)
  types.ts      tiles, directions, person/world types
  sprites.ts    placeholder pixel art generated in code + per-zoom raster cache
  pathfind.ts   BFS on the 4-connected tile grid
  scene.ts      layout JSON → tile map / blocked set / seats / furniture drawables
  people.ts     person FSM: idle / walk / sit, gentle wandering
  ambient.ts    the cat, cup steam, real-JST day/evening light
  render.ts     one z-sorted pass + bubbles/labels overlay
  camera.ts     touch-first: tap = act, drag = pan, pinch/wheel = zoom
  world.ts      orchestrator: ritual, presence, stamps, sim events
src/data/
  studyRoom.ts  the room as data (tiles, furniture, seats, lights)
  community.ts  simulated classmates (phase 2: replaced by server presence events)
src/ui/
  WorldCanvas.tsx  canvas host; App.tsx + index.css are the chrome
```

**Phase 2** swaps `src/data/community.ts` for a small presence server (WebSocket
broadcast of coarse facts — checked in / checked out / stamp — each client animates
locally). The `World` mutation API is already shaped for it.

Placeholder art is generated in code; commissioned pixel art will replace the generators
without touching the cache or draw path.

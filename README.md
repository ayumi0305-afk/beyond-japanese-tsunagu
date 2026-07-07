# つなぐ TSUNAGU

The digital home of the [Beyond Japanese](https://beyondjapanese.com) community — a warm
pixel-art study room where students visibly study together, stay close to their sensei
between lessons, and build a lifelong relationship with Japan.

Not a language-learning app. A place.

## This build — the living campus

**The campus is the home screen. Buildings are the navigation. The world is the interface.**

You arrive at the bottom of the campus path. Every path leads to the Study Room's door;
the café and library flank it; the Japan Journal wall stands in its plaza. Walking through
a door fades you into that building — there are no pages.

- **自習室 Study Room** — the heart. Tap a free cushion, say what you'll study and for how
  long (that *is* checking in), study beside classmates with soft intention bubbles, send
  one quiet 🌸, stand up to お疲れさまでした. Its campus sign shows live occupancy
  (「2人が べんきょう中」).
- **カフェ Café** — sensei's place: her daily words, the teapot, the cushion corner.
- **日本の思い出 Journal wall** — walk up to it and it opens: structured postcards
  (使った日本語・聞いた日本語・新しい言葉・わからなかったこと + sensei's replies) and the
  Japan map with the community's pins.
- **としょかん Library** — standing, visible, honestly 準備中.

The living layer: classmates arriving and leaving warm cups behind, a strolling student,
the campus cat, steam, fireflies and lantern glow after real-JST dusk, and misty rooftops
past the tree line — the world is larger than what you can see.

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
  types.ts      tiles, portals, interactables, person/world types
  sprites.ts    placeholder pixel art generated in code + per-zoom raster cache
  pathfind.ts   BFS on the 4-connected tile grid
  scene.ts      layout JSON → tile map / blocked set / seats / portals / drawables
  people.ts     person FSM: idle / walk / sit, gentle wandering
  ambient.ts    the cat, cup steam, real-JST day/evening light
  render.ts     one z-sorted pass + bubbles/signage/mist/transition overlay
  camera.ts     touch-first: tap = act, drag = pan, pinch/wheel = zoom
  world.ts      orchestrator: scenes, door transitions, ritual, presence, stamps
src/data/
  campus.ts     the campus — the home of TSUNAGU (paths, buildings, plaza, pond)
  studyRoom.ts  the Study Room interior
  cafe.ts       the café interior (sensei's place)
  community.ts  simulated classmates (phase 2: replaced by server presence events)
src/ui/
  WorldCanvas.tsx  canvas host · JournalPanel.tsx · App.tsx + index.css chrome
```

Doors are portal tiles: stepping on one fades you into the target scene. Pathfinding
treats doorways as destinations only — never as shortcuts — so you enter a building
by *choosing* its door.

**Phase 2** swaps `src/data/community.ts` for a small presence server (WebSocket
broadcast of coarse facts — checked in / checked out / stamp — each client animates
locally). The `World` mutation API is already shaped for it.

Placeholder art is generated in code; commissioned pixel art will replace the generators
without touching the cache or draw path.

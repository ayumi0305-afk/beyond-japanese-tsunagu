/** Ambient life: the cat, steam from cups, and the day/evening light of the room. */
import { findPath } from './pathfind';
import type { Scene } from './scene';
import { makeCatFrames } from './sprites';
import type { SpriteData, SteamPuff, TileType } from './types';
import { TILE_SIZE } from './types';

// ── Cat ─────────────────────────────────────────────────────────

const CAT_FRAMES = makeCatFrames();

export interface Cat {
  x: number;
  y: number;
  tileCol: number;
  tileRow: number;
  path: Array<{ col: number; row: number }>;
  moveProgress: number;
  napping: boolean;
  timer: number;
  frame: number;
  frameTimer: number;
  flip: boolean;
}

export function createCat(col: number, row: number): Cat {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    napping: true,
    timer: 6 + Math.random() * 8,
    frame: 0,
    frameTimer: 0,
    flip: false,
  };
}

const CAT_SPEED = 30;

export function updateCat(cat: Cat, dt: number, scene: Scene, tileMap: TileType[][]): void {
  cat.timer -= dt;
  cat.frameTimer += dt;
  if (cat.frameTimer > 0.25) {
    cat.frameTimer = 0;
    cat.frame = (cat.frame + 1) % 2;
  }

  if (cat.path.length === 0) {
    if (cat.timer <= 0) {
      if (cat.napping) {
        // wake up, stroll somewhere nearby
        const spots = scene.walkable;
        for (let tries = 0; tries < 8; tries++) {
          const t = spots[Math.floor(Math.random() * spots.length)];
          if (Math.abs(t.col - cat.tileCol) + Math.abs(t.row - cat.tileRow) > 8) continue;
          const path = findPath(cat.tileCol, cat.tileRow, t.col, t.row, tileMap, scene.blocked);
          if (path.length > 0) {
            cat.path = path;
            cat.moveProgress = 0;
            cat.napping = false;
            break;
          }
        }
        cat.timer = 5 + Math.random() * 6;
      } else {
        cat.napping = true;
        cat.timer = 10 + Math.random() * 14;
      }
    }
    return;
  }

  const next = cat.path[0];
  cat.flip = next.col < cat.tileCol;
  cat.moveProgress += (CAT_SPEED / TILE_SIZE) * dt;
  const fx = cat.tileCol * TILE_SIZE + TILE_SIZE / 2;
  const fy = cat.tileRow * TILE_SIZE + TILE_SIZE;
  const tx = next.col * TILE_SIZE + TILE_SIZE / 2;
  const ty = next.row * TILE_SIZE + TILE_SIZE;
  const t = Math.min(cat.moveProgress, 1);
  cat.x = fx + (tx - fx) * t;
  cat.y = fy + (ty - fy) * t;
  if (cat.moveProgress >= 1) {
    cat.tileCol = next.col;
    cat.tileRow = next.row;
    cat.path.shift();
    cat.moveProgress = 0;
  }
}

export function catSprite(cat: Cat): { sprite: SpriteData; flip: boolean } {
  if (cat.napping && cat.path.length === 0) return { sprite: CAT_FRAMES.nap, flip: cat.flip };
  return { sprite: CAT_FRAMES.walk[cat.frame], flip: cat.flip };
}

// ── Steam ───────────────────────────────────────────────────────

export function updateSteam(
  puffs: SteamPuff[],
  dt: number,
  sources: Array<{ x: number; y: number; strength: number }>,
): void {
  for (const s of sources) {
    // spawn probabilistically based on warmth
    if (Math.random() < dt * 1.6 * s.strength) {
      puffs.push({
        x: s.x + (Math.random() * 4 - 2),
        y: s.y,
        t: 0,
        life: 1.4 + Math.random() * 0.8,
        drift: Math.random() * 10 - 5,
      });
    }
  }
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.t += dt;
    if (p.t >= p.life) puffs.splice(i, 1);
  }
}

// ── Time of day (real JST clock) ────────────────────────────────

export interface DayLight {
  /** 0..1 darkness of the room tint. */
  night: number;
  /** 0..1 warm dusk amount. */
  dusk: number;
  /** Whether lanterns/windows glow. */
  lamps: boolean;
  hourJST: number;
}

export function getDayLight(now = new Date()): DayLight {
  const hour =
    (now.getUTCHours() + 9 + now.getUTCMinutes() / 60) % 24; // JST
  let night = 0;
  let dusk = 0;
  if (hour >= 21 || hour < 5) night = 0.32;
  else if (hour >= 19) night = 0.22 + ((hour - 19) / 2) * 0.1;
  else if (hour >= 17) dusk = ((hour - 17) / 2) * 0.5;
  else if (hour < 7 && hour >= 5) night = 0.18 * (1 - (hour - 5) / 2);
  return { night, dusk, lamps: hour >= 17 || hour < 6, hourJST: hour };
}

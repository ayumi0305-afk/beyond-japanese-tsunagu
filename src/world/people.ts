/** Person finite-state machine: idle / walk / sit, with gentle wandering. */
import { findPath } from './pathfind';
import type { Scene } from './scene';
import type { Palette, Person, TileType } from './types';
import { Direction, PersonState, TILE_SIZE } from './types';

export const WALK_SPEED_PX_PER_SEC = 44;
const WALK_FRAME_SEC = 0.16;
const WANDER_PAUSE_MIN = 4;
const WANDER_PAUSE_MAX = 11;

function tileCenter(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE };
}

function dirBetween(fc: number, fr: number, tc: number, tr: number): Direction {
  const dc = tc - fc;
  const dr = tr - fr;
  if (dc > 0) return Direction.RIGHT;
  if (dc < 0) return Direction.LEFT;
  if (dr > 0) return Direction.DOWN;
  return Direction.UP;
}

export function createPerson(
  id: string,
  name: string,
  sceneId: string,
  kind: Person['kind'],
  palette: Palette,
  col: number,
  row: number,
): Person {
  const c = tileCenter(col, row);
  return {
    id,
    name,
    sceneId,
    kind,
    palette,
    state: PersonState.IDLE,
    dir: Direction.DOWN,
    x: c.x,
    y: c.y,
    tileCol: col,
    tileRow: row,
    path: [],
    moveProgress: 0,
    frame: 0,
    frameTimer: 0,
    wanderTimer: WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN),
    seatId: null,
    targetSeatId: null,
    intention: null,
    speech: null,
    speechTimer: 0,
    presence: 0,
    leaving: false,
  };
}

export function setPath(p: Person, path: Array<{ col: number; row: number }>): void {
  p.path = path;
  p.moveProgress = 0;
  p.state = PersonState.WALK;
  p.frame = 0;
  p.frameTimer = 0;
}

export interface PersonUpdateCtx {
  scene: Scene;
  tileMap: TileType[][];
  /** Blocked tiles including other people's occupied seats (excluding this person). */
  blockedFor: (p: Person) => Set<string>;
  /** Whether this person is allowed to wander when idle. */
  mayWander: (p: Person) => boolean;
  /** Called the moment a walk finishes at the person's target seat. */
  onSeated: (p: Person) => void;
}

export function updatePerson(p: Person, dt: number, ctx: PersonUpdateCtx): void {
  // presence fade
  if (p.leaving) {
    p.presence = Math.max(0, p.presence - dt / 0.5);
  } else if (p.presence < 1) {
    p.presence = Math.min(1, p.presence + dt / 0.6);
  }
  // speech countdown
  if (p.speech) {
    p.speechTimer -= dt;
    if (p.speechTimer <= 0) {
      p.speech = null;
      p.speechTimer = 0;
    }
  }

  p.frameTimer += dt;

  switch (p.state) {
    case PersonState.SIT: {
      p.frame = 0;
      break;
    }

    case PersonState.IDLE: {
      p.frame = 0;
      if (!ctx.mayWander(p)) break;
      p.wanderTimer -= dt;
      if (p.wanderTimer <= 0) {
        p.wanderTimer = WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN);
        const spots = ctx.scene.walkable;
        if (spots.length > 0) {
          const target = spots[Math.floor(Math.random() * spots.length)];
          // keep wanders short & nearby — a stroll, not a hike
          if (Math.abs(target.col - p.tileCol) + Math.abs(target.row - p.tileRow) > 6) break;
          const path = findPath(
            p.tileCol,
            p.tileRow,
            target.col,
            target.row,
            ctx.tileMap,
            ctx.blockedFor(p),
          );
          if (path.length > 0) setPath(p, path);
        }
      }
      break;
    }

    case PersonState.WALK: {
      if (p.frameTimer >= WALK_FRAME_SEC) {
        p.frameTimer -= WALK_FRAME_SEC;
        p.frame = (p.frame + 1) % 2;
      }

      if (p.path.length === 0) {
        const c = tileCenter(p.tileCol, p.tileRow);
        p.x = c.x;
        p.y = c.y;
        // Arrived — sit down if this walk was headed to a seat
        if (p.targetSeatId) {
          const seat = ctx.scene.seats.get(p.targetSeatId);
          if (seat && seat.col === p.tileCol && seat.row === p.tileRow) {
            p.state = PersonState.SIT;
            p.dir = seat.facing;
            p.seatId = seat.id;
            p.targetSeatId = null;
            seat.occupant = p.id;
            ctx.onSeated(p);
            break;
          }
          p.targetSeatId = null;
        }
        p.state = PersonState.IDLE;
        p.frame = 0;
        break;
      }

      const next = p.path[0];
      p.dir = dirBetween(p.tileCol, p.tileRow, next.col, next.row);
      p.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;
      const from = tileCenter(p.tileCol, p.tileRow);
      const to = tileCenter(next.col, next.row);
      const t = Math.min(p.moveProgress, 1);
      p.x = from.x + (to.x - from.x) * t;
      p.y = from.y + (to.y - from.y) * t;
      if (p.moveProgress >= 1) {
        p.tileCol = next.col;
        p.tileRow = next.row;
        p.x = to.x;
        p.y = to.y;
        p.path.shift();
        p.moveProgress = 0;
      }
      break;
    }
  }
}

/** Stand up from a seat (frees the seat; caller decides where to walk next). */
export function standUp(p: Person, scene: Scene): void {
  if (p.seatId) {
    const seat = scene.seats.get(p.seatId);
    if (seat && seat.occupant === p.id) seat.occupant = null;
  }
  p.seatId = null;
  p.state = PersonState.IDLE;
  p.dir = Direction.DOWN;
  p.frame = 0;
  p.wanderTimer = 3 + Math.random() * 4;
}

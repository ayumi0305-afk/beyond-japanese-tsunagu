/** Layout JSON → derived runtime scene state (tile map, blocked set, seats, drawable furniture). */
import { walkableTiles } from './pathfind';
import {
  makeBoard,
  makeBuilding,
  makeCounter,
  makeCushion,
  makeFlowers,
  makeJournalWall,
  makeLantern,
  makeMapBoard,
  makePlant,
  makeRooftop,
  makeShelf,
  makeTable,
  makeTree,
  makeWindow,
  C,
} from './sprites';
import type { FurnitureDef, Layout, SeatDef, SpriteData, TileType } from './types';
import { TILE_SIZE } from './types';

// ── Furniture catalog (placeholder sprites, generated once) ─────

const catalog: Record<string, FurnitureDef> = {
  table_big: { sprite: makeTable(6, 3), footprintW: 6, footprintH: 3 },
  counter: { sprite: makeCounter(4), footprintW: 4, footprintH: 1 },
  cushion: { sprite: makeCushion(C.cushion), footprintW: 1, footprintH: 1, walkable: true, zBias: -4 },
  cushion_shu: { sprite: makeCushion(C.cushionShu), footprintW: 1, footprintH: 1, walkable: true, zBias: -4 },
  cushion_indigo: { sprite: makeCushion(C.cushionIndigo), footprintW: 1, footprintH: 1, walkable: true, zBias: -4 },
  plant: { sprite: makePlant(), footprintW: 1, footprintH: 1 },
  shelf: { sprite: makeShelf(), footprintW: 2, footprintH: 1 },
  lantern: { sprite: makeLantern(), footprintW: 1, footprintH: 1 },
  // Wall-mounted items: no extra blocking (walls already block).
  window: { sprite: makeWindow(), footprintW: 2, footprintH: 1, walkable: true },
  board: { sprite: makeBoard(), footprintW: 3, footprintH: 1, walkable: true },
  // Campus
  building_study: { sprite: makeBuilding(10, 7, { doorCol: 4, big: true }), footprintW: 10, footprintH: 7 },
  building_cafe: { sprite: makeBuilding(7, 5, { doorCol: 3 }), footprintW: 7, footprintH: 5 },
  building_library: { sprite: makeBuilding(7, 5, { doorCol: 3 }), footprintW: 7, footprintH: 5 },
  tree: { sprite: makeTree(false), footprintW: 1, footprintH: 1 },
  tree_big: { sprite: makeTree(true), footprintW: 1, footprintH: 1 },
  rooftop: { sprite: makeRooftop(), footprintW: 3, footprintH: 1, walkable: true },
  journal_wall: { sprite: makeJournalWall(), footprintW: 6, footprintH: 2 },
  map_board: { sprite: makeMapBoard(), footprintW: 2, footprintH: 2 },
  flowers: { sprite: makeFlowers(), footprintW: 1, footprintH: 1, walkable: true, zBias: -8 },
  counter_small: { sprite: makeCounter(3), footprintW: 3, footprintH: 1 },
};

export function getFurnitureDef(type: string): FurnitureDef | undefined {
  return catalog[type];
}

export interface FurnitureInstance {
  sprite: SpriteData;
  /** Top-left draw position in world px. */
  x: number;
  y: number;
  /** Depth-sort key (bottom edge in world px). */
  zY: number;
}

export interface Seat extends SeatDef {
  /** Person id currently seated, or null. */
  occupant: string | null;
}

export class Scene {
  layout: Layout;
  tileMap: TileType[][];
  /** Tiles blocked by walls-adjacent furniture (static). */
  blocked: Set<string>;
  walkable: Array<{ col: number; row: number }>;
  furniture: FurnitureInstance[];
  seats: Map<string, Seat>;

  constructor(layout: Layout) {
    this.layout = layout;
    this.tileMap = [];
    for (let r = 0; r < layout.rows; r++) {
      const row: TileType[] = [];
      for (let c = 0; c < layout.cols; c++) {
        row.push(layout.tiles[r * layout.cols + c] as TileType);
      }
      this.tileMap.push(row);
    }

    this.blocked = new Set();
    this.furniture = [];
    for (const item of layout.furniture) {
      const def = catalog[item.type];
      if (!def) continue;
      const spriteH = def.sprite.length;
      const bottom = (item.row + def.footprintH) * TILE_SIZE;
      this.furniture.push({
        sprite: def.sprite,
        x: item.col * TILE_SIZE,
        y: bottom - spriteH,
        zY: bottom + (def.zBias ?? 0),
      });
      if (!def.walkable) {
        for (let dr = 0; dr < def.footprintH; dr++) {
          for (let dc = 0; dc < def.footprintW; dc++) {
            this.blocked.add(`${item.col + dc},${item.row + dr}`);
          }
        }
      }
    }

    this.seats = new Map();
    for (const s of layout.seats) {
      this.seats.set(s.id, { ...s, occupant: null });
    }

    this.walkable = walkableTiles(this.tileMap, this.blocked);
  }

  seatAt(col: number, row: number): Seat | null {
    for (const seat of this.seats.values()) {
      if (seat.col === col && seat.row === row) return seat;
    }
    return null;
  }
}

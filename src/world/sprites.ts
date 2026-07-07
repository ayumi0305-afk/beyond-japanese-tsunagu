/**
 * Placeholder pixel art, generated in code.
 * Every sprite is a SpriteData grid pre-rasterized per zoom level to an
 * offscreen canvas (imageSmoothing off), then drawImage'd — the pixel-crisp
 * fast path. Commissioned spritesheet PNGs will replace the generators later;
 * the cache and draw path stay the same.
 */
import type { Palette, SpriteData } from './types';
import { Direction } from './types';

// ── Grid helpers ────────────────────────────────────────────────

function blank(w: number, h: number): SpriteData {
  const g: string[][] = [];
  for (let y = 0; y < h; y++) g.push(new Array<string>(w).fill(''));
  return g;
}

function rect(g: SpriteData, x: number, y: number, w: number, h: number, color: string): void {
  for (let r = y; r < y + h; r++) {
    if (r < 0 || r >= g.length) continue;
    for (let c = x; c < x + w; c++) {
      if (c < 0 || c >= g[r].length) continue;
      g[r][c] = color;
    }
  }
}

function px(g: SpriteData, x: number, y: number, color: string): void {
  if (y >= 0 && y < g.length && x >= 0 && x < g[y].length) g[y][x] = color;
}

function flipH(g: SpriteData): SpriteData {
  return g.map((row) => [...row].reverse());
}

// ── Brand-derived world palette ─────────────────────────────────

export const C = {
  woodFloor: '#C9A87C',
  woodFloorDark: '#BE9C6F',
  woodFloorLine: '#B5946A',
  rug: '#8FA98E',
  rugDark: '#829C81',
  stone: '#D6C6A2',
  stoneDark: '#CBBA95',
  wall: '#8A6748',
  wallTop: '#6F5138',
  wallPlaster: '#F0E6D0',
  tableWood: '#B08D5F',
  tableWoodLight: '#C7A176',
  tableEdge: '#8F6F47',
  cushion: '#D9C6A8',
  cushionShu: '#CE7A62',
  cushionIndigo: '#4E6E8C',
  plantGreen: '#6E8F76',
  plantGreenLight: '#7FA085',
  pot: '#A9825C',
  lantern: '#F2C069',
  lanternPost: '#4A443A',
  window: '#DCE8E4',
  windowNight: '#33455C',
  windowFrame: '#7A5C3E',
  boardDark: '#3E4A44',
  chalk: '#E9EFE7',
  cup: '#FDF8EC',
  tea: '#B98A5A',
  counter: '#9A7350',
  cat: '#4A443A',
  catLight: '#5C554B',
} as const;

// ── Tiles ───────────────────────────────────────────────────────

function tileWood(alt: boolean): SpriteData {
  const g = blank(16, 16);
  rect(g, 0, 0, 16, 16, alt ? C.woodFloorDark : C.woodFloor);
  // plank seams
  for (const y of [3, 11]) rect(g, 0, y, 16, 1, C.woodFloorLine);
  px(g, alt ? 4 : 11, 7, C.woodFloorLine);
  return g;
}

function tileRug(): SpriteData {
  const g = blank(16, 16);
  rect(g, 0, 0, 16, 16, C.rug);
  for (let y = 1; y < 16; y += 4) px(g, (y * 3) % 16, y, C.rugDark);
  return g;
}

function tileStone(): SpriteData {
  const g = blank(16, 16);
  rect(g, 0, 0, 16, 16, C.stone);
  rect(g, 0, 7, 16, 1, C.stoneDark);
  px(g, 8, 3, C.stoneDark);
  px(g, 3, 12, C.stoneDark);
  return g;
}

/** Wall face — shown where the wall meets floor below (plaster + wood base). */
function tileWallFace(): SpriteData {
  const g = blank(16, 16);
  rect(g, 0, 0, 16, 16, C.wallPlaster);
  rect(g, 0, 10, 16, 6, C.wall);
  rect(g, 0, 10, 16, 1, C.wallTop);
  return g;
}

/** Wall top — solid dark cap for side/back wall runs. */
function tileWallTop(): SpriteData {
  const g = blank(16, 16);
  rect(g, 0, 0, 16, 16, C.wallTop);
  px(g, 5, 4, C.wall);
  px(g, 12, 11, C.wall);
  return g;
}

export const TILE_SPRITES: Record<number, SpriteData> = {
  1: tileWood(false),
  2: tileWood(true),
  3: tileRug(),
  4: tileStone(),
  9: tileWallFace(),
};

export const WALL_TOP_SPRITE: SpriteData = tileWallTop();

// ── Furniture ───────────────────────────────────────────────────

/** Big shared table spanning w×h tiles. */
export function makeTable(wTiles: number, hTiles: number): SpriteData {
  const w = wTiles * 16;
  const h = hTiles * 16;
  const g = blank(w, h);
  // top surface with rounded corners
  rect(g, 1, 0, w - 2, h - 4, C.tableWoodLight);
  rect(g, 2, 1, w - 4, h - 6, C.tableWoodLight);
  // edge highlight + darker rim
  rect(g, 1, 0, w - 2, 1, '#D4B187');
  rect(g, 1, h - 5, w - 2, 2, C.tableWood);
  // front face
  rect(g, 2, h - 4, w - 4, 4, C.tableEdge);
  // corner rounding (clear corners)
  for (const [cx, cy] of [
    [0, 0],
    [w - 1, 0],
  ] as const) {
    px(g, cx, cy, '');
  }
  // grain lines
  for (let i = 1; i < hTiles * 2; i++) {
    const y = Math.floor((i * (h - 6)) / (hTiles * 2));
    for (let x = 4; x < w - 4; x += 7) px(g, x + (i % 3), y, C.tableWood);
  }
  return g;
}

/** Floor cushion (zabuton). */
export function makeCushion(color: string): SpriteData {
  const g = blank(14, 10);
  rect(g, 1, 2, 12, 7, color);
  rect(g, 0, 3, 14, 5, color);
  rect(g, 1, 8, 12, 1, shade(color, -24));
  px(g, 2, 3, shade(color, 20));
  px(g, 11, 4, shade(color, 20));
  return g;
}

/** Potted plant, ~1 tile wide, 2 tiles tall. */
export function makePlant(): SpriteData {
  const g = blank(16, 30);
  // pot
  rect(g, 4, 22, 8, 7, C.pot);
  rect(g, 3, 22, 10, 2, shade(C.pot, -20));
  // leaves
  rect(g, 5, 6, 6, 16, C.plantGreen);
  rect(g, 2, 10, 5, 8, C.plantGreenLight);
  rect(g, 9, 8, 5, 9, C.plantGreenLight);
  rect(g, 6, 2, 4, 6, C.plantGreenLight);
  px(g, 4, 8, C.plantGreen);
  px(g, 12, 6, C.plantGreen);
  return g;
}

/** Wall window (sits on a wall tile row), 2 tiles wide. */
export function makeWindow(): SpriteData {
  const g = blank(32, 14);
  rect(g, 0, 0, 32, 14, C.windowFrame);
  rect(g, 2, 2, 13, 10, C.window);
  rect(g, 17, 2, 13, 10, C.window);
  // distant hill hint
  rect(g, 3, 8, 11, 3, '#C9D6C4');
  rect(g, 18, 9, 11, 2, '#C9D6C4');
  return g;
}

/** Chalkboard for sensei's counter area, 3 tiles wide. */
export function makeBoard(): SpriteData {
  const g = blank(48, 14);
  rect(g, 0, 0, 48, 14, C.windowFrame);
  rect(g, 2, 2, 44, 10, C.boardDark);
  // chalk squiggles
  rect(g, 5, 4, 16, 1, C.chalk);
  rect(g, 24, 4, 12, 1, '#C7D4C5');
  rect(g, 5, 7, 22, 1, '#B9C8B7');
  rect(g, 5, 10, 10, 1, '#B9C8B7');
  return g;
}

/** Sensei's counter, w tiles wide. */
export function makeCounter(wTiles: number): SpriteData {
  const w = wTiles * 16;
  const g = blank(w, 20);
  rect(g, 0, 0, w, 14, C.tableWoodLight);
  rect(g, 0, 12, w, 2, C.tableWood);
  rect(g, 0, 14, w, 6, C.counter);
  // teapot on the counter
  rect(g, 6, 3, 7, 5, '#7A8B8F');
  rect(g, 13, 4, 2, 2, '#7A8B8F');
  rect(g, 8, 1, 3, 2, '#7A8B8F');
  return g;
}

/** Paper lantern on a short post. */
export function makeLantern(): SpriteData {
  const g = blank(10, 26);
  rect(g, 4, 12, 2, 14, C.lanternPost);
  rect(g, 2, 2, 6, 10, C.lantern);
  rect(g, 1, 4, 8, 6, C.lantern);
  rect(g, 3, 0, 4, 2, C.lanternPost);
  rect(g, 2, 6, 1, 2, shade(C.lantern, 25));
  return g;
}

/** Low bookshelf, 2 tiles wide. */
export function makeShelf(): SpriteData {
  const g = blank(32, 26);
  rect(g, 0, 4, 32, 22, C.tableWood);
  rect(g, 1, 6, 30, 8, '#8F6F47');
  rect(g, 1, 16, 30, 8, '#8F6F47');
  const spineColors = ['#4E6E8C', '#CE7A62', '#6E8F76', '#8A5A72', '#B7AE9C'];
  for (let i = 0; i < 9; i++) {
    rect(g, 2 + i * 3, 7, 2, 7, spineColors[i % spineColors.length]);
  }
  for (let i = 0; i < 6; i++) {
    rect(g, 3 + i * 4, 17, 3, 7, spineColors[(i + 2) % spineColors.length]);
  }
  return g;
}

/** Tea cup, drawn on the table in front of a sitter. */
export function makeCup(): SpriteData {
  const g = blank(7, 6);
  rect(g, 1, 1, 5, 4, C.cup);
  rect(g, 2, 1, 3, 1, C.tea);
  rect(g, 1, 5, 5, 1, shade(C.cup, -30));
  return g;
}

// ── People ──────────────────────────────────────────────────────

export interface PersonFrames {
  /** [dir][frame 0..1] walking / standing (frame 1 = neutral stand). */
  walk: Record<Direction, [SpriteData, SpriteData]>;
  /** [dir] seated. */
  sit: Record<Direction, SpriteData>;
}

function personBase(pal: Palette, dir: Direction, legPhase: 0 | 1, seated: boolean): SpriteData {
  const g = blank(16, 24);
  const skin = pal.skin;
  const hair = pal.hair;
  const cloth = pal.cloth;
  const clothD = pal.clothDark;

  const bodyTop = seated ? 12 : 10;
  // legs (hidden when seated)
  if (!seated) {
    if (legPhase === 0) {
      rect(g, 5, 19, 2, 5, clothD);
      rect(g, 9, 19, 2, 4, clothD);
    } else {
      rect(g, 5, 19, 2, 4, clothD);
      rect(g, 9, 19, 2, 5, clothD);
    }
  }
  // body
  rect(g, 4, bodyTop, 8, seated ? 10 : 9, cloth);
  rect(g, 4, bodyTop + (seated ? 8 : 7), 8, 2, clothD);
  // arms
  if (dir === Direction.RIGHT) {
    rect(g, 11, bodyTop + 1, 2, 5, cloth);
  } else if (dir === Direction.LEFT) {
    rect(g, 3, bodyTop + 1, 2, 5, cloth);
  } else {
    rect(g, 3, bodyTop + 1, 2, 5, cloth);
    rect(g, 11, bodyTop + 1, 2, 5, cloth);
  }
  // head
  const headTop = seated ? 3 : 1;
  rect(g, 4, headTop, 8, 8, skin);
  // hair by direction
  if (dir === Direction.UP) {
    rect(g, 4, headTop, 8, 6, hair);
  } else {
    rect(g, 4, headTop, 8, 3, hair);
    rect(g, 4, headTop + 3, 1, 2, hair);
    rect(g, 11, headTop + 3, 1, 2, hair);
  }
  // face
  if (dir === Direction.DOWN) {
    px(g, 6, headTop + 5, '#3B332C');
    px(g, 9, headTop + 5, '#3B332C');
  } else if (dir === Direction.RIGHT) {
    px(g, 10, headTop + 5, '#3B332C');
    rect(g, 4, headTop, 5, 8, hair); // hair covers back of head
    rect(g, 4, headTop + 3, 8, 1, dir === Direction.RIGHT ? '' : hair);
    rect(g, 9, headTop + 4, 3, 4, skin);
    px(g, 10, headTop + 5, '#3B332C');
  }
  return g;
}

export function makePersonFrames(pal: Palette): PersonFrames {
  const down0 = personBase(pal, Direction.DOWN, 0, false);
  const down1 = personBase(pal, Direction.DOWN, 1, false);
  const up0 = personBase(pal, Direction.UP, 0, false);
  const up1 = personBase(pal, Direction.UP, 1, false);
  const right0 = personBase(pal, Direction.RIGHT, 0, false);
  const right1 = personBase(pal, Direction.RIGHT, 1, false);
  return {
    walk: {
      [Direction.DOWN]: [down0, down1],
      [Direction.UP]: [up0, up1],
      [Direction.RIGHT]: [right0, right1],
      [Direction.LEFT]: [flipH(right0), flipH(right1)],
    } as PersonFrames['walk'],
    sit: {
      [Direction.DOWN]: personBase(pal, Direction.DOWN, 0, true),
      [Direction.UP]: personBase(pal, Direction.UP, 0, true),
      [Direction.RIGHT]: personBase(pal, Direction.RIGHT, 0, true),
      [Direction.LEFT]: flipH(personBase(pal, Direction.RIGHT, 0, true)),
    } as PersonFrames['sit'],
  };
}

// ── Cat ─────────────────────────────────────────────────────────

export function makeCatFrames(): { walk: [SpriteData, SpriteData]; nap: SpriteData } {
  const f = (tailUp: boolean): SpriteData => {
    const g = blank(14, 10);
    rect(g, 2, 3, 9, 5, C.cat);
    rect(g, 9, 1, 4, 4, C.cat); // head
    px(g, 9, 0, C.cat); // ear
    px(g, 12, 0, C.cat); // ear
    px(g, 12, 2, '#F2C069'); // eye
    // legs
    rect(g, 3, 8, 1, 2, C.cat);
    rect(g, 6, 8, 1, 2, C.cat);
    rect(g, 9, 8, 1, 2, C.cat);
    // tail
    if (tailUp) {
      rect(g, 0, 1, 2, 4, C.catLight);
    } else {
      rect(g, 0, 4, 2, 3, C.catLight);
    }
    return g;
  };
  const nap = blank(12, 8);
  rect(nap, 1, 2, 10, 5, C.cat);
  rect(nap, 2, 1, 8, 6, C.cat);
  rect(nap, 8, 0, 3, 3, C.cat);
  px(nap, 8, 0, C.cat);
  rect(nap, 1, 5, 3, 2, C.catLight); // curled tail
  return { walk: [f(true), f(false)], nap };
}

// ── Utility ─────────────────────────────────────────────────────

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ── Raster cache ────────────────────────────────────────────────

const rasterCache = new Map<number, WeakMap<SpriteData, HTMLCanvasElement>>();

/** Rasterize a sprite at integer zoom to an offscreen canvas, cached. */
export function raster(sprite: SpriteData, zoom: number): HTMLCanvasElement {
  let byZoom = rasterCache.get(zoom);
  if (!byZoom) {
    byZoom = new WeakMap();
    rasterCache.set(zoom, byZoom);
  }
  const hit = byZoom.get(sprite);
  if (hit) return hit;

  const rows = sprite.length;
  const cols = sprite[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * zoom;
  canvas.height = rows * zoom;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = sprite[r][c];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(c * zoom, r * zoom, zoom, zoom);
    }
  }
  byZoom.set(sprite, canvas);
  return canvas;
}

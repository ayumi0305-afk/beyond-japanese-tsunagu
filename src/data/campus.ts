/**
 * The TSUNAGU campus — the home screen IS this place.
 * Buildings are the navigation: every path leads to the Study Room's door,
 * the café and library flank it, the Japan Journal wall stands in its plaza,
 * and the world visibly continues past the misty tree line.
 */
import type { Layout } from '../world/types';
import { TILE_SIZE, TileType } from '../world/types';

const COLS = 36;
const ROWS = 30;

function buildTiles(): number[] {
  const t = new Array<number>(COLS * ROWS).fill(TileType.GRASS);
  const set = (c: number, r: number, v: number) => {
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) t[r * COLS + c] = v;
  };
  const fill = (c0: number, r0: number, c1: number, r1: number, v: number) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set(c, r, v);
  };

  // grass variation (deterministic scatter)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r * 11 + c * 7) % 6 === 0) set(c, r, TileType.GRASS_ALT);
    }
  }

  // misty world-edge: the campus continues beyond these rows
  fill(0, 0, COLS - 1, 1, TileType.VOID);

  // pond, bottom-left
  fill(3, 22, 9, 26, TileType.WATER);

  // paths — all of them meet at the Study Room door
  fill(17, 15, 18, ROWS - 1, TileType.PATH); // main path, door → campus entrance
  fill(6, 9, 7, 15, TileType.PATH); // café spur
  fill(7, 16, 17, 16, TileType.PATH); // café → main
  fill(29, 10, 30, 16, TileType.PATH); // library spur
  fill(19, 17, 30, 17, TileType.PATH); // library → main
  fill(19, 21, 33, 22, TileType.PATH); // journal plaza walk
  fill(26, 21, 33, 23, TileType.PATH); // the plaza itself

  return t;
}

export const CAMPUS: Layout = {
  cols: COLS,
  rows: ROWS,
  tiles: buildTiles(),
  outdoor: true,
  furniture: [
    // the heart
    { type: 'building_study', col: 13, row: 8 },
    // café & library
    { type: 'building_cafe', col: 3, row: 4 },
    { type: 'building_library', col: 26, row: 5 },
    // journal plaza
    { type: 'journal_wall', col: 26, row: 19 },
    { type: 'map_board', col: 32, row: 19 },
    // distant rooftops in the mist (the world is larger than the campus)
    { type: 'rooftop', col: 4, row: 1 },
    { type: 'rooftop', col: 15, row: 0 },
    { type: 'rooftop', col: 27, row: 1 },
    // tree line + scattered trees
    { type: 'tree_big', col: 1, row: 2 },
    { type: 'tree', col: 5, row: 2 },
    { type: 'tree_big', col: 11, row: 2 },
    { type: 'tree', col: 20, row: 2 },
    { type: 'tree_big', col: 24, row: 2 },
    { type: 'tree', col: 34, row: 2 },
    { type: 'tree', col: 24, row: 6 },
    { type: 'tree_big', col: 34, row: 8 },
    { type: 'tree', col: 1, row: 12 },
    { type: 'tree_big', col: 34, row: 14 },
    { type: 'tree', col: 2, row: 19 },
    { type: 'tree_big', col: 12, row: 20 },
    { type: 'tree', col: 1, row: 27 },
    { type: 'tree_big', col: 34, row: 26 },
    { type: 'tree', col: 25, row: 27 },
    // lanterns along the paths
    { type: 'lantern', col: 16, row: 18 },
    { type: 'lantern', col: 19, row: 20 },
    { type: 'lantern', col: 16, row: 23 },
    { type: 'lantern', col: 19, row: 26 },
    { type: 'lantern', col: 8, row: 12 },
    { type: 'lantern', col: 28, row: 14 },
    { type: 'lantern', col: 25, row: 21 },
    // flowers by the pond and paths
    { type: 'flowers', col: 3, row: 21 },
    { type: 'flowers', col: 10, row: 23 },
    { type: 'flowers', col: 4, row: 27 },
    { type: 'flowers', col: 15, row: 17 },
    { type: 'flowers', col: 20, row: 19 },
    { type: 'flowers', col: 31, row: 18 },
  ],
  seats: [],
  entry: { col: 17, row: 28 },
  portals: [
    { col: 17, row: 15, to: 'studyRoom', spawn: { col: 9, row: 20 } },
    { col: 18, row: 15, to: 'studyRoom', spawn: { col: 10, row: 20 } },
    { col: 6, row: 9, to: 'cafe', spawn: { col: 6, row: 9 } },
    { col: 7, row: 9, to: 'cafe', spawn: { col: 7, row: 9 } },
    {
      col: 29,
      row: 10,
      to: 'library',
      spawn: { col: 0, row: 0 },
      lockedMessage: 'としょかんは 準備中です 🔨 もうすこし まってね',
    },
    {
      col: 30,
      row: 10,
      to: 'library',
      spawn: { col: 0, row: 0 },
      lockedMessage: 'としょかんは 準備中です 🔨 もうすこし まってね',
    },
  ],
  interactables: [
    { id: 'journal', kind: 'journal', col: 26, row: 18, w: 8, h: 3, walkTo: { col: 29, row: 22 } },
  ],
  labels: [
    { x: 18 * TILE_SIZE, y: 13.4 * TILE_SIZE, text: '自習室' },
    { x: 18 * TILE_SIZE, y: 16.4 * TILE_SIZE, text: '', kind: 'study-count' },
    { x: 6.9 * TILE_SIZE, y: 7.4 * TILE_SIZE, text: 'カフェ' },
    { x: 29.9 * TILE_SIZE, y: 8.4 * TILE_SIZE, text: 'としょかん' },
    { x: 29 * TILE_SIZE, y: 18.6 * TILE_SIZE, text: '日本の思い出' },
  ],
  lights: [
    // lanterns
    { x: 16.3 * TILE_SIZE, y: 18.3 * TILE_SIZE, r: 40 },
    { x: 19.3 * TILE_SIZE, y: 20.3 * TILE_SIZE, r: 40 },
    { x: 16.3 * TILE_SIZE, y: 23.3 * TILE_SIZE, r: 40 },
    { x: 19.3 * TILE_SIZE, y: 26.3 * TILE_SIZE, r: 40 },
    { x: 8.3 * TILE_SIZE, y: 12.3 * TILE_SIZE, r: 40 },
    { x: 28.3 * TILE_SIZE, y: 14.3 * TILE_SIZE, r: 40 },
    { x: 25.3 * TILE_SIZE, y: 21.3 * TILE_SIZE, r: 40 },
    // building doors & windows glow at night
    { x: 18 * TILE_SIZE, y: 14.6 * TILE_SIZE, r: 56 },
    { x: 6.9 * TILE_SIZE, y: 8.6 * TILE_SIZE, r: 44 },
    { x: 29.9 * TILE_SIZE, y: 9.6 * TILE_SIZE, r: 30 },
  ],
};

/** Where the campus cat lives (by the pond). */
export const CAT_HOME = { sceneId: 'campus', col: 11, row: 24 };

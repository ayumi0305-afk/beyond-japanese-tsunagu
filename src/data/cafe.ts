/** The café — sensei's place. Her daily note, warm light, no agenda. */
import type { Layout } from '../world/types';
import { TILE_SIZE, TileType } from '../world/types';

const COLS = 14;
const ROWS = 12;

function buildTiles(): number[] {
  const t = new Array<number>(COLS * ROWS).fill(TileType.FLOOR_WOOD);
  const set = (c: number, r: number, v: number) => {
    t[r * COLS + c] = v;
  };
  for (let c = 0; c < COLS; c++) {
    set(c, 0, TileType.WALL);
    set(c, 1, TileType.WALL);
    if (c !== 6 && c !== 7) set(c, ROWS - 1, TileType.WALL);
  }
  for (let r = 0; r < ROWS; r++) {
    set(0, r, TileType.WALL);
    set(COLS - 1, r, TileType.WALL);
  }
  set(6, ROWS - 1, TileType.FLOOR_STONE);
  set(7, ROWS - 1, TileType.FLOOR_STONE);
  set(6, ROWS - 2, TileType.FLOOR_STONE);
  set(7, ROWS - 2, TileType.FLOOR_STONE);
  for (let r = 2; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if ((r * 5 + c * 3) % 7 === 0 && t[r * COLS + c] === TileType.FLOOR_WOOD) {
        set(c, r, TileType.FLOOR_WOOD_ALT);
      }
    }
  }
  // small rug corner
  for (let r = 6; r <= 8; r++) for (let c = 9; c <= 11; c++) set(c, r, TileType.FLOOR_RUG);
  return t;
}

export const CAFE: Layout = {
  cols: COLS,
  rows: ROWS,
  tiles: buildTiles(),
  furniture: [
    { type: 'counter', col: 3, row: 3 },
    { type: 'board', col: 3, row: 1 },
    { type: 'window', col: 9, row: 1 },
    { type: 'plant', col: 1, row: 4 },
    { type: 'plant', col: 12, row: 4 },
    { type: 'plant', col: 1, row: 9 },
    { type: 'shelf', col: 10, row: 3 },
    { type: 'cushion_shu', col: 9, row: 6 },
    { type: 'cushion', col: 11, row: 6 },
    { type: 'cushion_indigo', col: 9, row: 8 },
    { type: 'cushion', col: 11, row: 8 },
    { type: 'lantern', col: 3, row: 9 },
  ],
  seats: [],
  entry: { col: 6, row: 10 },
  portals: [
    { col: 6, row: 11, to: 'campus', spawn: { col: 6, row: 10 } },
    { col: 7, row: 11, to: 'campus', spawn: { col: 7, row: 10 } },
  ],
  labels: [],
  lights: [
    { x: 5 * TILE_SIZE, y: 3.5 * TILE_SIZE, r: 52 },
    { x: 3.4 * TILE_SIZE, y: 9.3 * TILE_SIZE, r: 40 },
    { x: 10 * TILE_SIZE, y: 1.6 * TILE_SIZE, r: 36 },
  ],
};

/** Where sensei sits (behind the café counter). */
export const CAFE_SENSEI_SPOT = { col: 4, row: 2 };

/** Sensei's rotating daily words — later set by Ayumi from the teacher panel. */
export const SENSEI_NOTES = [
  '祇園祭が はじまりました 🏮',
  'こんちきちん、きこえるかな',
  'きょうも きてくれて ありがとう',
  '休むのも だいじですよ',
];

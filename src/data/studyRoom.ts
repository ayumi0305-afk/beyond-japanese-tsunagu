/** The Study Room — the heart of TSUNAGU. One warm room, one big shared table. */
import type { Layout } from '../world/types';
import { Direction, TILE_SIZE, TileType } from '../world/types';

const COLS = 20;
const ROWS = 22;

function buildTiles(): number[] {
  const t = new Array<number>(COLS * ROWS).fill(TileType.FLOOR_WOOD);
  const set = (c: number, r: number, v: number) => {
    t[r * COLS + c] = v;
  };

  // walls: top two rows for depth, sides, bottom with a door gap
  for (let c = 0; c < COLS; c++) {
    set(c, 0, TileType.WALL);
    set(c, 1, TileType.WALL);
    if (c !== 9 && c !== 10) set(c, ROWS - 1, TileType.WALL);
  }
  for (let r = 0; r < ROWS; r++) {
    set(0, r, TileType.WALL);
    set(COLS - 1, r, TileType.WALL);
  }
  // door threshold
  set(9, ROWS - 1, TileType.FLOOR_STONE);
  set(10, ROWS - 1, TileType.FLOOR_STONE);
  set(9, ROWS - 2, TileType.FLOOR_STONE);
  set(10, ROWS - 2, TileType.FLOOR_STONE);

  // wood grain variation (deterministic scatter)
  for (let r = 2; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if ((r * 7 + c * 13) % 5 === 0 && t[r * COLS + c] === TileType.FLOOR_WOOD) {
        set(c, r, TileType.FLOOR_WOOD_ALT);
      }
    }
  }

  // rug under the big table
  for (let r = 7; r <= 11; r++) {
    for (let c = 6; c <= 13; c++) set(c, r, TileType.FLOOR_RUG);
  }

  return t;
}

export const STUDY_ROOM: Layout = {
  cols: COLS,
  rows: ROWS,
  tiles: buildTiles(),
  furniture: [
    { type: 'table_big', col: 7, row: 8 },
    // cushions — north side (sit facing down), south side (facing up), ends
    { type: 'cushion', col: 8, row: 7 },
    { type: 'cushion_shu', col: 10, row: 7 },
    { type: 'cushion', col: 12, row: 7 },
    { type: 'cushion_indigo', col: 8, row: 11 },
    { type: 'cushion', col: 10, row: 11 },
    { type: 'cushion_shu', col: 12, row: 11 },
    { type: 'cushion_indigo', col: 6, row: 9 },
    { type: 'cushion', col: 13, row: 9 },
    // the class board on the wall (sensei's home is the café)
    { type: 'board', col: 2, row: 1 },
    // windows on the top wall
    { type: 'window', col: 8, row: 1 },
    { type: 'window', col: 12, row: 1 },
    { type: 'window', col: 15, row: 1 },
    // green & light
    { type: 'plant', col: 1, row: 5 },
    { type: 'plant', col: 18, row: 3 },
    { type: 'plant', col: 1, row: 18 },
    { type: 'plant', col: 18, row: 18 },
    { type: 'shelf', col: 15, row: 5 },
    { type: 'lantern', col: 6, row: 19 },
    { type: 'lantern', col: 13, row: 19 },
  ],
  seats: [
    { id: 's1', col: 8, row: 7, facing: Direction.DOWN },
    { id: 's2', col: 10, row: 7, facing: Direction.DOWN },
    { id: 's3', col: 12, row: 7, facing: Direction.DOWN },
    { id: 's4', col: 8, row: 11, facing: Direction.UP },
    { id: 's5', col: 10, row: 11, facing: Direction.UP },
    { id: 's6', col: 12, row: 11, facing: Direction.UP },
    { id: 's7', col: 6, row: 9, facing: Direction.RIGHT },
    { id: 's8', col: 13, row: 9, facing: Direction.LEFT },
  ],
  entry: { col: 9, row: ROWS - 2 },
  portals: [
    { col: 9, row: ROWS - 1, to: 'campus', spawn: { col: 17, row: 16 } },
    { col: 10, row: ROWS - 1, to: 'campus', spawn: { col: 18, row: 16 } },
  ],
  labels: [],
  lights: [
    { x: 6.5 * TILE_SIZE, y: 19.2 * TILE_SIZE, r: 42 },
    { x: 13.5 * TILE_SIZE, y: 19.2 * TILE_SIZE, r: 42 },
    { x: 9 * TILE_SIZE, y: 1.5 * TILE_SIZE, r: 36 },
    { x: 13 * TILE_SIZE, y: 1.5 * TILE_SIZE, r: 36 },
  ],
};

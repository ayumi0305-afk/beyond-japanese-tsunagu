/** BFS pathfinding on a 4-connected tile grid. */
import type { TileType } from './types';
import { TileType as T } from './types';

export function isWalkable(
  col: number,
  row: number,
  tileMap: TileType[][],
  blocked: Set<string>,
): boolean {
  const rows = tileMap.length;
  const cols = rows > 0 ? tileMap[0].length : 0;
  if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
  const t = tileMap[row][col];
  if (t === T.WALL || t === T.VOID || t === T.WATER) return false;
  return !blocked.has(`${col},${row}`);
}

export function walkableTiles(
  tileMap: TileType[][],
  blocked: Set<string>,
): Array<{ col: number; row: number }> {
  const out: Array<{ col: number; row: number }> = [];
  for (let r = 0; r < tileMap.length; r++) {
    for (let c = 0; c < tileMap[r].length; c++) {
      if (isWalkable(c, r, tileMap, blocked)) out.push({ col: c, row: r });
    }
  }
  return out;
}

const DIRS = [
  { dc: 0, dr: -1 },
  { dc: 0, dr: 1 },
  { dc: -1, dr: 0 },
  { dc: 1, dr: 0 },
];

/** Returns path excluding start, including end. Empty if unreachable. */
export function findPath(
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  tileMap: TileType[][],
  blocked: Set<string>,
): Array<{ col: number; row: number }> {
  if (startCol === endCol && startRow === endRow) return [];
  if (!isWalkable(endCol, endRow, tileMap, blocked)) return [];

  const key = (c: number, r: number) => `${c},${r}`;
  const startKey = key(startCol, startRow);
  const endKey = key(endCol, endRow);
  const visited = new Set<string>([startKey]);
  const parent = new Map<string, string>();
  const queue: Array<{ col: number; row: number }> = [{ col: startCol, row: startRow }];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curKey = key(cur.col, cur.row);
    if (curKey === endKey) {
      const path: Array<{ col: number; row: number }> = [];
      let k = endKey;
      while (k !== startKey) {
        const [c, r] = k.split(',').map(Number);
        path.unshift({ col: c, row: r });
        k = parent.get(k)!;
      }
      return path;
    }
    for (const d of DIRS) {
      const nc = cur.col + d.dc;
      const nr = cur.row + d.dr;
      const nk = key(nc, nr);
      if (visited.has(nk) || !isWalkable(nc, nr, tileMap, blocked)) continue;
      visited.add(nk);
      parent.set(nk, curKey);
      queue.push({ col: nc, row: nr });
    }
  }
  return [];
}

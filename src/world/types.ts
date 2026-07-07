/** Core world types for the TSUNAGU engine. */

export const TILE_SIZE = 16;

export const TileType = {
  VOID: 0,
  FLOOR_WOOD: 1,
  FLOOR_WOOD_ALT: 2,
  FLOOR_RUG: 3,
  FLOOR_STONE: 4,
  WATER: 5,
  GRASS: 6,
  GRASS_ALT: 7,
  PATH: 8,
  WALL: 9,
} as const;
export type TileType = (typeof TileType)[keyof typeof TileType];

export const Direction = {
  DOWN: 0,
  LEFT: 1,
  RIGHT: 2,
  UP: 3,
} as const;
export type Direction = (typeof Direction)[keyof typeof Direction];

export const PersonState = {
  IDLE: 'idle',
  WALK: 'walk',
  SIT: 'sit',
} as const;
export type PersonState = (typeof PersonState)[keyof typeof PersonState];

/** 2D grid of hex colors. '' = transparent. [row][col] */
export type SpriteData = string[][];

export interface SeatDef {
  id: string;
  col: number;
  row: number;
  /** Direction the sitter faces (toward the table). */
  facing: Direction;
}

export interface PlacedFurniture {
  type: string;
  col: number;
  row: number;
}

/** A door: stepping on this tile carries you into another scene. */
export interface Portal {
  col: number;
  row: number;
  to: string;
  spawn: { col: number; row: number };
  /** Locked portals don't transition — they explain themselves instead. */
  lockedMessage?: string;
}

/** Something you walk up to and it opens (the journal wall, a notice board). */
export interface Interactable {
  id: string;
  kind: 'journal';
  /** Tap target rect in tiles. */
  col: number;
  row: number;
  w: number;
  h: number;
  /** Where your character walks to before it opens. */
  walkTo: { col: number; row: number };
}

/** World-anchored signage text (building names etc.). */
export interface SceneLabel {
  x: number;
  y: number;
  text: string;
  /** 'study-count' renders live occupancy instead of static text. */
  kind?: 'sign' | 'study-count';
}

export interface Layout {
  cols: number;
  rows: number;
  /** Flat row-major tile array, length cols*rows. */
  tiles: number[];
  furniture: PlacedFurniture[];
  seats: SeatDef[];
  /** Tile where people enter the scene. */
  entry: { col: number; row: number };
  /** Lamp/lantern glow points (world px) for evening light. */
  lights: Array<{ x: number; y: number; r: number }>;
  portals?: Portal[];
  interactables?: Interactable[];
  labels?: SceneLabel[];
  /** Outdoor scenes get sky mist at the edges and fireflies at dusk. */
  outdoor?: boolean;
}

export interface FurnitureDef {
  sprite: SpriteData;
  footprintW: number;
  footprintH: number;
  /** Rows from the top of the footprint that people may walk through/behind. */
  backgroundRows?: number;
  /** If true the footprint does not block walking at all (rugs, cushions). */
  walkable?: boolean;
  /** Extra world-px added to zY for sort tweaks. */
  zBias?: number;
}

export interface Palette {
  hair: string;
  skin: string;
  cloth: string;
  clothDark: string;
}

export interface Person {
  id: string;
  name: string;
  /** Which scene this person is currently in. */
  sceneId: string;
  kind: 'me' | 'classmate' | 'sensei';
  palette: Palette;
  state: PersonState;
  dir: Direction;
  /** World px, bottom-center anchor. */
  x: number;
  y: number;
  tileCol: number;
  tileRow: number;
  path: Array<{ col: number; row: number }>;
  moveProgress: number;
  frame: number;
  frameTimer: number;
  wanderTimer: number;
  seatId: string | null;
  /** Where this person is headed to sit once their walk finishes. */
  targetSeatId: string | null;
  /** What they're studying — shown as a soft bubble while seated. */
  intention: string | null;
  /** Transient speech bubble (greetings etc.). */
  speech: string | null;
  speechTimer: number;
  /** Fade-in progress 0..1 when entering the room. */
  presence: number;
  leaving: boolean;
}

/** A trace someone left behind: a still-steaming cup at a seat. */
export interface SeatArtifact {
  seatId: string;
  label: string; // e.g. "Yuki · けさ30分"
  /** Steam remaining, 0..1 — cools down slowly. */
  warmth: number;
}

export interface StampBurst {
  x: number;
  y: number;
  t: number; // seconds since spawn
}

export interface SteamPuff {
  x: number;
  y: number;
  t: number;
  life: number;
  drift: number;
}

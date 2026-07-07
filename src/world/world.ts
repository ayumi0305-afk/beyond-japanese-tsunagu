/**
 * The world orchestrator: one living campus of scenes.
 * The campus is the home; buildings are the navigation. Walking through a
 * door fades you into that building's scene — never a page change.
 * Lives entirely outside React; React chrome talks to it through a small
 * API + event callbacks. In phase 2 the same mutation API will be driven
 * by server presence events instead of the local sim.
 */
import { createCat, updateCat, updateSteam, type Cat } from './ambient';
import { createPerson, setPath, standUp, updatePerson, type PersonUpdateCtx } from './people';
import { findPath, isWalkable } from './pathfind';
import { Scene, type Seat } from './scene';
import type {
  Layout,
  Palette,
  Person,
  Portal,
  SeatArtifact,
  StampBurst,
  SteamPuff,
} from './types';
import { Direction, PersonState, TILE_SIZE } from './types';

export interface WorldEvents {
  /** A free seat was tapped while not in a session → open the check-in sheet. */
  onSeatTapped: (seat: Seat) => void;
  onSessionStart: () => void;
  onSessionEnd: (minutes: number) => void;
  onToast: (text: string) => void;
  /** An interactable opened (journal wall → postcard panel). */
  onOpenPanel: (kind: 'journal') => void;
}

export interface Session {
  active: boolean;
  intention: string;
  goalMin: number;
  /** World-clock seconds when the session began. */
  startedAt: number;
}

export interface SimEvent {
  at: number;
  run: (world: World) => void;
}

interface Transition {
  phase: 'out' | 'in';
  t: number;
  portal: Portal;
}

const TRANSITION_SEC = 0.4;

export const PALETTES: Record<string, Palette> = {
  me: { hair: '#3B332C', skin: '#E8C39E', cloth: '#4E6E8C', clothDark: '#3D5871' },
  yuki: { hair: '#2E2A25', skin: '#F0CCA8', cloth: '#8A5A72', clothDark: '#6E4759' },
  marco: { hair: '#5C4632', skin: '#D9A87C', cloth: '#6E8F76', clothDark: '#587260' },
  ben: { hair: '#8A6748', skin: '#EDC6A0', cloth: '#B08D64', clothDark: '#8F7250' },
  sensei: { hair: '#2E2A25', skin: '#EDC6A0', cloth: '#CE7A62', clothDark: '#A9604C' },
};

export class World {
  scenes = new Map<string, Scene>();
  currentId: string;
  people = new Map<string, Person>();
  me: Person;
  cat: Cat & { sceneId: string };
  steam: SteamPuff[] = [];
  artifacts: Array<SeatArtifact & { sceneId: string }> = [];
  stamps: StampBurst[] = [];
  session: Session = { active: false, intention: '', goalMin: 15, startedAt: 0 };
  /** World clock in seconds since load. */
  time = 0;
  events: WorldEvents;
  transition: Transition | null = null;
  private sim: SimEvent[] = [];
  private stampedThisSession = new Set<string>();
  /** Seat the check-in sheet is currently open for. */
  pendingSeatId: string | null = null;
  /** Interactable that should open when `me` reaches its walkTo tile. */
  private pendingInteract: string | null = null;
  /** Suppresses repeated locked-door messages while standing on the tile. */
  private lastLockedKey: string | null = null;

  constructor(
    layouts: Record<string, Layout>,
    startScene: string,
    catHome: { sceneId: string; col: number; row: number },
    events: WorldEvents,
  ) {
    for (const [id, layout] of Object.entries(layouts)) {
      this.scenes.set(id, new Scene(layout));
    }
    this.currentId = startScene;
    this.events = events;
    const entry = this.scene.layout.entry;
    this.me = createPerson('me', 'あなた', startScene, 'me', PALETTES.me, entry.col, entry.row);
    this.people.set(this.me.id, this.me);
    this.cat = Object.assign(createCat(catHome.col, catHome.row), { sceneId: catHome.sceneId });
  }

  /** The scene the player is currently in. */
  get scene(): Scene {
    return this.scenes.get(this.currentId)!;
  }

  sceneOf(p: Person): Scene {
    return this.scenes.get(p.sceneId)!;
  }

  /** People standing in the player's current scene. */
  peopleHere(): Person[] {
    const out: Person[] = [];
    for (const p of this.people.values()) if (p.sceneId === this.currentId) out.push(p);
    return out;
  }

  /** Seated students in a scene (the "N人が べんきょう中" label on campus). */
  countStudying(sceneId: string): number {
    let n = 0;
    for (const p of this.people.values()) {
      if (p.sceneId === sceneId && p.state === PersonState.SIT && p.kind !== 'sensei') n++;
    }
    return n;
  }

  // ── Sim scripting (phase 2: replaced by server events) ────────

  addSimEvents(events: SimEvent[]): void {
    this.sim.push(...events);
    this.sim.sort((a, b) => a.at - b.at);
  }

  /** Spawn a classmate already seated (present before you arrived). */
  spawnSeated(
    sceneId: string,
    id: string,
    name: string,
    palette: Palette,
    seatId: string,
    intention: string,
  ): void {
    const scene = this.scenes.get(sceneId);
    const seat = scene?.seats.get(seatId);
    if (!scene || !seat || seat.occupant) return;
    const p = createPerson(id, name, sceneId, 'classmate', palette, seat.col, seat.row);
    p.state = PersonState.SIT;
    p.dir = seat.facing;
    p.seatId = seatId;
    p.intention = intention;
    p.presence = 1;
    seat.occupant = id;
    this.people.set(id, p);
  }

  /** A classmate arrives through the scene's door and walks to a seat. */
  arrive(
    sceneId: string,
    id: string,
    name: string,
    palette: Palette,
    seatId: string,
    intention: string,
  ): void {
    const scene = this.scenes.get(sceneId);
    const seat = scene?.seats.get(seatId);
    if (!scene || !seat || seat.occupant) return;
    const entry = scene.layout.entry;
    const p = createPerson(id, name, sceneId, 'classmate', palette, entry.col, entry.row);
    p.intention = intention;
    p.targetSeatId = seatId;
    this.people.set(id, p);
    const path = findPath(entry.col, entry.row, seat.col, seat.row, scene.tileMap, this.blockedFor(p));
    if (path.length > 0) setPath(p, path);
  }

  /** A classmate who is simply out and about in a scene (no seat, just strolling). */
  arriveStroller(
    sceneId: string,
    id: string,
    name: string,
    palette: Palette,
    col: number,
    row: number,
  ): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;
    const p = createPerson(id, name, sceneId, 'classmate', palette, col, row);
    p.presence = 1;
    this.people.set(id, p);
  }

  /** A classmate finishes: stands, leaves a warm cup, walks out, fades. */
  depart(id: string, minutesLabel: string): void {
    const p = this.people.get(id);
    if (!p || p.kind !== 'classmate') return;
    const scene = this.sceneOf(p);
    if (p.seatId) {
      this.artifacts.push({
        sceneId: p.sceneId,
        seatId: p.seatId,
        label: `${p.name} · ${minutesLabel}`,
        warmth: 1,
      });
      standUp(p, scene);
    }
    p.intention = null;
    p.leaving = true;
    const entry = scene.layout.entry;
    const path = findPath(p.tileCol, p.tileRow, entry.col, entry.row, scene.tileMap, this.blockedFor(p));
    if (path.length > 0) setPath(p, path);
  }

  spawnSensei(sceneId: string, col: number, row: number): void {
    const s = createPerson('sensei', 'あゆみ先生', sceneId, 'sensei', PALETTES.sensei, col, row);
    s.state = PersonState.SIT;
    s.dir = Direction.DOWN;
    s.presence = 1;
    this.people.set(s.id, s);
  }

  say(id: string, text: string, seconds = 5): void {
    const p = this.people.get(id);
    if (!p) return;
    p.speech = text;
    p.speechTimer = seconds;
  }

  /** Pre-existing trace: someone studied here earlier today. */
  addArtifact(sceneId: string, seatId: string, label: string, warmth = 0.7): void {
    this.artifacts.push({ sceneId, seatId, label, warmth });
  }

  // ── The ritual ────────────────────────────────────────────────

  /** Confirmed from the check-in sheet: walk to the seat and sit. */
  checkIn(seatId: string, intention: string, goalMin: number): boolean {
    const scene = this.scene;
    const seat = scene.seats.get(seatId);
    if (!seat || seat.occupant) return false;
    this.pendingSeatId = null;
    this.session.intention = intention;
    this.session.goalMin = goalMin;
    this.me.intention = intention;
    this.me.targetSeatId = seatId;
    this.artifacts = this.artifacts.filter(
      (a) => !(a.sceneId === this.currentId && a.seatId === seatId),
    );
    const path = findPath(
      this.me.tileCol,
      this.me.tileRow,
      seat.col,
      seat.row,
      scene.tileMap,
      this.blockedFor(this.me),
    );
    if (path.length > 0) {
      setPath(this.me, path);
    } else if (this.me.tileCol === seat.col && this.me.tileRow === seat.row) {
      this.me.state = PersonState.SIT;
      this.me.dir = seat.facing;
      this.me.seatId = seatId;
      this.me.targetSeatId = null;
      seat.occupant = this.me.id;
      this.startSession();
    } else {
      return false;
    }
    return true;
  }

  private startSession(): void {
    this.session.active = true;
    this.session.startedAt = this.time;
    this.stampedThisSession.clear();
    this.say('sensei', 'いってらっしゃい', 4);
    this.events.onSessionStart();
  }

  /** Stand up and close today's session. */
  finishSession(): void {
    if (!this.session.active) return;
    const minutes = Math.max(1, Math.round((this.time - this.session.startedAt) / 60));
    if (this.me.seatId) {
      this.artifacts.push({
        sceneId: this.me.sceneId,
        seatId: this.me.seatId,
        label: `あなた · ${minutes}分`,
        warmth: 1,
      });
    }
    standUp(this.me, this.sceneOf(this.me));
    this.me.intention = null;
    this.session.active = false;
    this.say('sensei', 'お疲れさまでした', 5);
    this.events.onSessionEnd(minutes);
  }

  sessionElapsedSec(): number {
    return this.session.active ? this.time - this.session.startedAt : 0;
  }

  // ── Interaction (tap) ─────────────────────────────────────────

  tapAt(worldX: number, worldY: number): void {
    if (this.transition) return;
    const scene = this.scene;
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    // 1. interactables (the journal wall)
    for (const it of scene.layout.interactables ?? []) {
      if (col >= it.col && col < it.col + it.w && row >= it.row && row < it.row + it.h) {
        this.walkThenInteract(it.id, it.walkTo);
        return;
      }
    }

    // 2. people (front-most first)
    const people = this.peopleHere().sort((a, b) => b.y - a.y);
    for (const p of people) {
      const half = 9;
      const top = p.y - 26;
      if (worldX >= p.x - half && worldX <= p.x + half && worldY >= top && worldY <= p.y + 2) {
        this.tapPerson(p);
        return;
      }
    }

    // 3. seats
    const seat = scene.seatAt(col, row);
    if (seat && seat.id !== 'sensei') {
      if (this.me.seatId === seat.id) {
        this.finishSession();
        return;
      }
      if (!seat.occupant && !this.session.active) {
        this.pendingSeatId = seat.id;
        this.events.onSeatTapped(seat);
        return;
      }
    }

    // 4. walk there (only when not mid-session)
    if (this.session.active) return;
    this.pendingInteract = null;
    const blocked = this.blockedFor(this.me, { col, row });
    if (isWalkable(col, row, scene.tileMap, blocked)) {
      this.me.targetSeatId = null;
      const path = findPath(this.me.tileCol, this.me.tileRow, col, row, scene.tileMap, blocked);
      if (path.length > 0) setPath(this.me, path);
    }
  }

  private walkThenInteract(id: string, walkTo: { col: number; row: number }): void {
    if (this.session.active) return;
    if (this.me.tileCol === walkTo.col && this.me.tileRow === walkTo.row) {
      this.openInteract(id);
      return;
    }
    const path = findPath(
      this.me.tileCol,
      this.me.tileRow,
      walkTo.col,
      walkTo.row,
      this.scene.tileMap,
      this.blockedFor(this.me),
    );
    if (path.length > 0) {
      this.pendingInteract = id;
      this.me.targetSeatId = null;
      setPath(this.me, path);
    }
  }

  private openInteract(id: string): void {
    const it = (this.scene.layout.interactables ?? []).find((x) => x.id === id);
    if (it) this.events.onOpenPanel(it.kind);
  }

  private tapPerson(p: Person): void {
    if (p.id === this.me.id) {
      if (this.session.active) this.finishSession();
      return;
    }
    if (p.kind === 'sensei') {
      this.say('sensei', 'いらっしゃい。ゆっくりどうぞ', 4);
      return;
    }
    if (this.stampedThisSession.has(p.id)) {
      this.events.onToast(`${p.name}さんには もう🌸を送りました`);
      return;
    }
    this.stampedThisSession.add(p.id);
    this.stamps.push({ x: p.x, y: p.y - 28, t: 0 });
    this.events.onToast(`${p.name}さんに 🌸がんばって を送りました`);
  }

  // ── Update ────────────────────────────────────────────────────

  /**
   * Blocked tiles for a person's pathfinding: static blocks, other people's
   * seats, and door tiles — a doorway is never a shortcut; it's only enterable
   * when it is the walk's destination (`allowTile`).
   */
  private blockedFor(p: Person, allowTile?: { col: number; row: number }): Set<string> {
    const scene = this.sceneOf(p);
    const blocked = new Set(scene.blocked);
    for (const seat of scene.seats.values()) {
      if (seat.occupant && seat.occupant !== p.id) blocked.add(`${seat.col},${seat.row}`);
    }
    for (const portal of scene.layout.portals ?? []) {
      if (allowTile && portal.col === allowTile.col && portal.row === allowTile.row) continue;
      blocked.add(`${portal.col},${portal.row}`);
    }
    return blocked;
  }

  update(dt: number): void {
    this.time += dt;

    // door transitions
    if (this.transition) {
      this.transition.t += dt;
      if (this.transition.t >= TRANSITION_SEC) {
        if (this.transition.phase === 'out') {
          const portal = this.transition.portal;
          this.currentId = portal.to;
          this.me.sceneId = portal.to;
          this.me.tileCol = portal.spawn.col;
          this.me.tileRow = portal.spawn.row;
          this.me.x = portal.spawn.col * TILE_SIZE + TILE_SIZE / 2;
          this.me.y = portal.spawn.row * TILE_SIZE + TILE_SIZE;
          this.me.path = [];
          this.me.moveProgress = 0;
          this.me.state = PersonState.IDLE;
          this.me.dir = Direction.DOWN;
          this.transition = { phase: 'in', t: 0, portal };
        } else {
          this.transition = null;
        }
      }
    }

    // scripted community events
    while (this.sim.length > 0 && this.sim[0].at <= this.time) {
      const ev = this.sim.shift()!;
      ev.run(this);
    }

    const ctx = (p: Person): PersonUpdateCtx => ({
      scene: this.sceneOf(p),
      tileMap: this.sceneOf(p).tileMap,
      blockedFor: (q) => this.blockedFor(q),
      mayWander: (q) => q.kind === 'classmate' && !q.leaving,
      onSeated: (q) => {
        if (q.id === this.me.id) this.startSession();
      },
    });

    const toRemove: string[] = [];
    for (const p of this.people.values()) {
      updatePerson(p, dt, ctx(p));
      if (p.leaving && p.presence <= 0 && p.path.length === 0) toRemove.push(p.id);
    }
    for (const id of toRemove) this.people.delete(id);

    // arriving at an interactable opens it
    if (
      this.pendingInteract &&
      this.me.path.length === 0 &&
      this.me.state !== PersonState.WALK
    ) {
      const id = this.pendingInteract;
      this.pendingInteract = null;
      this.openInteract(id);
    }

    // door tiles: step on one → walk into the building
    if (!this.transition) {
      const portal = (this.scene.layout.portals ?? []).find(
        (pt) => pt.col === this.me.tileCol && pt.row === this.me.tileRow,
      );
      const key = portal ? `${this.currentId}:${portal.col},${portal.row}` : null;
      if (portal && portal.lockedMessage) {
        if (this.lastLockedKey !== key) {
          this.lastLockedKey = key;
          this.events.onToast(portal.lockedMessage);
        }
      } else if (portal && this.me.moveProgress === 0) {
        this.transition = { phase: 'out', t: 0, portal };
      }
      if (!portal) this.lastLockedKey = null;
    }

    const catScene = this.scenes.get(this.cat.sceneId)!;
    updateCat(this.cat, dt, catScene, catScene.tileMap);

    // steam rises from every warm cup in the player's scene
    const sources: Array<{ x: number; y: number; strength: number }> = [];
    for (const seat of this.scene.seats.values()) {
      if (seat.occupant && seat.id !== 'sensei') {
        const c = this.cupPos(seat);
        sources.push({ x: c.x, y: c.y, strength: 1 });
      }
    }
    for (const a of this.artifacts) {
      a.warmth = Math.max(0, a.warmth - dt / 600); // cools over ~10 min
      if (a.sceneId !== this.currentId) continue;
      const seat = this.scene.seats.get(a.seatId);
      if (seat && a.warmth > 0.05) {
        const c = this.cupPos(seat);
        sources.push({ x: c.x, y: c.y, strength: a.warmth * 0.7 });
      }
    }
    updateSteam(this.steam, dt, sources);

    // sakura bursts age out
    for (let i = this.stamps.length - 1; i >= 0; i--) {
      this.stamps[i].t += dt;
      if (this.stamps[i].t > 1.6) this.stamps.splice(i, 1);
    }
  }

  /** Where a seat's tea cup sits on the table (world px). */
  cupPos(seat: Seat): { x: number; y: number } {
    const dx = seat.facing === Direction.RIGHT ? 1 : seat.facing === Direction.LEFT ? -1 : 0;
    const dy = seat.facing === Direction.DOWN ? 1 : seat.facing === Direction.UP ? -1 : 0;
    return {
      x: seat.col * TILE_SIZE + TILE_SIZE / 2 + dx * 14,
      y: seat.row * TILE_SIZE + TILE_SIZE / 2 + dy * 14 + 2,
    };
  }
}

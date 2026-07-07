/**
 * The world orchestrator: owns the scene, the people, the ambient life,
 * and the daily ritual (check in → study → stand up).
 * Lives entirely outside React; React chrome talks to it through a small
 * API + event callbacks. In phase 2 the same mutation API will be driven
 * by server presence events instead of the local sim.
 */
import { createCat, updateCat, updateSteam, type Cat } from './ambient';
import { createPerson, setPath, standUp, updatePerson, type PersonUpdateCtx } from './people';
import { findPath, isWalkable } from './pathfind';
import { Scene, type Seat } from './scene';
import type { Layout, Palette, Person, SeatArtifact, StampBurst, SteamPuff } from './types';
import { Direction, PersonState, TILE_SIZE } from './types';

export interface WorldEvents {
  /** A free seat was tapped while not in a session → open the check-in sheet. */
  onSeatTapped: (seat: Seat) => void;
  onSessionStart: () => void;
  onSessionEnd: (minutes: number) => void;
  onToast: (text: string) => void;
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

export const PALETTES: Record<string, Palette> = {
  me: { hair: '#3B332C', skin: '#E8C39E', cloth: '#4E6E8C', clothDark: '#3D5871' },
  yuki: { hair: '#2E2A25', skin: '#F0CCA8', cloth: '#8A5A72', clothDark: '#6E4759' },
  marco: { hair: '#5C4632', skin: '#D9A87C', cloth: '#6E8F76', clothDark: '#587260' },
  ben: { hair: '#8A6748', skin: '#EDC6A0', cloth: '#B08D64', clothDark: '#8F7250' },
  sensei: { hair: '#2E2A25', skin: '#EDC6A0', cloth: '#CE7A62', clothDark: '#A9604C' },
};

export class World {
  scene: Scene;
  people = new Map<string, Person>();
  me: Person;
  cat: Cat;
  steam: SteamPuff[] = [];
  artifacts: SeatArtifact[] = [];
  stamps: StampBurst[] = [];
  session: Session = { active: false, intention: '', goalMin: 15, startedAt: 0 };
  /** World clock in seconds since load. */
  time = 0;
  events: WorldEvents;
  private sim: SimEvent[] = [];
  private stampedThisSession = new Set<string>();
  /** Seat the check-in sheet is currently open for. */
  pendingSeatId: string | null = null;

  constructor(layout: Layout, events: WorldEvents) {
    this.scene = new Scene(layout);
    this.events = events;
    this.me = createPerson('me', 'あなた', 'me', PALETTES.me, layout.entry.col, layout.entry.row);
    this.people.set(this.me.id, this.me);
    this.cat = createCat(layout.entry.col + 1, layout.entry.row - 1);
  }

  // ── Sim scripting (phase 2: replaced by server events) ────────

  addSimEvents(events: SimEvent[]): void {
    this.sim.push(...events);
    this.sim.sort((a, b) => a.at - b.at);
  }

  /** Spawn a classmate already seated (present before you arrived). */
  spawnSeated(id: string, name: string, palette: Palette, seatId: string, intention: string): void {
    const seat = this.scene.seats.get(seatId);
    if (!seat || seat.occupant) return;
    const p = createPerson(id, name, 'classmate', palette, seat.col, seat.row);
    p.state = PersonState.SIT;
    p.dir = seat.facing;
    p.seatId = seatId;
    p.intention = intention;
    p.presence = 1;
    seat.occupant = id;
    this.people.set(id, p);
  }

  /** A classmate arrives through the door and walks to a seat. */
  arrive(id: string, name: string, palette: Palette, seatId: string, intention: string): void {
    const seat = this.scene.seats.get(seatId);
    if (!seat || seat.occupant) return;
    const entry = this.scene.layout.entry;
    const p = createPerson(id, name, 'classmate', palette, entry.col, entry.row);
    p.intention = intention;
    p.targetSeatId = seatId;
    this.people.set(id, p);
    const path = findPath(entry.col, entry.row, seat.col, seat.row, this.scene.tileMap, this.blockedFor(p));
    if (path.length > 0) setPath(p, path);
  }

  /** A classmate finishes: stands, leaves a warm cup, walks out, fades. */
  depart(id: string, minutesLabel: string): void {
    const p = this.people.get(id);
    if (!p || p.kind !== 'classmate') return;
    if (p.seatId) {
      this.artifacts.push({ seatId: p.seatId, label: `${p.name} · ${minutesLabel}`, warmth: 1 });
      standUp(p, this.scene);
    }
    p.intention = null;
    p.leaving = true;
    const entry = this.scene.layout.entry;
    const path = findPath(p.tileCol, p.tileRow, entry.col, entry.row, this.scene.tileMap, this.blockedFor(p));
    if (path.length > 0) setPath(p, path);
  }

  spawnSensei(col: number, row: number): void {
    const s = createPerson('sensei', 'あゆみ先生', 'sensei', PALETTES.sensei, col, row);
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
  addArtifact(seatId: string, label: string, warmth = 0.7): void {
    this.artifacts.push({ seatId, label, warmth });
  }

  // ── The ritual ────────────────────────────────────────────────

  /** Confirmed from the check-in sheet: walk to the seat and sit. */
  checkIn(seatId: string, intention: string, goalMin: number): boolean {
    const seat = this.scene.seats.get(seatId);
    if (!seat || seat.occupant) return false;
    this.pendingSeatId = null;
    this.session.intention = intention;
    this.session.goalMin = goalMin;
    this.me.intention = intention;
    this.me.targetSeatId = seatId;
    // remove any cooled artifact occupying this seat
    this.artifacts = this.artifacts.filter((a) => a.seatId !== seatId);
    const path = findPath(
      this.me.tileCol,
      this.me.tileRow,
      seat.col,
      seat.row,
      this.scene.tileMap,
      this.blockedFor(this.me),
    );
    if (path.length > 0) {
      setPath(this.me, path);
    } else if (this.me.tileCol === seat.col && this.me.tileRow === seat.row) {
      // already standing on the seat tile
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
      this.artifacts.push({ seatId: this.me.seatId, label: `あなた · ${minutes}分`, warmth: 1 });
    }
    standUp(this.me, this.scene);
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
    // 1. people (front-most first)
    const people = [...this.people.values()].sort((a, b) => b.y - a.y);
    for (const p of people) {
      const half = 9;
      const top = p.y - 26;
      if (worldX >= p.x - half && worldX <= p.x + half && worldY >= top && worldY <= p.y + 2) {
        this.tapPerson(p);
        return;
      }
    }

    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);

    // 2. seats
    const seat = this.scene.seatAt(col, row);
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

    // 3. walk there (only when not mid-session)
    if (this.session.active) return;
    if (isWalkable(col, row, this.scene.tileMap, this.blockedFor(this.me))) {
      this.me.targetSeatId = null;
      const path = findPath(
        this.me.tileCol,
        this.me.tileRow,
        col,
        row,
        this.scene.tileMap,
        this.blockedFor(this.me),
      );
      if (path.length > 0) setPath(this.me, path);
    }
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
    // quiet encouragement — one sakura per classmate per visit
    if (this.stampedThisSession.has(p.id)) {
      this.events.onToast(`${p.name}さんには もう🌸を送りました`);
      return;
    }
    this.stampedThisSession.add(p.id);
    this.stamps.push({ x: p.x, y: p.y - 28, t: 0 });
    this.events.onToast(`${p.name}さんに 🌸がんばって を送りました`);
  }

  // ── Update ────────────────────────────────────────────────────

  private blockedFor(p: Person): Set<string> {
    const blocked = new Set(this.scene.blocked);
    for (const seat of this.scene.seats.values()) {
      if (seat.occupant && seat.occupant !== p.id) blocked.add(`${seat.col},${seat.row}`);
    }
    return blocked;
  }

  update(dt: number): void {
    this.time += dt;

    // scripted community events
    while (this.sim.length > 0 && this.sim[0].at <= this.time) {
      const ev = this.sim.shift()!;
      ev.run(this);
    }

    const ctx: PersonUpdateCtx = {
      scene: this.scene,
      tileMap: this.scene.tileMap,
      blockedFor: (p) => this.blockedFor(p),
      mayWander: (p) => p.kind === 'classmate' && !p.leaving,
      onSeated: (p) => {
        if (p.id === this.me.id) this.startSession();
      },
    };

    const toRemove: string[] = [];
    for (const p of this.people.values()) {
      updatePerson(p, dt, ctx);
      if (p.leaving && p.presence <= 0 && p.path.length === 0) toRemove.push(p.id);
    }
    for (const id of toRemove) this.people.delete(id);

    updateCat(this.cat, dt, this.scene, this.scene.tileMap);

    // steam rises from every warm cup: occupied seats + fresh artifacts
    const sources: Array<{ x: number; y: number; strength: number }> = [];
    for (const seat of this.scene.seats.values()) {
      if (seat.occupant && seat.id !== 'sensei') {
        const c = this.cupPos(seat);
        sources.push({ x: c.x, y: c.y, strength: 1 });
      }
    }
    for (const a of this.artifacts) {
      a.warmth = Math.max(0, a.warmth - dt / 600); // cools over ~10 min
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

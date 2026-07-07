/** One z-sorted canvas pass: floor → furniture/people/cat → cups & steam → bubbles → light. */
import { catSprite, type DayLight } from './ambient';
import {
  makeCup,
  makePersonFrames,
  raster,
  TILE_SPRITES,
  WALL_TOP_SPRITE,
  type PersonFrames,
} from './sprites';
import type { Person, SpriteData } from './types';
import { PersonState, TILE_SIZE } from './types';
import type { World } from './world';

const OUTSIDE = '#454B3E';
const SIT_OFFSET = 2;
const CUP_SPRITE = makeCup();

const frameCache = new Map<string, PersonFrames>();
function framesFor(p: Person): PersonFrames {
  let f = frameCache.get(p.id);
  if (!f) {
    f = makePersonFrames(p.palette);
    frameCache.set(p.id, f);
  }
  return f;
}

function personSprite(p: Person): SpriteData {
  const f = framesFor(p);
  if (p.state === PersonState.SIT) return f.sit[p.dir];
  if (p.state === PersonState.WALK) return f.walk[p.dir][p.frame];
  return f.walk[p.dir][1] ?? f.walk[p.dir][0];
}

interface Drawable {
  zY: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  world: World,
  offsetX: number,
  offsetY: number,
  zoom: number,
  light: DayLight,
  fontScale: number,
): void {
  ctx.fillStyle = OUTSIDE;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const scene = world.scene;
  const s = TILE_SIZE * zoom;

  // ── floor & walls ──
  for (let r = 0; r < scene.tileMap.length; r++) {
    for (let c = 0; c < scene.tileMap[r].length; c++) {
      const t = scene.tileMap[r][c];
      if (t === 0) continue;
      let sprite = TILE_SPRITES[t];
      if (t === 9) {
        // wall face only where floor lies below; otherwise a solid dark cap
        const below = scene.tileMap[r + 1]?.[c];
        const isFace = below !== undefined && below !== 9 && below !== 0;
        sprite = isFace ? TILE_SPRITES[9] : WALL_TOP_SPRITE;
      }
      if (!sprite) continue;
      ctx.drawImage(raster(sprite, zoom), offsetX + c * s, offsetY + r * s);
    }
  }

  // ── free-seat affordance (soft pulsing ring on cushions you may take) ──
  if (!world.session.active && world.me.state !== PersonState.WALK) {
    const pulse = 0.25 + 0.15 * Math.sin(world.time * 2.2);
    ctx.save();
    ctx.strokeStyle = `rgba(210, 105, 79, ${pulse})`;
    ctx.lineWidth = Math.max(2, zoom);
    for (const seat of scene.seats.values()) {
      if (seat.occupant || seat.id === 'sensei') continue;
      ctx.strokeRect(offsetX + seat.col * s + 2, offsetY + seat.row * s + 2, s - 4, s - 4);
    }
    ctx.restore();
  }

  // ── z-sorted scene ──
  const drawables: Drawable[] = [];

  for (const f of scene.furniture) {
    const img = raster(f.sprite, zoom);
    const fx = offsetX + f.x * zoom;
    const fy = offsetY + f.y * zoom;
    drawables.push({ zY: f.zY, draw: (c) => c.drawImage(img, fx, fy) });
  }

  for (const p of world.people.values()) {
    const sprite = personSprite(p);
    const img = raster(sprite, zoom);
    const sit = p.state === PersonState.SIT ? SIT_OFFSET : 0;
    const dx = Math.round(offsetX + p.x * zoom - img.width / 2);
    const dy = Math.round(offsetY + (p.y + sit) * zoom - img.height);
    const alpha = p.presence;
    drawables.push({
      zY: p.y + 0.1,
      draw: (c) => {
        if (alpha < 1) {
          c.save();
          c.globalAlpha = alpha;
          c.drawImage(img, dx, dy);
          c.restore();
        } else {
          c.drawImage(img, dx, dy);
        }
      },
    });
  }

  {
    const { sprite, flip } = catSprite(world.cat);
    const img = raster(sprite, zoom);
    const dx = Math.round(offsetX + world.cat.x * zoom - img.width / 2);
    const dy = Math.round(offsetY + world.cat.y * zoom - img.height);
    drawables.push({
      zY: world.cat.y,
      draw: (c) => {
        if (flip) {
          c.save();
          c.translate(dx + img.width, dy);
          c.scale(-1, 1);
          c.drawImage(img, 0, 0);
          c.restore();
        } else {
          c.drawImage(img, dx, dy);
        }
      },
    });
  }

  drawables.sort((a, b) => a.zY - b.zY);
  for (const d of drawables) d.draw(ctx);

  // ── cups (on the table, small enough to draw above the scene) ──
  const cupImg = raster(CUP_SPRITE, zoom);
  for (const seat of scene.seats.values()) {
    const occupied = seat.occupant && seat.id !== 'sensei';
    const artifact = world.artifacts.find((a) => a.seatId === seat.id && a.warmth > 0.02);
    if (!occupied && !artifact) continue;
    const c = world.cupPos(seat);
    ctx.drawImage(
      cupImg,
      Math.round(offsetX + c.x * zoom - cupImg.width / 2),
      Math.round(offsetY + c.y * zoom - cupImg.height),
    );
    if (artifact && !occupied) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#FFFDF7';
      ctx.font = `${Math.round(9 * fontScale)}px "Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(artifact.label, offsetX + c.x * zoom, offsetY + (c.y - 12) * zoom);
      ctx.restore();
    }
  }

  // ── steam ──
  ctx.save();
  for (const puff of world.steam) {
    const k = puff.t / puff.life;
    ctx.globalAlpha = 0.5 * (1 - k);
    ctx.fillStyle = '#EDE6D6';
    const px = offsetX + (puff.x + Math.sin(puff.t * 3) * 1.5 + puff.drift * k) * zoom;
    const py = offsetY + (puff.y - 4 - k * 12) * zoom;
    const size = Math.max(1, zoom * (1 + k));
    ctx.fillRect(px, py, size, size);
  }
  ctx.restore();

  // ── sakura stamps ──
  ctx.save();
  for (const burst of world.stamps) {
    const k = burst.t / 1.6;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#E8A8B8';
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + burst.t;
      const rad = 4 + k * 14;
      const px = offsetX + (burst.x + Math.cos(ang) * rad) * zoom;
      const py = offsetY + (burst.y - k * 10 + Math.sin(ang) * rad * 0.5) * zoom;
      ctx.fillRect(px, py, zoom * 1.5, zoom * 1.5);
    }
  }
  ctx.restore();

  // ── bubbles & names (sized by device pixel ratio, not zoom, so text stays readable) ──
  const font = (size: number) =>
    `${Math.round(size * fontScale)}px "Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif`;

  for (const p of world.people.values()) {
    if (p.presence < 0.5) continue;
    const headX = offsetX + p.x * zoom;
    const headY = offsetY + (p.y - 28) * zoom;

    // name under feet (not for me)
    if (p.id !== 'me') {
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#FFFDF7';
      ctx.font = font(9);
      ctx.textAlign = 'center';
      ctx.fillText(p.name, offsetX + p.x * zoom, offsetY + (p.y + 9) * zoom);
      ctx.restore();
    }

    const text = p.speech ?? (p.state === PersonState.SIT ? p.intention : null);
    if (!text) continue;
    const isSpeech = p.speech !== null;
    ctx.save();
    ctx.font = font(11);
    const tw = ctx.measureText(text).width;
    const padX = 7 * fontScale;
    const bw = tw + padX * 2;
    const bh = 20 * fontScale;
    // keep the bubble on screen even when the speaker is near an edge
    const bx = Math.max(4, Math.min(canvasW - bw - 4, headX - bw / 2));
    const by = headY - bh;
    ctx.globalAlpha = isSpeech ? 0.96 : 0.88;
    ctx.fillStyle = '#FFFDF7';
    ctx.strokeStyle = isSpeech ? '#D2694F' : '#D9CDB5';
    ctx.lineWidth = Math.max(1, fontScale);
    roundRect(ctx, bx, by, bw, bh, 6 * fontScale);
    ctx.fill();
    ctx.stroke();
    // tail — stays under the speaker but never escapes the bubble
    const tailX = Math.max(bx + 6 * fontScale, Math.min(bx + bw - 6 * fontScale, headX));
    ctx.beginPath();
    ctx.moveTo(tailX - 3 * fontScale, by + bh);
    ctx.lineTo(tailX, by + bh + 4 * fontScale);
    ctx.lineTo(tailX + 3 * fontScale, by + bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3B332C';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, by + bh / 2 + fontScale);
    ctx.restore();
  }

  // ── time-of-day light ──
  if (light.dusk > 0) {
    ctx.fillStyle = `rgba(226, 148, 84, ${light.dusk * 0.14})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  if (light.night > 0) {
    ctx.fillStyle = `rgba(18, 28, 48, ${light.night})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }
  if (light.lamps) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of world.scene.layout.lights) {
      const gx = offsetX + l.x * zoom;
      const gy = offsetY + l.y * zoom;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, l.r * zoom);
      grad.addColorStop(0, 'rgba(242, 192, 105, 0.28)');
      grad.addColorStop(1, 'rgba(242, 192, 105, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(gx - l.r * zoom, gy - l.r * zoom, l.r * zoom * 2, l.r * zoom * 2);
    }
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

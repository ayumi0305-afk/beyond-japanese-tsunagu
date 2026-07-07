/** Touch-first camera: tap = act, drag = pan, pinch/wheel = zoom. Integer zoom for crisp pixels. */
import { TILE_SIZE } from './types';
import type { World } from './world';

const ZOOM_MIN = 2;
const ZOOM_MAX = 7;
const TAP_SLOP_PX = 10; // device px of movement that still counts as a tap

export class Camera {
  zoom = 3;
  panX = 0;
  panY = 0;

  /** Fill the screen height with the room; the camera follows `me` sideways if needed. */
  fit(canvasW: number, canvasH: number, cols: number, rows: number): void {
    const zw = Math.floor(canvasW / (cols * TILE_SIZE));
    const zh = Math.floor(canvasH / (rows * TILE_SIZE));
    // Height-fit for cozy scale, but never more than a bit past width-fit
    const z = Math.min(zh, zw + 2);
    this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z || ZOOM_MIN));
    this.panX = 0;
    this.panY = 0;
  }

  clampPan(canvasW: number, canvasH: number, cols: number, rows: number): void {
    const mapW = cols * TILE_SIZE * this.zoom;
    const mapH = rows * TILE_SIZE * this.zoom;
    const maxX = Math.max(0, (mapW - canvasW) / 2 + 40);
    const maxY = Math.max(0, (mapH - canvasH) / 2 + 40);
    this.panX = Math.max(-maxX, Math.min(maxX, this.panX));
    this.panY = Math.max(-maxY, Math.min(maxY, this.panY));
  }

  /** Gently keep `me` in view when the room is bigger than the screen. */
  follow(
    meX: number,
    meY: number,
    canvasW: number,
    canvasH: number,
    cols: number,
    rows: number,
  ): void {
    const mapW = cols * TILE_SIZE * this.zoom;
    const mapH = rows * TILE_SIZE * this.zoom;
    if (mapW <= canvasW && mapH <= canvasH) return;
    const targetX = mapW / 2 - meX * this.zoom;
    const targetY = mapH / 2 - meY * this.zoom;
    this.panX += (targetX - this.panX) * 0.04;
    this.panY += (targetY - this.panY) * 0.04;
    this.clampPan(canvasW, canvasH, cols, rows);
  }

  offset(canvasW: number, canvasH: number, cols: number, rows: number): { x: number; y: number } {
    const mapW = cols * TILE_SIZE * this.zoom;
    const mapH = rows * TILE_SIZE * this.zoom;
    return {
      x: Math.floor((canvasW - mapW) / 2) + Math.round(this.panX),
      y: Math.floor((canvasH - mapH) / 2) + Math.round(this.panY),
    };
  }
}

/** Wire pointer input on the canvas: tap / drag-pan / pinch-zoom / wheel-zoom. */
export function attachInput(
  canvas: HTMLCanvasElement,
  camera: Camera,
  getWorld: () => World | null,
  getOffset: () => { x: number; y: number },
): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let dragging = false;
  let start = { x: 0, y: 0, panX: 0, panY: 0 };
  let pinchStartDist = 0;
  let pinchStartZoom = camera.zoom;
  let wheelAcc = 0;

  const dpr = () => window.devicePixelRatio || 1;

  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = false;
      start = { x: e.clientX, y: e.clientY, panX: camera.panX, panY: camera.panY };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartZoom = camera.zoom;
    }
  };

  const onMove = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStartDist > 0) {
        const next = Math.round(pinchStartZoom * (dist / pinchStartDist));
        camera.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
      }
      dragging = true;
      return;
    }

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragging && Math.hypot(dx, dy) * dpr() > TAP_SLOP_PX) dragging = true;
    if (dragging) {
      camera.panX = start.panX + dx * dpr();
      camera.panY = start.panY + dy * dpr();
    }
  };

  const onUp = (e: PointerEvent) => {
    const wasPinch = pointers.size >= 2;
    pointers.delete(e.pointerId);
    if (dragging || wasPinch) {
      if (pointers.size === 0) dragging = false;
      return;
    }
    // tap
    const world = getWorld();
    if (!world) return;
    const rect = canvas.getBoundingClientRect();
    const d = dpr();
    const deviceX = (e.clientX - rect.left) * d;
    const deviceY = (e.clientY - rect.top) * d;
    const off = getOffset();
    world.tapAt((deviceX - off.x) / camera.zoom, (deviceY - off.y) / camera.zoom);
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) > 60) {
      camera.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom - Math.sign(wheelAcc)));
      wheelAcc = 0;
    }
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    canvas.removeEventListener('wheel', onWheel);
  };
}

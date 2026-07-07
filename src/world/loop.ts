/** requestAnimationFrame game loop with clamped dt. */

const MAX_DT = 0.1;

export interface LoopCallbacks {
  update: (dt: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}

export function startLoop(canvas: HTMLCanvasElement, cb: LoopCallbacks): () => void {
  const ctx = canvas.getContext('2d')!;
  let last = 0;
  let raf = 0;
  let stopped = false;

  const frame = (time: number) => {
    if (stopped) return;
    const dt = last === 0 ? 0 : Math.min((time - last) / 1000, MAX_DT);
    last = time;
    cb.update(dt);
    ctx.imageSmoothingEnabled = false;
    cb.render(ctx);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}

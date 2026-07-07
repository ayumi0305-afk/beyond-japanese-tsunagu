/** Hosts the canvas world. React renders this once; everything inside is imperative. */
import { useEffect, useRef } from 'react';

import { communityScript, seedCommunity } from '../data/community';
import { STUDY_ROOM } from '../data/studyRoom';
import { getDayLight } from '../world/ambient';
import { attachInput, Camera } from '../world/camera';
import { startLoop } from '../world/loop';
import { renderWorld } from '../world/render';
import { World, type WorldEvents } from '../world/world';

interface Props {
  events: WorldEvents;
  onWorld: (world: World) => void;
}

export function WorldCanvas({ events, onWorld }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep latest event handlers without rebuilding the world
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const world = new World(STUDY_ROOM, {
      onSeatTapped: (seat) => eventsRef.current.onSeatTapped(seat),
      onSessionStart: () => eventsRef.current.onSessionStart(),
      onSessionEnd: (m) => eventsRef.current.onSessionEnd(m),
      onToast: (t) => eventsRef.current.onToast(t),
    });
    seedCommunity(world);
    world.addSimEvents(communityScript());
    onWorld(world);

    const camera = new Camera();
    let fitted = false;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      camera.fit(canvas.width, canvas.height, world.scene.layout.cols, world.scene.layout.rows);
      fitted = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let light = getDayLight();
    let lightTimer = 0;

    const getOffset = () =>
      camera.offset(canvas.width, canvas.height, world.scene.layout.cols, world.scene.layout.rows);

    const detachInput = attachInput(canvas, camera, () => world, getOffset);

    // Dev-only observability for e2e tests (never present in production builds)
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__tsunagu = { world, camera, getOffset };
    }

    const stop = startLoop(canvas, {
      update: (dt) => {
        world.update(dt);
        lightTimer += dt;
        if (lightTimer > 30) {
          lightTimer = 0;
          light = getDayLight();
        }
        if (fitted) {
          camera.follow(
            world.me.x,
            world.me.y,
            canvas.width,
            canvas.height,
            world.scene.layout.cols,
            world.scene.layout.rows,
          );
        }
      },
      render: (ctx) => {
        const off = getOffset();
        renderWorld(
          ctx,
          canvas.width,
          canvas.height,
          world,
          off.x,
          off.y,
          camera.zoom,
          light,
          window.devicePixelRatio || 1,
        );
      },
    });

    return () => {
      stop();
      detachInput();
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="world-container">
      <canvas ref={canvasRef} className="world-canvas" />
    </div>
  );
}

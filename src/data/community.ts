/**
 * Simulated classmates for phase 1 (single-player feel).
 * Phase 2 replaces this file with server presence events — the World API
 * calls (spawnSeated / arrive / depart / addArtifact) stay identical.
 */
import { SENSEI_SPOT } from './studyRoom';
import type { SimEvent, World } from '../world/world';
import { PALETTES } from '../world/world';

export function seedCommunity(world: World): void {
  world.spawnSensei(SENSEI_SPOT.col, SENSEI_SPOT.row);

  // Marco is already at the table when you arrive
  world.spawnSeated('marco', 'Marco', PALETTES.marco, 's2', 'カタカナのメニュー');

  // Yuki studied here this morning — her cup is still warm
  world.addArtifact('s6', 'Yuki · けさ30分', 0.55);
}

export function communityScript(): SimEvent[] {
  return [
    {
      at: 1.2,
      run: (w) => w.say('sensei', 'いらっしゃい。すきな せきに どうぞ', 7),
    },
    {
      at: 40,
      run: (w) => w.arrive('ben', 'Ben', PALETTES.ben, 's7', 'きく れんしゅう'),
    },
    {
      at: 300,
      run: (w) => w.depart('marco', '45分'),
    },
    {
      at: 420,
      run: (w) => w.arrive('aki', 'Aki', PALETTES.yuki, 's3', '旅行の じゅんび'),
    },
  ];
}

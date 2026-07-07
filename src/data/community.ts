/**
 * Simulated classmates for phase 1 (single-player feel).
 * Phase 2 replaces this file with server presence events — the World API
 * calls (spawnSeated / arrive / depart / addArtifact) stay identical.
 */
import { CAFE_SENSEI_SPOT, SENSEI_NOTES } from './cafe';
import type { SimEvent, World } from '../world/world';
import { PALETTES } from '../world/world';

export function seedCommunity(world: World): void {
  // sensei is in her café
  world.spawnSensei('cafe', CAFE_SENSEI_SPOT.col, CAFE_SENSEI_SPOT.row);

  // Marco is already at the Study Room table
  world.spawnSeated('studyRoom', 'marco', 'Marco', PALETTES.marco, 's2', 'カタカナのメニュー');

  // Yuki studied there this morning — her cup is still warm
  world.addArtifact('studyRoom', 's6', 'Yuki · けさ30分', 0.55);

  // Hana is out strolling the campus
  const hana = { ...PALETTES.yuki, cloth: '#7A8B5C', clothDark: '#617048' };
  world.arriveStroller('campus', 'hana', 'Hana', hana, 24, 19);
}

export function communityScript(): SimEvent[] {
  let note = 0;
  const script: SimEvent[] = [
    {
      at: 40,
      run: (w) => w.arrive('studyRoom', 'ben', 'Ben', PALETTES.ben, 's7', 'きく れんしゅう'),
    },
    {
      at: 300,
      run: (w) => w.depart('marco', '45分'),
    },
    {
      at: 420,
      run: (w) => w.arrive('studyRoom', 'aki', 'Aki', PALETTES.yuki, 's3', '旅行の じゅんび'),
    },
  ];
  // sensei murmurs her daily words in the café every so often
  for (let t = 2; t < 900; t += 75) {
    const i = note++;
    script.push({ at: t, run: (w) => w.say('sensei', SENSEI_NOTES[i % SENSEI_NOTES.length], 8) });
  }
  return script.sort((a, b) => a.at - b.at);
}

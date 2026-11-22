import type { HexId, Point } from '../../shared/layout';
import { graphOf } from '../../shared/scenario';
import type { PlayerView } from '../../shared/redact';
import { RESOURCES, TERRAIN_YIELD, type PlayerId, type Resource } from '../../shared/types';
import type { SoundCue } from '../audio/sound';

/** One card travelling from the hex that produced it to the player who got it. */
export type Flight = {
  hex: HexId;
  /** The hex centre in board (SVG) units, for the flat board. */
  pos: Point;
  player: PlayerId;
  resource: Resource;
};

/** A roll as the UI animates it: numbered so the same result twice still replays. */
export type RollFx = RollEvent & { id: number };

export type RollEvent = {
  dice: [number, number];
  /** Hexes that paid out (token matches, robber not on it). */
  producing: HexId[];
  flights: Flight[];
};

/**
 * Work out what a roll did by comparing two consecutive views. The server sends
 * only state, never events, so this is the client's only way to know "a 6 was
 * rolled and Ann got two bricks" — and it must never claim more than actually
 * changed: planned payouts are capped by the real hand changes, which also
 * covers the bank running short.
 */
export function detectRoll(prev: PlayerView | null, next: PlayerView): RollEvent | null {
  if (!prev || !prev.mustRoll || next.mustRoll || !next.dice) return null;
  const total = next.dice[0] + next.dice[1];
  if (total === 7) return { dice: next.dice, producing: [], flights: [] };

  const board = next.board;
  const g = graphOf(board);
  const producing = g.hexes.filter((h) => board.hexes[h].token === total && h !== board.robber);

  // What each player *would* get, hex by hex.
  const planned: Flight[] = [];
  for (const hex of producing) {
    const resource = TERRAIN_YIELD[board.hexes[hex].terrain];
    if (!resource) continue;
    for (const v of g.hexVertices[hex]) {
      const b = board.buildings[v];
      if (!b) continue;
      for (let i = 0; i < (b.type === 'city' ? 2 : 1); i++) planned.push({ hex, pos: g.hexPos[hex], player: b.owner, resource });
    }
  }

  // Cap by what really arrived: exact per resource for the viewer, card count for everyone else.
  const budget = new Map<string, number>();
  for (const p of next.players) {
    const before = prev.players.find((q) => q.id === p.id)?.handSize ?? p.handSize;
    budget.set(p.id, Math.max(0, p.handSize - before));
  }
  if (prev.you && next.you) {
    for (const r of RESOURCES) {
      budget.set(`${next.you.id}/${r}`, Math.max(0, next.you.resources[r] - prev.you.resources[r]));
    }
  }

  const mine = next.you?.id;
  const flights = planned.filter((f) => {
    const key = f.player === mine ? `${f.player}/${f.resource}` : f.player;
    const left = budget.get(key) ?? 0;
    if (left <= 0) return false;
    budget.set(key, left - 1);
    return true;
  });

  return { dice: next.dice, producing, flights };
}

/** Sound cues for public state changes; never infer events from localized log text. */
export function detectSoundCues(prev: PlayerView | null, next: PlayerView): SoundCue[] {
  if (!prev || prev.board.map !== next.board.map || prev.you?.id !== next.you?.id) return [];

  const cues: SoundCue[] = [];
  const roll = detectRoll(prev, next);
  if (roll) {
    cues.push('roll');
    if (roll.flights.length > 0) cues.push('resource');
  }

  const builtRoad = Object.entries(next.board.roads).some(
    ([edge, road]) => prev.board.roads[edge]?.owner !== road.owner,
  );
  const builtBuilding = Object.entries(next.board.buildings).some(([vertex, building]) => {
    const before = prev.board.buildings[vertex];
    return !before || before.owner !== building.owner || before.type !== building.type;
  });
  if (builtRoad || builtBuilding) cues.push('build');
  if (prev.board.robber !== next.board.robber) cues.push('robber');
  if (prev.winner === null && next.winner !== null) cues.push('victory');
  return cues;
}

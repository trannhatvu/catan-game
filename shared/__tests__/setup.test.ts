import { describe, it, expect } from 'vitest';
import { BOARD, hexDistance, parseHexId } from '../layout';
import { makeRng } from '../rng';
import { generateBoard } from '../setup';
import { BASE_GAME, BEGINNER, MAPS, RED_TOKENS, graphFor } from '../scenario';

const boards = Array.from({ length: 300 }, (_, i) => generateBoard(makeRng(i + 1)));

function letterOrderHexes(): string[] {
  const coords = BOARD.hexes.map((id) => ({ id, coord: parseHexId(id) }));
  const radius = Math.max(...coords.map(({ coord }) => hexDistance(coord, { q: 0, r: 0 })));
  const order: string[] = [];

  for (let distance = radius; distance > 0; distance--) {
    const ring = coords
      .filter(({ coord }) => hexDistance(coord, { q: 0, r: 0 }) === distance)
      .sort((a, b) => {
        const angle = ({ q, r }: { q: number; r: number }) =>
          Math.atan2(1.5 * r, Math.sqrt(3) * (q + r / 2));
        return angle(b.coord) - angle(a.coord);
      });
    const start = ring.findIndex(({ coord }) => coord.q === 0 && coord.r === -distance);
    order.push(...ring.slice(start).map(({ id }) => id), ...ring.slice(0, start).map(({ id }) => id));
  }
  return [...order, '0,0'];
}

describe('board generation', () => {
  it('deals the exact component supply every time', () => {
    for (const b of boards) {
      const terrains = BOARD.hexes.map((h) => b.hexes[h].terrain).sort();
      expect(terrains).toEqual([...BASE_GAME.terrains].sort());

      const tokens = BOARD.hexes.map((h) => b.hexes[h].token).filter((t): t is number => t !== null);
      expect(tokens.sort((x, y) => x - y)).toEqual([...BASE_GAME.tokens].sort((x, y) => x - y));
      expect(tokens).not.toContain(7);
    }
  });

  it('leaves the desert empty and parks the robber on it', () => {
    for (const b of boards) {
      expect(b.hexes[b.robber].terrain).toBe('desert');
      expect(b.hexes[b.robber].token).toBeNull();
    }
  });

  it('never puts two red tokens side by side', () => {
    for (const b of boards) {
      const reds = BOARD.hexes.filter((h) => b.hexes[h].token !== null && RED_TOKENS.has(b.hexes[h].token!));
      for (let i = 0; i < reds.length; i++) {
        for (let j = i + 1; j < reds.length; j++) {
          expect(hexDistance(parseHexId(reds[i]), parseHexId(reds[j]))).not.toBe(1);
        }
      }
    }
  });

  it('places Classic number discs counterclockwise in letter order, skipping the desert', () => {
    const order = letterOrderHexes();
    for (const board of boards) {
      expect(
        order
          .filter((h) => board.hexes[h].terrain !== 'desert')
          .map((h) => board.hexes[h].token),
      ).toEqual(BASE_GAME.tokens);
    }
  });

  it('places 9 non-touching harbours on the coastline', () => {
    for (const b of boards) {
      expect(b.ports).toHaveLength(9);
      expect(b.ports.map((p) => p.type).sort()).toEqual([...BASE_GAME.ports].sort());

      const edges = b.ports.map((p) => p.edge);
      expect(new Set(edges).size).toBe(9);
      for (const e of edges) expect(BOARD.boundaryRing).toContain(e);

      // No harbour shares a vertex with another, so no settlement gets two ports.
      const seen = new Set<string>();
      for (const p of b.ports) {
        for (const v of p.vertices) {
          expect(seen.has(v)).toBe(false);
          seen.add(v);
        }
      }
    }
  });

  it('is deterministic for a given seed', () => {
    expect(generateBoard(makeRng(42))).toEqual(generateBoard(makeRng(42)));
  });
});

describe('maps', () => {
  it.each(Object.values(MAPS))('$name deals a legal board on its own island', (map) => {
    const g = graphFor(map.id);
    expect(g.hexes).toHaveLength(map.terrains.length);
    // Euler for a disc of hexes: one connected island, no lakes.
    expect(Object.keys(g.vertices).length - Object.keys(g.edges).length + g.hexes.length).toBe(1);
    for (let seed = 1; seed <= 50; seed++) {
      const b = generateBoard(makeRng(seed), map);
      expect(b.map).toBe(map.id);
      expect(g.hexes.map((h) => b.hexes[h].terrain).sort()).toEqual([...map.terrains].sort());
      const reds = g.hexes.filter((h) => RED_TOKENS.has(b.hexes[h].token ?? 0));
      for (const a of reds) for (const c of reds) expect(hexDistance(parseHexId(a), parseHexId(c))).not.toBe(1);
      const portVertices = b.ports.flatMap((p) => p.vertices);
      expect(b.ports).toHaveLength(map.ports.length);
      expect(new Set(portVertices).size).toBe(portVertices.length);
      for (const p of b.ports) expect(g.boundaryRing).toContain(p.edge);
    }
  });

  it('fixed-board option keeps the same layout every game', () => {
    expect(generateBoard(makeRng(1), BEGINNER).hexes).toEqual(generateBoard(makeRng(2), BEGINNER).hexes);
    expect(generateBoard(makeRng(1), BEGINNER).hexes['0,0'].terrain).toBe('desert');
  });
});

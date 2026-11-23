import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SEATS,
  act,
  createRoom,
  enablePersistence,
  getRoom,
  joinRoom,
  leaveRoom,
  markDisconnected,
  rejoinRoom,
  resetRooms,
  roomCount,
  roomsSnapshot,
  saveRooms,
  setMap,
  startGame,
  sweepStaleRooms,
  type Room,
  type Seat,
} from '../rooms';
import { legalMoves } from '../../shared/rules';

/**
 * The room store is a single in-memory Map keyed by code. These tests are about
 * that store rather than the socket layer: that several games can run side by
 * side without touching each other, and that seats and rooms are freed rather
 * than leaked.
 */

let socketCounter = 0;
const nextSocket = () => `sock-${socketCounter++}`;

function seatOf(result: { room: Room; seat: Seat } | string): { room: Room; seat: Seat } {
  if (typeof result === 'string') throw new Error(`expected a seat, got: ${result}`);
  return result;
}

function rollForStartingPlayer(room: Room): void {
  let guard = 0;
  while (room.state?.phase === 'initiative' && guard++ < 100) {
    const who = room.state.players[room.state.current].id;
    const error = act(room, who, { type: 'rollForStart' });
    if (error) throw new Error(error);
  }
  if (room.state?.phase === 'initiative') throw new Error('initiative roll-off did not finish');
}

/** Open a room with `names[0]` hosting and the rest joining. */
function openRoom(names: string[]): { room: Room; seats: Seat[] } {
  const host = createRoom(names[0], nextSocket());
  const seats = [host.seat];
  for (const name of names.slice(1)) seats.push(seatOf(joinRoom(host.room.code, name, nextSocket())).seat);
  return { room: host.room, seats };
}

beforeEach(() => {
  resetRooms();
});

describe('the in-memory room store', () => {
  it('keeps concurrent games completely separate', () => {
    const a = openRoom(['Ann', 'Bob']);
    const b = openRoom(['Cid', 'Dee', 'Eve']);

    expect(roomCount()).toBe(2);
    expect(a.room.code).not.toBe(b.room.code);

    expect(startGame(a.room, a.seats[0].playerId)).toBeNull();
    expect(startGame(b.room, b.seats[0].playerId)).toBeNull();

    // Two boards dealt independently.
    expect(a.room.state!.players).toHaveLength(2);
    expect(b.room.state!.players).toHaveLength(3);
    expect(a.room.state!.board.hexes).not.toEqual(b.room.state!.board.hexes);

    // A move in one game does not touch the other.
    rollForStartingPlayer(a.room);
    const before = structuredClone(b.room.state!);
    const who = a.room.state!.players[a.room.state!.current].id;
    const spot = legalMoves(a.room.state!, who).settlementSpots[0];
    expect(act(a.room, who, { type: 'placeSetupSettlement', vertex: spot })).toBeNull();

    expect(Object.keys(a.room.state!.board.buildings)).toHaveLength(1);
    expect(b.room.state).toEqual(before);
  });

  it('will not let a player from one room act in another', () => {
    const a = openRoom(['Ann', 'Bob']);
    const b = openRoom(['Cid', 'Dee']);
    startGame(a.room, a.seats[0].playerId);
    startGame(b.room, b.seats[0].playerId);

    // Seat ids are per-room, so p1 exists in both. Acting in the wrong room must
    // still be refused because it is not that room's current player's turn.
    const bTurn = b.room.state!.players[b.room.state!.current].id;
    const other = b.room.state!.players.find((p) => p.id !== bTurn)!.id;
    expect(act(b.room, other, { type: 'rollDice' })).toMatch(/not your turn/i);

    // And an id that exists in no room at all is rejected outright.
    expect(act(b.room, 'p9', { type: 'rollDice' })).toMatch(/not in this game/i);
  });

  it('looks rooms up by code, case and padding insensitively', () => {
    const { room } = openRoom(['Ann', 'Bob']);
    expect(getRoom(room.code.toLowerCase())?.code).toBe(room.code);
    expect(getRoom(`  ${room.code}  `)?.code).toBe(room.code);
    expect(getRoom('NOPE')).toBeUndefined();
    expect(getRoom(undefined)).toBeUndefined();
    expect(getRoom(42)).toBeUndefined();
  });

  it('issues unique codes and unique seat tokens', () => {
    const codes = new Set<string>();
    const tokens = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const { room, seats } = openRoom(['Ann', 'Bob']);
      codes.add(room.code);
      for (const s of seats) tokens.add(s.token);
    }
    expect(codes.size).toBe(60);
    expect(tokens.size).toBe(120);
  });

  it('caps seats and closes the room once the game starts', () => {
    const { room } = openRoom(['A', 'B', 'C', 'D']);
    expect(room.seats).toHaveLength(MAX_SEATS);
    expect(joinRoom(room.code, 'E', nextSocket())).toBe('That game is full.');

    startGame(room, room.seats[0].playerId);
    expect(joinRoom(room.code, 'E', nextSocket())).toBe('That game has already started.');
  });

  it('frees a seat when someone leaves the lobby, and hands the host on', () => {
    const { room, seats } = openRoom(['Ann', 'Bob', 'Cid']);
    expect(room.hostId).toBe(seats[0].playerId);

    leaveRoom(room, seats[0]);
    expect(room.seats.map((s) => s.name)).toEqual(['Bob', 'Cid']);
    expect(room.hostId).toBe(seats[1].playerId);
    expect(roomCount()).toBe(1);

    // The freed id is reused rather than colliding with Cid's.
    expect(seatOf(joinRoom(room.code, 'Dee', nextSocket())).seat.playerId).toBe('p1');
  });

  it('deletes a room once the last person leaves the lobby', () => {
    const { room, seats } = openRoom(['Ann', 'Bob']);
    for (const s of seats) leaveRoom(room, s);
    expect(roomCount()).toBe(0);
  });

  it('keeps a lobby seat through a dropped connection, and lets a newcomer take it when full', () => {
    const { room, seats } = openRoom(['Ann', 'Bob', 'Cid', 'Dee']);
    markDisconnected(seats[0].socketId!);
    expect(room.seats).toHaveLength(4);
    expect(room.hostId).toBe(seats[1].playerId);
    expect(seatOf(rejoinRoom(room.code, seats[0].token, nextSocket())).seat).toBe(seats[0]);

    markDisconnected(seats[3].socketId!);
    const eve = seatOf(joinRoom(room.code, 'Eve', nextSocket())).seat;
    expect(room.seats.map((s) => s.name)).toEqual(['Ann', 'Bob', 'Cid', 'Eve']);
    expect(eve.playerId).toBe('p4');

    // Offline seats are dropped when the board is dealt.
    markDisconnected(seats[2].socketId!);
    expect(startGame(room, room.hostId)).toBeNull();
    expect(room.state!.players.map((p) => p.name)).toEqual(['Ann', 'Bob', 'Eve']);
  });

  it('keeps a game seat when its player goes back to the menu', () => {
    const { room, seats } = openRoom(['Ann', 'Bob']);
    startGame(room, seats[0].playerId);
    leaveRoom(room, seats[1]);
    expect(room.seats).toHaveLength(2);
    expect(seatOf(rejoinRoom(room.code, seats[1].token, nextSocket())).seat).toBe(seats[1]);
  });

  it('holds seats open once a game is under way, and takes them back by token', () => {
    const { room, seats } = openRoom(['Ann', 'Bob']);
    startGame(room, seats[0].playerId);

    markDisconnected(seats[1].socketId!);
    expect(room.seats).toHaveLength(2); // the seat is kept, not freed
    expect(room.state!.players.find((p) => p.id === seats[1].playerId)!.connected).toBe(false);

    const back = seatOf(rejoinRoom(room.code, seats[1].token, nextSocket()));
    expect(back.seat.playerId).toBe(seats[1].playerId);
    expect(room.state!.players.find((p) => p.id === seats[1].playerId)!.connected).toBe(true);

    expect(rejoinRoom(room.code, 'not-a-token', nextSocket())).toMatch(/not in this game/i);
  });

  it('sweeps only rooms that are empty and stale', () => {
    const live = openRoom(['Ann', 'Bob']);
    const abandoned = openRoom(['Cid', 'Dee']);
    startGame(abandoned.room, abandoned.seats[0].playerId);
    for (const s of abandoned.seats) markDisconnected(s.socketId!);

    expect(roomCount()).toBe(2);
    sweepStaleRooms(60 * 60 * 1000); // nothing is an hour old yet
    expect(roomCount()).toBe(2);

    abandoned.room.updatedAt = Date.now() - 5 * 60 * 60 * 1000;
    live.room.updatedAt = Date.now() - 5 * 60 * 60 * 1000;
    sweepStaleRooms(4 * 60 * 60 * 1000);

    // The abandoned game goes; the one people are still sitting in stays.
    expect(roomCount()).toBe(1);
    expect(getRoom(live.room.code)).toBeDefined();
    expect(getRoom(abandoned.room.code)).toBeUndefined();
  });

  it('reports the store without leaking names or tokens', () => {
    const { room, seats } = openRoom(['Ann', 'Bob']);
    startGame(room, seats[0].playerId);
    openRoom(['Cid', 'Dee']);

    const snapshot = roomsSnapshot();
    expect(snapshot).toHaveLength(2);
    const started = snapshot.find((r) => r.code === room.code)!;
    expect(started).toMatchObject({ players: 2, connected: 2, started: true });
    expect(started.ageMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(snapshot)).not.toContain('Ann');
    expect(JSON.stringify(snapshot)).not.toContain(seats[0].token);
  });

  it('refuses to start without enough players, or from a non-host', () => {
    const host = createRoom('Ann', nextSocket());
    expect(startGame(host.room, host.seat.playerId)).toMatch(/at least 2/i);

    const guest = seatOf(joinRoom(host.room.code, 'Bob', nextSocket()));
    expect(startGame(host.room, guest.seat.playerId)).toMatch(/only the host/i);
    expect(startGame(host.room, host.seat.playerId)).toBeNull();
    expect(startGame(host.room, host.seat.playerId)).toMatch(/already started/i);
  });
});

describe('map choice', () => {
  it('only the host picks, only known maps, and the game is dealt on it', () => {
    const { room, seat } = createRoom('Ann', nextSocket());
    const bob = seatOf(joinRoom(room.code, 'Bob', nextSocket())).seat;
    expect(setMap(room, bob.playerId, 'large')).toMatch(/host/i);
    expect(setMap(room, seat.playerId, 'toString')).toMatch(/no such map/i);
    expect(setMap(room, seat.playerId, 'large')).toBeNull();
    expect(startGame(room, seat.playerId)).toBeNull();
    expect(room.state!.board.map).toBe('large');
    expect(Object.keys(room.state!.board.hexes)).toHaveLength(30);
    expect(setMap(room, seat.playerId, 'classic')).toMatch(/already started/i);
  });
});

describe('room persistence', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'catan-room-store-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetRooms();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const file = () => path.join(directory, 'rooms.json');

  it('starts empty when the save file does not exist and creates it on save', () => {
    enablePersistence(file());
    expect(roomCount()).toBe(0);

    createRoom('Ann', nextSocket());
    saveRooms();

    expect(JSON.parse(fs.readFileSync(file(), 'utf8'))).toHaveLength(1);
  });

  it('restores games with all seats marked disconnected', () => {
    enablePersistence(file());
    const { room, seats } = openRoom(['Ann', 'Bob']);
    expect(startGame(room, seats[0].playerId)).toBeNull();
    saveRooms();
    resetRooms();

    enablePersistence(file());

    const restored = getRoom(room.code)!;
    expect(restored.state).not.toBeNull();
    expect(restored.seats.every((seat) => seat.socketId === null)).toBe(true);
    expect(restored.state!.players.every((player) => !player.connected)).toBe(true);
  });

  it('migrates saved games from before initiative, counteroffers, and abandonment', () => {
    const { room, seats } = openRoom(['Ann', 'Bob']);
    expect(startGame(room, seats[0].playerId)).toBeNull();
    room.state!.phase = 'setup';
    room.state!.initiative = null;
    room.state!.setup = {
      round: 1,
      placing: 'settlement',
      lastVertex: null,
      order: room.state!.players.map((player) => player.id),
    };
    const give = { brick: 1, lumber: 0, wool: 0, grain: 0, ore: 0 };
    const want = { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 1 };
    room.state!.trade = {
      from: seats[0].playerId,
      give,
      want,
      responses: { [seats[1].playerId]: 'pending' },
      counter: null,
    };
    const legacy = JSON.parse(JSON.stringify(room)) as Record<string, unknown>;
    const legacyState = legacy.state as Record<string, unknown>;
    delete legacyState.initiative;
    delete legacyState.abandonedBy;
    delete (legacyState.setup as Record<string, unknown>).order;
    delete (legacyState.trade as Record<string, unknown>).counter;
    fs.writeFileSync(file(), JSON.stringify([legacy]));

    enablePersistence(file());
    const restored = getRoom(room.code)!;
    expect(restored.state?.initiative).toBeNull();
    expect(restored.state?.abandonedBy).toBeNull();
    expect(restored.state?.setup?.order).toEqual(seats.map((seat) => seat.playerId));
    expect(restored.state?.trade?.counter).toBeNull();
  });

  it('fails clearly on invalid JSON without clearing the current store', () => {
    const existing = createRoom('Existing', nextSocket());
    fs.writeFileSync(file(), '{');

    expect(() => enablePersistence(file())).toThrow(/not valid JSON/i);
    expect(getRoom(existing.room.code)).toBeDefined();
  });

  it('fails clearly when the save path cannot be read', () => {
    fs.mkdirSync(file());

    expect(() => enablePersistence(file())).toThrow(/failed to read room data/i);
  });

  it('rejects invalid room data without partially loading valid entries', () => {
    const validRoom = createRoom('Ann', nextSocket()).room;
    fs.writeFileSync(file(), JSON.stringify([validRoom, { ...validRoom, code: 'bad!' }]));
    resetRooms();

    expect(() => enablePersistence(file())).toThrow(/invalid structure/i);
    expect(roomCount()).toBe(0);
  });

  it('rejects malformed saved game state before loading any rooms', () => {
    const validRoom = createRoom('Ann', nextSocket()).room;
    const { room, seats } = openRoom(['Bob', 'Cid']);
    expect(startGame(room, seats[0].playerId)).toBeNull();
    room.state!.bank.ore = -1;
    fs.writeFileSync(file(), JSON.stringify([validRoom, room]));
    resetRooms();

    expect(() => enablePersistence(file())).toThrow(/invalid structure/i);
    expect(roomCount()).toBe(0);
  });

  it('preserves the previous save when writing or renaming a new save fails', () => {
    enablePersistence(file());
    createRoom('Ann', nextSocket());
    saveRooms();
    const previousSave = fs.readFileSync(file(), 'utf8');
    createRoom('Bob', nextSocket());

    const write = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('simulated write failure');
    });
    expect(() => saveRooms()).toThrow(/failed to save room data/i);
    expect(fs.readFileSync(file(), 'utf8')).toBe(previousSave);
    write.mockRestore();

    const rename = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('simulated rename failure');
    });
    expect(() => saveRooms()).toThrow(/failed to save room data/i);
    expect(fs.readFileSync(file(), 'utf8')).toBe(previousSave);
    rename.mockRestore();
  });
});

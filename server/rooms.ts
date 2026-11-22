import fs from 'node:fs';
import path from 'node:path';
import { applyAction, createGame } from '../shared/rules';
import { viewFor, type PlayerView } from '../shared/redact';
import { graphFor, MAPS, isMapId, type MapId } from '../shared/scenario';
import {
  RESOURCES,
  type Action,
  type BoardState,
  type DevCardType,
  type GameState,
  type LogEntry,
  type Phase,
  type Player,
  type PlayerId,
  type PortType,
  type ResourceCounts,
  type Terrain,
  type TradeOffer,
} from '../shared/types';

export const MAX_SEATS = 4;
export const MIN_SEATS = 2;

export type Seat = {
  /** Public identity, safe to broadcast. */
  playerId: PlayerId;
  /** Private reconnect secret — never leaves the seat's own socket. */
  token: string;
  name: string;
  socketId: string | null;
};

export type Room = {
  code: string;
  hostId: PlayerId;
  seats: Seat[];
  /** Picked by the host in the lobby. */
  map: MapId;
  state: GameState | null;
  updatedAt: number;
};

export type RoomView = {
  code: string;
  hostId: PlayerId;
  started: boolean;
  map: MapId;
  players: { id: PlayerId; name: string; connected: boolean }[];
};

const rooms = new Map<string, Room>();

// -- persistence -------------------------------------------------------------

let dataFile: string | null = null;

const TERRAIN_TYPES: readonly Terrain[] = ['hills', 'forest', 'pasture', 'fields', 'mountains', 'desert', 'sea', 'gold'];
const DEV_CARD_TYPES: readonly DevCardType[] = ['knight', 'roadBuilding', 'yearOfPlenty', 'monopoly', 'victoryPoint'];
const PORT_TYPES: readonly PortType[] = [...RESOURCES, 'any'];
const PHASES: readonly Phase[] = [
  'lobby',
  'initiative',
  'setup',
  'rolling',
  'discarding',
  'movingRobber',
  'stealing',
  'main',
  'finished',
];

type DataRecord = Record<string, unknown>;

function isRecord(value: unknown): value is DataRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string | number>(value: unknown, values: readonly T[]): value is T {
  return values.some((candidate) => candidate === value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isResourceCounts(value: unknown): value is ResourceCounts {
  return isRecord(value) && RESOURCES.every((resource) => isNonNegativeInteger(value[resource]));
}

function isPlayerRecord(value: unknown, playerIds: Set<string>, validate: (entry: unknown) => boolean): boolean {
  return isRecord(value) && Object.entries(value).every(([id, entry]) => playerIds.has(id) && validate(entry));
}

function isDevCard(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOneOf(value.type, DEV_CARD_TYPES) &&
    isNonNegativeInteger(value.boughtOnTurn) &&
    typeof value.played === 'boolean'
  );
}

function isPlayer(value: unknown): value is Player {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    typeof value.color === 'string' &&
    isNonNegativeInteger(value.seat) &&
    typeof value.connected === 'boolean' &&
    isResourceCounts(value.resources) &&
    Array.isArray(value.devCards) &&
    value.devCards.every(isDevCard) &&
    isNonNegativeInteger(value.knightsPlayed) &&
    isRecord(value.pieces) &&
    isNonNegativeInteger(value.pieces.road) &&
    isNonNegativeInteger(value.pieces.settlement) &&
    isNonNegativeInteger(value.pieces.city)
  );
}

function isPlayerArray(value: unknown): value is Player[] {
  return Array.isArray(value) && value.every(isPlayer);
}

function isLogEntry(value: unknown, playerIds: Set<string>): value is LogEntry {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.id) &&
    isNonNegativeInteger(value.turn) &&
    (value.player === null || (typeof value.player === 'string' && playerIds.has(value.player))) &&
    typeof value.text === 'string'
  );
}

function isTradeOffer(value: unknown, playerIds: Set<string>): value is TradeOffer {
  if (!isRecord(value)) return false;
  const counter = value.counter;
  const counterValid =
    counter === null ||
    (isRecord(counter) &&
      typeof counter.from === 'string' &&
      playerIds.has(counter.from) &&
      counter.from !== value.from &&
      isResourceCounts(counter.give) &&
      isResourceCounts(counter.want));
  const responsesValid = isPlayerRecord(value.responses, playerIds, (response) =>
    isOneOf(response, ['pending', 'accept', 'reject', 'counter']),
  );
  const counterResponseValid =
    counter === null ||
    (isRecord(counter) &&
      typeof counter.from === 'string' &&
      isRecord(value.responses) &&
      value.responses[counter.from] === 'counter');
  return (
    typeof value.from === 'string' &&
    playerIds.has(value.from) &&
    isResourceCounts(value.give) &&
    isResourceCounts(value.want) &&
    responsesValid &&
    counterValid &&
    counterResponseValid
  );
}

function isInitiative(value: unknown, playerIds: Set<string>): boolean {
  if (value === null) return true;
  if (!isRecord(value) || !Array.isArray(value.eligible) || !isRecord(value.rolls)) return false;

  const eligible: string[] = [];
  for (const id of value.eligible) {
    if (typeof id !== 'string' || !playerIds.has(id)) return false;
    eligible.push(id);
  }
  if (eligible.length === 0 || new Set(eligible).size !== eligible.length) return false;

  return Object.entries(value.rolls).every(
    ([id, roll]) => eligible.includes(id) && isNonNegativeInteger(roll) && roll >= 2 && roll <= 12,
  );
}

function isHexState(value: unknown): boolean {
  return (
    isRecord(value) &&
    isOneOf(value.terrain, TERRAIN_TYPES) &&
    (value.token === null || (isNonNegativeInteger(value.token) && value.token >= 2 && value.token <= 12))
  );
}

function isBoardState(value: unknown, playerIds: Set<string>): value is BoardState {
  if (!isRecord(value) || !isMapId(value.map)) return false;

  const graph = graphFor(value.map);
  const hexIds = new Set(graph.hexes);
  const vertexIds = new Set(Object.keys(graph.vertices));
  const edgeIds = new Set(Object.keys(graph.edges));
  const hexes = value.hexes;
  const ports = value.ports;
  const buildings = value.buildings;
  const roads = value.roads;

  return (
    isRecord(hexes) &&
    Object.keys(hexes).length === hexIds.size &&
    graph.hexes.every((hex) => isHexState(hexes[hex])) &&
    Array.isArray(ports) &&
    ports.every(
      (port) =>
        isRecord(port) &&
        isOneOf(port.type, PORT_TYPES) &&
        typeof port.edge === 'string' &&
        edgeIds.has(port.edge) &&
        Array.isArray(port.vertices) &&
        port.vertices.length === 2 &&
        port.vertices.every((vertex) => typeof vertex === 'string' && vertexIds.has(vertex)),
    ) &&
    isRecord(buildings) &&
    Object.entries(buildings).every(
      ([vertex, building]) =>
        vertexIds.has(vertex) &&
        isRecord(building) &&
        typeof building.owner === 'string' &&
        playerIds.has(building.owner) &&
        isOneOf(building.type, ['settlement', 'city']),
    ) &&
    isRecord(roads) &&
    Object.entries(roads).every(
      ([edge, road]) =>
        edgeIds.has(edge) &&
        isRecord(road) &&
        typeof road.owner === 'string' &&
        playerIds.has(road.owner),
    ) &&
    typeof value.robber === 'string' &&
    hexIds.has(value.robber)
  );
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value) || !isPlayerArray(value.players)) return false;

  const players = value.players;
  if (players.length < MIN_SEATS || players.length > MAX_SEATS) return false;
  const playerIds = new Set(players.map((player) => player.id));
  if (playerIds.size !== players.length || !isBoardState(value.board, playerIds)) return false;

  const graph = graphFor(value.board.map);
  const vertexIds = new Set(Object.keys(graph.vertices));
  const diceValid =
    value.dice === null ||
    (Array.isArray(value.dice) &&
      value.dice.length === 2 &&
      value.dice.every((die) => isNonNegativeInteger(die) && die >= 1 && die <= 6));
  const setupValid =
    value.setup === null ||
    (isRecord(value.setup) &&
      isOneOf(value.setup.round, [1, 2]) &&
      isOneOf(value.setup.placing, ['settlement', 'road']) &&
      (value.setup.lastVertex === null ||
        (typeof value.setup.lastVertex === 'string' && vertexIds.has(value.setup.lastVertex))) &&
      Array.isArray(value.setup.order) &&
      value.setup.order.length === players.length &&
      value.setup.order.every((id) => typeof id === 'string' && playerIds.has(id)) &&
      new Set(value.setup.order).size === players.length);
  const initiativeValid = isInitiative(value.initiative, playerIds);
  const tradeValid = value.trade === null || isTradeOffer(value.trade, playerIds);
  const phaseValid =
    isOneOf(value.phase, PHASES) &&
    (value.phase === 'initiative'
      ? value.initiative !== null && initiativeValid && value.setup === null
      : value.initiative === null);

  return (
    phaseValid &&
    isNonNegativeInteger(value.current) &&
    value.current < players.length &&
    isNonNegativeInteger(value.turn) &&
    diceValid &&
    typeof value.mustRoll === 'boolean' &&
    setupValid &&
    initiativeValid &&
    isPlayerRecord(value.pendingDiscards, playerIds, isNonNegativeInteger) &&
    Array.isArray(value.stealTargets) &&
    value.stealTargets.every((id) => typeof id === 'string' && playerIds.has(id)) &&
    isResourceCounts(value.bank) &&
    Array.isArray(value.devDeck) &&
    value.devDeck.every((card) => isOneOf(card, DEV_CARD_TYPES)) &&
    isRecord(value.rng) &&
    isNonNegativeInteger(value.rng.seed) &&
    value.rng.seed <= 0xffffffff &&
    isNonNegativeInteger(value.freeRoads) &&
    typeof value.playedDevThisTurn === 'boolean' &&
    tradeValid &&
    isRecord(value.longestRoad) &&
    (value.longestRoad.owner === null ||
      (typeof value.longestRoad.owner === 'string' && playerIds.has(value.longestRoad.owner))) &&
    isNonNegativeInteger(value.longestRoad.length) &&
    isRecord(value.largestArmy) &&
    (value.largestArmy.owner === null ||
      (typeof value.largestArmy.owner === 'string' && playerIds.has(value.largestArmy.owner))) &&
    isNonNegativeInteger(value.largestArmy.size) &&
    (value.winner === null || (typeof value.winner === 'string' && playerIds.has(value.winner))) &&
    Array.isArray(value.log) &&
    value.log.every((entry) => isLogEntry(entry, playerIds)) &&
    isNonNegativeInteger(value.nextLogId)
  );
}

function migrateRoomData(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  for (const candidate of value) {
    if (!isRecord(candidate) || !isRecord(candidate.state)) continue;
    const state = candidate.state;
    if (!('initiative' in state)) state.initiative = null;
    if (
      state.phase === 'setup' &&
      isRecord(state.setup) &&
      !('order' in state.setup) &&
      Array.isArray(state.players)
    ) {
      state.setup.order = state.players.filter(isRecord).map((player) => player.id);
    }
    if (isRecord(state.trade) && !('counter' in state.trade)) state.trade.counter = null;
  }
  return value;
}

function isSeat(value: unknown): value is Seat {
  return (
    isRecord(value) &&
    typeof value.playerId === 'string' &&
    value.playerId.length > 0 &&
    typeof value.token === 'string' &&
    value.token.length > 0 &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    value.name.length <= 16 &&
    (value.socketId === null || (typeof value.socketId === 'string' && value.socketId.length > 0))
  );
}

function isSeatArray(value: unknown): value is Seat[] {
  return Array.isArray(value) && value.every(isSeat);
}

function isRoom(value: unknown): value is Room {
  if (
    !isRecord(value) ||
    typeof value.code !== 'string' ||
    !/^[A-HJ-NP-Z2-9]{4}$/.test(value.code) ||
    !isSeatArray(value.seats) ||
    value.seats.length === 0 ||
    value.seats.length > MAX_SEATS ||
    typeof value.hostId !== 'string' ||
    !isMapId(value.map) ||
    !isNonNegativeInteger(value.updatedAt)
  ) {
    return false;
  }

  const seatIds = new Set(value.seats.map((seat) => seat.playerId));
  const tokens = new Set(value.seats.map((seat) => seat.token));
  if (seatIds.size !== value.seats.length || tokens.size !== value.seats.length || !seatIds.has(value.hostId)) return false;
  if (value.state === null) return true;
  if (!isGameState(value.state)) return false;

  const statePlayerIds = new Set(value.state.players.map((player) => player.id));
  return (
    value.state.board.map === value.map &&
    statePlayerIds.size === value.seats.length &&
    value.seats.every((seat) => statePlayerIds.has(seat.playerId))
  );
}

function isRoomArray(value: unknown): value is Room[] {
  if (!Array.isArray(value)) return false;
  const roomCodes = new Set<string>();
  const tokens = new Set<string>();
  for (const candidate of value) {
    if (!isRoom(candidate) || roomCodes.has(candidate.code)) return false;
    roomCodes.add(candidate.code);
    for (const seat of candidate.seats) {
      if (tokens.has(seat.token)) return false;
      tokens.add(seat.token);
    }
  }
  return true;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}

/**
 * Load rooms from disk and write them back after every change, so a server
 * restart no longer ends games. Only the real server turns this on; tests keep
 * the store in memory.
 */
export function enablePersistence(file: string): void {
  let contents: string;
  try {
    contents = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (hasErrorCode(error, 'ENOENT')) {
      rooms.clear();
      dataFile = file;
      return;
    }
    throw new Error(`Failed to read room data from ${file}`, { cause: error });
  }

  let saved: unknown;
  try {
    saved = JSON.parse(contents);
  } catch (error) {
    throw new Error(`Room data at ${file} is not valid JSON`, { cause: error });
  }
  saved = migrateRoomData(saved);
  if (!isRoomArray(saved)) throw new Error(`Room data at ${file} has an invalid structure`);

  rooms.clear();
  for (const room of saved) {
    // Nobody is connected to a server that has just started.
    for (const seat of room.seats) seat.socketId = null;
    for (const player of room.state?.players ?? []) player.connected = false;
    rooms.set(room.code, room);
  }
  dataFile = file;
}

/** ponytail: rewrites the whole store on every change; fine for a few dozen rooms, per-room files if it grows. */
export function saveRooms(): void {
  if (!dataFile) return;
  try {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    const tmp = `${dataFile}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([...rooms.values()]));
    fs.renameSync(tmp, dataFile);
  } catch (error) {
    throw new Error(`Failed to save room data to ${dataFile}`, { cause: error });
  }
}

// Unambiguous alphabet: no O/0, no I/1.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomString(length: number, alphabet: string): string {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function newCode(): string {
  let code = randomString(4, CODE_ALPHABET);
  while (rooms.has(code)) code = randomString(4, CODE_ALPHABET);
  return code;
}

function newToken(): string {
  return randomString(24, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
}

function cleanName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim().slice(0, 16) : '';
  return name || 'Player';
}

export function roomView(room: Room): RoomView {
  return {
    code: room.code,
    hostId: room.hostId,
    started: room.state !== null,
    map: room.map,
    players: room.seats.map((s) => ({ id: s.playerId, name: s.name, connected: s.socketId !== null })),
  };
}

export function getRoom(code: unknown): Room | undefined {
  return typeof code === 'string' ? rooms.get(code.trim().toUpperCase()) : undefined;
}

export function createRoom(name: unknown, socketId: string): { room: Room; seat: Seat } {
  const seat: Seat = { playerId: 'p1', token: newToken(), name: cleanName(name), socketId };
  const room: Room = { code: newCode(), hostId: seat.playerId, seats: [seat], map: 'classic', state: null, updatedAt: Date.now() };
  rooms.set(room.code, room);
  return { room, seat };
}

/** Lobby seats of people who went away; a newcomer or the deal may clear them. */
function dropOfflineSeats(room: Room): void {
  room.seats = room.seats.filter((s) => s.socketId !== null);
}

/** Lowest free id, so a seat freed mid-lobby never leaves two players sharing one. */
function freePlayerId(room: Room): PlayerId {
  let i = 1;
  while (room.seats.some((s) => s.playerId === `p${i}`)) i++;
  return `p${i}`;
}

export function joinRoom(code: unknown, name: unknown, socketId: string): { room: Room; seat: Seat } | string {
  const room = getRoom(code);
  if (!room) return 'No game with that code.';
  if (room.state) return 'That game has already started.';
  if (room.seats.length >= MAX_SEATS) dropOfflineSeats(room);
  if (room.seats.length >= MAX_SEATS) return 'That game is full.';

  const seat: Seat = {
    playerId: freePlayerId(room),
    token: newToken(),
    name: cleanName(name),
    socketId,
  };
  room.seats.push(seat);
  room.updatedAt = Date.now();
  return { room, seat };
}

/**
 * Reconnect by secret token. This is what makes a browser refresh survivable:
 * the seat, the hand and the turn order are all still on the server.
 */
export function rejoinRoom(
  code: unknown,
  token: unknown,
  socketId: string,
): { room: Room; seat: Seat; previousSocketId: string | null } | string {
  const room = getRoom(code);
  if (!room) return 'No game with that code.';
  const seat = room.seats.find((s) => s.token === token);
  if (!seat) return 'That seat is not in this game.';

  const previousSocketId = seat.socketId;
  seat.socketId = socketId;
  if (room.state) {
    const player = room.state.players.find((p) => p.id === seat.playerId);
    if (player) player.connected = true;
  }
  room.updatedAt = Date.now();
  return { room, seat, previousSocketId };
}

export function startGame(room: Room, playerId: PlayerId): string | null {
  if (room.hostId !== playerId) return 'Only the host can start the game.';
  if (room.state) return 'The game has already started.';
  if (room.seats.filter((s) => s.socketId !== null).length < MIN_SEATS) return `You need at least ${MIN_SEATS} players.`;
  dropOfflineSeats(room);

  room.state = createGame(
    room.seats.map((s) => ({ id: s.playerId, name: s.name })),
    undefined,
    MAPS[room.map],
  );
  room.updatedAt = Date.now();
  return null;
}

export function setMap(room: Room, playerId: PlayerId, map: unknown): string | null {
  if (room.hostId !== playerId) return 'Only the host can pick the map.';
  if (room.state) return 'The game has already started.';
  if (!isMapId(map)) return 'No such map.';
  room.map = map;
  room.updatedAt = Date.now();
  return null;
}

export function act(room: Room, playerId: PlayerId, action: Action): string | null {
  if (!room.state) return 'The game has not started.';
  const result = applyAction(room.state, playerId, action);
  if (!result.ok) return result.error;
  room.state = result.state;
  room.updatedAt = Date.now();
  return null;
}

function disconnectSeat(room: Room, seat: Seat): void {
  if (seat.socketId === null) return;
  seat.socketId = null;

  if (room.state) {
    const player = room.state.players.find((p) => p.id === seat.playerId);
    if (player) player.connected = false;
  } else if (room.hostId === seat.playerId) {
    const online = room.seats.find((s) => s.socketId !== null);
    if (online) room.hostId = online.playerId;
  }
}

/**
 * A dropped connection keeps the seat, in the lobby as well as in a game, so a
 * refresh or a server restart puts everyone back where they were.
 */
export function markDisconnected(socketId: string): Room[] {
  const touched: Room[] = [];
  for (const room of rooms.values()) {
    const seat = room.seats.find((s) => s.socketId === socketId);
    if (!seat) continue;
    disconnectSeat(room, seat);
    touched.push(room);
  }
  return touched;
}

/**
 * Going back to the menu on purpose. A lobby seat is given up; a seat in a game
 * is kept, so the player can resume it later.
 */
export function leaveRoom(room: Room, seat: Seat): void {
  disconnectSeat(room, seat);
  if (room.state) return;
  room.seats = room.seats.filter((s) => s !== seat);
  if (room.seats.length === 0) rooms.delete(room.code);
  else if (room.hostId === seat.playerId) room.hostId = (room.seats.find((s) => s.socketId !== null) ?? room.seats[0]).playerId;
}

export function viewForSeat(room: Room, seat: Seat): PlayerView | null {
  return room.state ? viewFor(room.state, seat.playerId) : null;
}

/** Drop rooms nobody has touched in a week. */
export function sweepStaleRooms(maxAgeMs = 7 * 24 * 60 * 60 * 1000): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [code, room] of rooms) {
    const anyoneHere = room.seats.some((s) => s.socketId !== null);
    if (!anyoneHere && room.updatedAt < cutoff) rooms.delete(code);
  }
}

export function roomCount(): number {
  return rooms.size;
}

/** A read-only snapshot of the in-memory store, for the status endpoint. */
export type RoomSummary = {
  code: string;
  map: MapId;
  players: number;
  connected: number;
  started: boolean;
  finished: boolean;
  ageMs: number;
};

export function roomsSnapshot(): RoomSummary[] {
  return [...rooms.values()].map((room) => ({
    code: room.code,
    map: room.map,
    players: room.seats.length,
    connected: room.seats.filter((s) => s.socketId !== null).length,
    started: room.state !== null,
    finished: room.state?.phase === 'finished',
    ageMs: Date.now() - room.updatedAt,
  }));
}

/** Test seam: drop every room so one test file cannot leak into the next. */
export function resetRooms(): void {
  rooms.clear();
  dataFile = null;
}

import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import {
  act,
  createRoom,
  enablePersistence,
  getRoomForSeatToken,
  joinRoom,
  leaveRoom,
  markDisconnected,
  rejoinRoom,
  roomView,
  startGame,
  setMap,
  roomsSnapshotForSeatTokens,
  unfinishedRoomCountForSeatTokens,
  saveRooms,
  sweepStaleRooms,
  viewForSeat,
  type Room,
  type Seat,
} from './rooms';
import { MAX_UNFINISHED_ROOMS_PER_USER, type Action } from '../shared/types';

const PORT = Number(process.env.PORT ?? 3001);
const here = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const http = createServer(app);
const io = new Server(http, { cors: { origin: true } });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSeatTokenMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((token) => typeof token === 'string' && token.length > 0);
}

function roomLimitError(seatTokens: Record<string, string>): string | null {
  if (unfinishedRoomCountForSeatTokens(seatTokens) < MAX_UNFINISHED_ROOMS_PER_USER) return null;
  return `You can have at most ${MAX_UNFINISHED_ROOMS_PER_USER} unfinished rooms. Finish one before creating or joining another.`;
}

/** Which seat each live socket is sitting in. */
const sockets = new Map<string, { room: Room; seat: Seat }>();

function currentSeat(socket: Socket): { room: Room; seat: Seat } | undefined {
  const seated = sockets.get(socket.id);
  if (!seated) return undefined;
  if (seated.seat.socketId !== socket.id || !seated.room.seats.includes(seated.seat)) {
    sockets.delete(socket.id);
    return undefined;
  }
  return seated;
}

function releaseSocket(socket: Socket): void {
  const seated = currentSeat(socket);
  if (!seated) return;
  sockets.delete(socket.id);
  leaveRoom(seated.room, seated.seat);
  broadcast(seated.room);
}

/** Save room data and surface persistence failures without exposing game state. */
function persistRooms(room?: Room): boolean {
  try {
    saveRooms();
    return true;
  } catch (error) {
    console.error('Failed to persist room data.', error);
    const message = 'Room changes could not be saved and may be lost if the server stops.';
    if (room) {
      for (const seat of room.seats) {
        if (seat.socketId) io.to(seat.socketId).emit('error:message', message);
      }
    } else {
      io.emit('error:message', message);
    }
    return false;
  }
}

/** Push everyone in a room their own view — each player sees only their own hand. */
function broadcast(room: Room): boolean {
  const persisted = persistRooms(room);
  for (const seat of room.seats) {
    if (!seat.socketId) continue;
    io.to(seat.socketId).emit('sync', {
      room: roomView(room),
      view: viewForSeat(room, seat),
      you: { id: seat.playerId, name: seat.name },
    });
  }
  return persisted;
}

type Ack = (
  response:
    | { ok: true; code: string; token: string; playerId: string; persisted: boolean }
    | { ok: false; error: string },
) => void;

function seatSocket(socket: Socket, room: Room, seat: Seat, ack?: Ack): void {
  const previous = currentSeat(socket);
  if (previous && (previous.room !== room || previous.seat !== seat)) releaseSocket(socket);
  sockets.set(socket.id, { room, seat });
  const persisted = broadcast(room);
  ack?.({ ok: true, code: room.code, token: seat.token, playerId: seat.playerId, persisted });
}

io.on('connection', (socket) => {
  socket.on('room:create', (payload: unknown = {}, ack?: Ack) => {
    if (!isRecord(payload) || !isSeatTokenMap(payload.seats)) {
      return ack?.({ ok: false, error: 'A saved seat-token map is required.' });
    }
    const limitError = roomLimitError(payload.seats);
    if (limitError) return ack?.({ ok: false, error: limitError });
    const { room, seat } = createRoom(payload.name, socket.id);
    seatSocket(socket, room, seat, ack);
  });

  socket.on('room:join', (payload: unknown = {}, ack?: Ack) => {
    if (!isRecord(payload) || !isSeatTokenMap(payload.seats)) {
      return ack?.({ ok: false, error: 'A saved seat-token map is required.' });
    }
    const limitError = roomLimitError(payload.seats);
    if (limitError) return ack?.({ ok: false, error: limitError });
    const result = joinRoom(payload.code, payload.name, socket.id);
    if (typeof result === 'string') return ack?.({ ok: false, error: result });
    seatSocket(socket, result.room, result.seat, ack);
  });

  socket.on('room:rejoin', ({ code, token }: { code?: string; token?: string } = {}, ack?: Ack) => {
    const result = rejoinRoom(code, token, socket.id);
    if (typeof result === 'string') return ack?.({ ok: false, error: result });
    if (result.previousSocketId && result.previousSocketId !== socket.id) {
      sockets.delete(result.previousSocketId);
      const previous = io.sockets.sockets.get(result.previousSocketId);
      previous?.emit('seat:replaced');
      previous?.disconnect(true);
    }
    seatSocket(socket, result.room, result.seat, ack);
  });

  socket.on('room:leave', () => {
    releaseSocket(socket);
  });

  socket.on('game:start', () => {
    const seated = currentSeat(socket);
    if (!seated) return;
    const error = startGame(seated.room, seated.seat.playerId);
    if (error) return socket.emit('error:message', error);
    broadcast(seated.room);
  });

  socket.on('room:map', (map: unknown) => {
    const seated = currentSeat(socket);
    if (!seated) return;
    const error = setMap(seated.room, seated.seat.playerId, map);
    if (error) return socket.emit('error:message', error);
    broadcast(seated.room);
  });

  socket.on('game:action', (action: Action) => {
    const seated = currentSeat(socket);
    if (!seated) return socket.emit('error:message', 'You are not in a game.');
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') return;

    // The engine is the only authority: the client's opinion of legality is
    // irrelevant, and a rejected action changes nothing.
    const error = act(seated.room, seated.seat.playerId, action);
    if (error) return socket.emit('error:message', error);
    broadcast(seated.room);
  });

  socket.on('disconnect', () => {
    const seated = currentSeat(socket);
    sockets.delete(socket.id);
    if (!seated) return;
    for (const room of markDisconnected(socket.id)) broadcast(room);
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/rooms', (_req, res) => {
  res.status(405).set('Allow', 'POST').json({ error: 'Seat tokens are required.' });
});

app.post('/api/rooms', express.json(), (req, res) => {
  const body: unknown = req.body;
  const seats = isRecord(body) ? body.seats : undefined;
  if (!isSeatTokenMap(seats)) {
    return res.status(400).json({ error: 'A saved seat-token map is required.' });
  }
  const rooms = roomsSnapshotForSeatTokens(seats);
  res.json({ count: rooms.length, rooms });
});

app.get('/api/room/:code', (_req, res) => {
  res.status(405).set('Allow', 'POST').json({ error: 'A seat token is required.' });
});

app.post('/api/room/:code', express.json(), (req, res) => {
  const body: unknown = req.body;
  if (!isRecord(body) || typeof body.token !== 'string' || body.token.length === 0) {
    return res.status(400).json({ error: 'A seat token is required.' });
  }
  const room = getRoomForSeatToken(req.params.code, body.token);
  if (!room) return res.status(404).json({ error: 'not found' });
  res.json(roomView(room));
});

// In production the built client is served from the same process, so there is
// one thing to run and one port to open.
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(here, '..', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

setInterval(() => {
  sweepStaleRooms();
  persistRooms();
}, 15 * 60 * 1000).unref();

/** Exported so tests can run the real server on an ephemeral port. */
export function start(port: number = PORT): Promise<number> {
  return new Promise((resolve) => {
    http.listen(port, () => {
      const address = http.address();
      const actual = typeof address === 'object' && address ? address.port : port;
      resolve(actual);
    });
  });
}

export function stop(): Promise<void> {
  return new Promise((resolve) => {
    io.close(() => resolve());
  });
}

// Only listen when run directly, so importing this module in a test does not
// grab the production port.
const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entry === fileURLToPath(import.meta.url)) {
  enablePersistence(process.env.CATAN_DATA ?? path.resolve(here, '..', 'data', 'rooms.json'));
  void start().then((port) => console.log(`Catan server listening on http://localhost:${port}`));
}

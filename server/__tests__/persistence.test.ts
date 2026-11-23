import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { start, stop } from '../index';
import { enablePersistence, resetRooms } from '../rooms';

type RoomAck =
  | { ok: true; code: string; token: string; playerId: string; persisted: boolean }
  | { ok: false; error: string };

let directory = '';
let dataFile = '';
let url = '';
const sockets: Socket[] = [];

async function connectedSocket(): Promise<Socket> {
  const socket = connect(url, { transports: ['websocket'], forceNew: true });
  sockets.push(socket);
  if (!socket.connected) {
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
  }
  return socket;
}

function enter(socket: Socket, event: 'room:create' | 'room:join', payload: object): Promise<RoomAck> {
  return new Promise((resolve) => socket.emit(event, payload, (response: RoomAck) => resolve(response)));
}

beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'catan-persistence-server-'));
  dataFile = path.join(directory, 'rooms.json');
  enablePersistence(dataFile);
  const port = await start(0);
  url = `http://localhost:${port}`;
});

afterAll(async () => {
  for (const socket of sockets) socket.close();
  await stop();
  vi.restoreAllMocks();
  resetRooms();
  fs.rmSync(directory, { recursive: true, force: true });
});

describe('persistence failures over sockets', () => {
  it('warns clients and reports that a room update was not persisted', async () => {
    const host = await connectedSocket();
    const guest = await connectedSocket();
    const errors: string[] = [];
    guest.on('error:message', (message: string) => errors.push(message));

    const created = await enter(host, 'room:create', { name: 'Ann', seats: {} });
    expect(created).toMatchObject({ ok: true, persisted: true });
    if (!created.ok) throw new Error(created.error);
    const previousSave = fs.readFileSync(dataFile, 'utf8');

    const loggedError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rename = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw new Error('simulated rename failure');
    });
    const joined = await enter(guest, 'room:join', { code: created.code, name: 'Bob', seats: {} });
    rename.mockRestore();

    expect(joined).toMatchObject({ ok: true, persisted: false });
    expect(errors).toContain('Room changes could not be saved and may be lost if the server stops.');
    expect(loggedError).toHaveBeenCalledWith('Failed to persist room data.', expect.any(Error));
    expect(fs.readFileSync(dataFile, 'utf8')).toBe(previousSave);
    loggedError.mockRestore();
  });
});

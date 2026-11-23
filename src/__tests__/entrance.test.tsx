import { describe, expect, it } from 'vitest';
import type { RoomSummary } from '../../server/rooms';
import { roomsForSavedSeats } from '../ui/Entrance';

function room(code: string, finished = false): RoomSummary {
  return {
    code,
    map: 'classic',
    players: 2,
    connected: 1,
    started: finished,
    finished,
    ageMs: 0,
  };
}

describe('entrance room visibility', () => {
  it('shows only rooms with a saved seat, including finished games', () => {
    const rooms = [room('ABCD'), room('EFGH'), room('IJKL', true)];
    const seats = { ABCD: 'seat-token', IJKL: 'another-token' };

    expect(roomsForSavedSeats(rooms, seats).map(({ code }) => code)).toEqual(['ABCD', 'IJKL']);
  });
});

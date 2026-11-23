import { describe, expect, it } from 'vitest';
import type { RoomSummary } from '../../server/rooms';
import { MAX_UNFINISHED_ROOMS_PER_USER } from '../../shared/types';
import { hasReachedUnfinishedRoomLimit, roomsForSavedSeats } from '../ui/Entrance';

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

  it('counts unfinished rooms toward the limit but ignores finished ones', () => {
    const active = Array.from({ length: MAX_UNFINISHED_ROOMS_PER_USER }, (_, i) => room(`A${i}`));

    expect(hasReachedUnfinishedRoomLimit([...active, room('DONE', true)])).toBe(true);
    expect(hasReachedUnfinishedRoomLimit(active.slice(1))).toBe(false);
  });
});

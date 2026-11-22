import { describe, expect, it } from 'vitest';
import {
  INITIAL_BOARD_TRANSFORM,
  clampBoardTransform,
  panBoardTransform,
  pinchBoardTransform,
  zoomBoardTransform,
} from '../board/useBoardViewport';

const size = { width: 400, height: 300 };

describe('2D board pan and zoom transforms', () => {
  it('clamps pan so the board stays near the viewport', () => {
    expect(clampBoardTransform({ x: 1000, y: -1000, scale: 2 }, size)).toEqual({
      x: 248,
      y: -198,
      scale: 2,
    });
    expect(panBoardTransform(INITIAL_BOARD_TRANSFORM, 1000, -1000, size)).toEqual({
      x: 48,
      y: -48,
      scale: 1,
    });
  });

  it('keeps the point under the cursor fixed while zooming', () => {
    const pointer = { x: 300, y: 100 };
    const zoomed = zoomBoardTransform(INITIAL_BOARD_TRANSFORM, 2, pointer, size);

    expect(zoomed.scale).toBe(2);
    expect((pointer.x - size.width / 2 - zoomed.x) / zoomed.scale).toBe(
      (pointer.x - size.width / 2) / INITIAL_BOARD_TRANSFORM.scale,
    );
    expect((pointer.y - size.height / 2 - zoomed.y) / zoomed.scale).toBe(
      (pointer.y - size.height / 2) / INITIAL_BOARD_TRANSFORM.scale,
    );
  });

  it('combines pinch zoom with movement of the two-finger center', () => {
    expect(
      pinchBoardTransform(
        INITIAL_BOARD_TRANSFORM,
        2,
        { x: 100, y: 150 },
        { x: 200, y: 150 },
        size,
      ),
    ).toEqual({ x: 200, y: 0, scale: 2 });
  });
});

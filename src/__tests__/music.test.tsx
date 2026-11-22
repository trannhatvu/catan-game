import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createGame } from '../../shared/rules';
import { viewFor } from '../../shared/redact';
import type { TradeOffer } from '../../shared/types';
import { BackgroundMusicPlayer, MUSIC_TRACKS, musicSceneFor, type MusicAudio } from '../audio/music';
import { loadMusicPreferences, saveMusicPreferences } from '../audio/useMusic';
import { MusicControl } from '../ui/MusicControl';

const STORAGE_KEY = 'catan.music';

function stubStorage() {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  vi.stubGlobal('window', { localStorage });
  return values;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('music preferences', () => {
  it('defaults to muted and persists bounded volume', () => {
    stubStorage();
    expect(loadMusicPreferences()).toEqual({ enabled: false, volume: 0.12 });

    saveMusicPreferences({ enabled: true, volume: 1.5 });
    expect(loadMusicPreferences()).toEqual({ enabled: true, volume: 1 });
  });

  it('normalizes invalid stored settings', () => {
    const values = stubStorage();
    values.set(STORAGE_KEY, '{"enabled":"yes","volume":-1}');
    expect(loadMusicPreferences()).toEqual({ enabled: false, volume: 0 });
  });
});

describe('music scenes', () => {
  const view = viewFor(
    createGame(
      [
        { id: 'A', name: 'Ann' },
        { id: 'B', name: 'Bob' },
      ],
      42,
    ),
    'A',
  );

  it('selects menu, normal, trading, and late-game tracks from public state', () => {
    expect(musicSceneFor(false, null)).toBe('menu');
    expect(musicSceneFor(true, view)).toBe('game');

    const trade: TradeOffer = {
      from: 'A',
      give: { brick: 1, lumber: 0, wool: 0, grain: 0, ore: 0 },
      want: { brick: 0, lumber: 1, wool: 0, grain: 0, ore: 0 },
      responses: { A: 'pending', B: 'pending' },
      counter: null,
    };
    expect(musicSceneFor(true, { ...view, trade })).toBe('trading');
    expect(musicSceneFor(true, { ...view, players: [{ ...view.players[0]!, victoryPoints: 8 }, view.players[1]!] })).toBe(
      'lateGame',
    );
    expect(musicSceneFor(true, { ...view, winner: 'A' })).toBe('lateGame');
  });
});

describe('background music player', () => {
  it('plays the scene track and waits before replaying it', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const audio: MusicAudio = {
      src: '',
      volume: 1,
      currentTime: 0,
      preload: '',
      onended: null,
      load: vi.fn(),
      play: vi.fn(async () => {}),
      pause: vi.fn(),
    };
    const reportError = vi.fn();
    const player = new BackgroundMusicPlayer(reportError, () => audio);

    await player.start('game', 0.2);
    expect(audio.src).toBe(MUSIC_TRACKS.game);
    expect(audio.volume).toBe(0.2);
    expect(audio.play).toHaveBeenCalledOnce();

    audio.onended?.(new Event('ended'));
    await vi.advanceTimersByTimeAsync(39_999);
    expect(audio.play).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(audio.play).toHaveBeenCalledTimes(2);

    await player.setScene('trading');
    expect(audio.src).toBe(MUSIC_TRACKS.trading);
    expect(audio.load).toHaveBeenCalledTimes(2);
    expect(audio.play).toHaveBeenCalledTimes(3);

    player.dispose();
    expect(audio.onended).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('surfaces a playback rejection instead of treating it as success', async () => {
    const audio: MusicAudio = {
      src: '',
      volume: 1,
      currentTime: 0,
      preload: '',
      onended: null,
      load: vi.fn(),
      play: vi.fn().mockRejectedValue(new Error('Playback was blocked.')),
      pause: vi.fn(),
    };
    const player = new BackgroundMusicPlayer(vi.fn(), () => audio);

    await expect(player.start('menu', 0.12)).rejects.toThrow('Playback was blocked.');
    expect(audio.pause).toHaveBeenCalled();
    expect(audio.currentTime).toBe(0);
    player.dispose();
  });
});

describe('music controls', () => {
  it('exposes an accessible toggle and volume slider', () => {
    const markup = renderToStaticMarkup(
      <MusicControl
        preferences={{ enabled: false, volume: 0.5 }}
        error={null}
        onToggle={() => {}}
        onVolumeChange={() => {}}
      />,
    );
    expect(markup).toContain('name="audio-settings"');
    expect(markup).toContain('aria-label="Background music settings, music off"');
    expect(markup).toContain('Play music');
    expect(markup).toContain('aria-label="Background music volume"');
    expect(markup).toContain('value="0.5"');
  });
});

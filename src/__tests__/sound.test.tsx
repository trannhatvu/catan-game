import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadSoundPreferences, playSound, saveSoundPreferences, unlockSound } from '../audio/sound';
import { SoundControl } from '../ui/SoundControl';

const STORAGE_KEY = 'catan.sound';

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
});

describe('sound preferences', () => {
  it('defaults to muted and persists an enabled state with a bounded volume', () => {
    stubStorage();
    expect(loadSoundPreferences()).toEqual({ enabled: false, volume: 0.25 });

    saveSoundPreferences({ enabled: true, volume: 1.5 });
    expect(loadSoundPreferences()).toEqual({ enabled: true, volume: 1 });
  });

  it('normalizes invalid stored settings instead of accepting an invalid volume', () => {
    const values = stubStorage();
    values.set(STORAGE_KEY, '{"enabled":"yes","volume":-1}');
    expect(loadSoundPreferences()).toEqual({ enabled: false, volume: 0 });
  });
});

describe('audio playback', () => {
  it('loads local CC0 clips, reports load failures, and plays the dice sequence', async () => {
    const instances: FakeAudioContext[] = [];
    const sources: { start: ReturnType<typeof vi.fn> }[] = [];
    const createGain = () => ({
      gain: { setTargetAtTime: vi.fn() },
      connect: vi.fn(),
    });
    const decodeAudioData = vi.fn(async () => ({ duration: 0.1 }) as AudioBuffer);
    class FakeAudioContext {
      state: 'suspended' | 'running' = 'suspended';
      currentTime = 1;
      destination = {};
      resume = vi.fn(async () => {
        this.state = 'running';
      });
      createGain = vi.fn(createGain);
      decodeAudioData = vi.fn(decodeAudioData);
      createBufferSource = vi.fn(() => {
        const source = {
          buffer: null as AudioBuffer | null,
          connect: vi.fn(),
          start: vi.fn(),
        };
        sources.push(source);
        return source;
      });

      constructor() {
        instances.push(this);
      }
    }

    let failDiceDownload = true;
    const fetchSound = vi.fn(async (input: string) => {
      if (failDiceDownload && input.endsWith('/dice-shake-1.ogg')) {
        return new Response(null, { status: 404 });
      }
      return new Response(new ArrayBuffer(8));
    });
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
    vi.stubGlobal('fetch', fetchSound);
    await expect(unlockSound()).rejects.toThrow(
      'Unable to load sound asset /audio/kenney/casino/dice-shake-1.ogg (404).',
    );

    failDiceDownload = false;
    await unlockSound();
    playSound('roll', 0.5);
    const audio = instances[0];
    if (!audio) throw new Error('test AudioContext was not created');

    expect(audio.resume).toHaveBeenCalledOnce();
    expect(fetchSound.mock.calls.length).toBe(12);
    expect(fetchSound.mock.calls.every(([url]) => url.startsWith('/audio/kenney/'))).toBe(true);
    expect(audio.decodeAudioData).toHaveBeenCalledTimes(11);
    expect(audio.createBufferSource).toHaveBeenCalledTimes(2);
    expect(sources.map((source) => source.start.mock.calls[0]?.[0])).toEqual([1, 1.1]);
  });
});

describe('sound controls', () => {
  it('exposes an accessible toggle and volume slider', () => {
    const markup = renderToStaticMarkup(
      <SoundControl
        preferences={{ enabled: false, volume: 0.5 }}
        error={null}
        onToggle={() => {}}
        onVolumeChange={() => {}}
      />,
    );
    expect(markup).toContain('aria-label="Sound settings, sounds off"');
    expect(markup).toContain('Enable sounds');
    expect(markup).toContain('aria-label="Sound volume"');
    expect(markup).toContain('value="0.5"');
  });
});

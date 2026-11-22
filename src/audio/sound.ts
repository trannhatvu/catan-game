export type SoundCue = 'roll' | 'resource' | 'build' | 'robber' | 'victory';

export type SoundPreferences = {
  enabled: boolean;
  volume: number;
};

const STORAGE_KEY = 'catan.sound';
const DEFAULT_PREFERENCES: SoundPreferences = { enabled: false, volume: 0.25 };

const SOUND_FILES: Record<SoundCue, readonly string[]> = {
  roll: [
    '/audio/kenney/casino/dice-shake-1.ogg',
    '/audio/kenney/casino/dice-throw-1.ogg',
  ],
  resource: ['/audio/kenney/casino/card-place-1.ogg'],
  build: ['/audio/kenney/impact/impactWood_light_000.ogg'],
  robber: ['/audio/kenney/impact/impactSoft_medium_000.ogg'],
  victory: ['/audio/kenney/interface/confirmation_001.ogg'],
};

type SoundBuffers = Record<SoundCue, AudioBuffer[]>;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let buffers: SoundBuffers | null = null;
let loading: Promise<SoundBuffers> | null = null;

function clampVolume(volume: number): number {
  return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_PREFERENCES.volume;
}

export function loadSoundPreferences(): SoundPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PREFERENCES };
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== 'object') return { ...DEFAULT_PREFERENCES };

    const preferences = value as { enabled?: unknown; volume?: unknown };
    return {
      enabled: preferences.enabled === true,
      volume:
        typeof preferences.volume === 'number' && Number.isFinite(preferences.volume)
          ? clampVolume(preferences.volume)
          : DEFAULT_PREFERENCES.volume,
    };
  } catch (error) {
    console.warn('Unable to load sound preferences.', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

export function saveSoundPreferences(preferences: SoundPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: preferences.enabled, volume: clampVolume(preferences.volume) }),
    );
  } catch (error) {
    console.warn('Unable to save sound preferences.', error);
  }
}

function audioNodes(): { context: AudioContext; master: GainNode } {
  let audio = context;
  let output = master;
  if (!audio || !output) {
    if (typeof window === 'undefined' || !window.AudioContext) {
      throw new Error('Web Audio is not available in this browser.');
    }
    audio = new window.AudioContext();
    output = audio.createGain();
    output.connect(audio.destination);
    context = audio;
    master = output;
  }
  return { context: audio, master: output };
}

export async function unlockSound(): Promise<void> {
  const { context: audio } = audioNodes();
  if (audio.state !== 'running') await audio.resume();
  if (audio.state !== 'running') throw new Error('The browser did not enable audio playback.');
  await loadSoundBuffers(audio);
}

async function decodeFiles(audio: AudioContext, files: readonly string[]): Promise<AudioBuffer[]> {
  return Promise.all(
    files.map(async (file) => {
      let response: Response;
      try {
        response = await fetch(file);
      } catch (error) {
        const detail = error instanceof Error ? ` ${error.message}` : '';
        throw new Error(`Unable to fetch sound asset ${file}.${detail}`);
      }
      if (!response.ok) {
        throw new Error(`Unable to load sound asset ${file} (${response.status}).`);
      }

      const data = await response.arrayBuffer();
      try {
        return await audio.decodeAudioData(data);
      } catch (error) {
        const detail = error instanceof Error ? ` ${error.message}` : '';
        throw new Error(`Unable to decode sound asset ${file}.${detail}`);
      }
    }),
  );
}

function loadSoundBuffers(audio: AudioContext): Promise<SoundBuffers> {
  if (buffers) return Promise.resolve(buffers);
  if (!loading) {
    loading = Promise.all([
      decodeFiles(audio, SOUND_FILES.roll),
      decodeFiles(audio, SOUND_FILES.resource),
      decodeFiles(audio, SOUND_FILES.build),
      decodeFiles(audio, SOUND_FILES.robber),
      decodeFiles(audio, SOUND_FILES.victory),
    ])
      .then(([roll, resource, build, robber, victory]) => {
        buffers = { roll, resource, build, robber, victory };
        return buffers;
      })
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
  }
  return loading;
}

export function playSound(cue: SoundCue, volume: number): void {
  const audio = context;
  const output = master;
  const clips = buffers?.[cue];
  if (!audio || !output || !clips || audio.state !== 'running' || volume <= 0) return;

  let startAt = audio.currentTime;
  output.gain.setTargetAtTime(clampVolume(volume) * 0.3, startAt, 0.015);
  for (const clip of clips) {
    const source = audio.createBufferSource();
    source.buffer = clip;
    source.connect(output);
    source.start(startAt);
    startAt += clip.duration;
  }
}

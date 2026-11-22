import type { PlayerView } from '../../shared/redact';

export type MusicScene = 'menu' | 'game' | 'trading' | 'lateGame';

export type MusicPreferences = {
  enabled: boolean;
  volume: number;
};

export const DEFAULT_MUSIC_PREFERENCES: MusicPreferences = { enabled: false, volume: 0.12 };

export const MUSIC_TRACKS: Record<MusicScene, string> = {
  menu: '/audio/music/kings-feast.mp3',
  game: '/audio/music/bards-tale.mp3',
  trading: '/audio/music/market-day.mp3',
  lateGame: '/audio/music/rejoicing.mp3',
};

const MIN_GAP_MS = 20_000;
const MAX_GAP_MS = 60_000;

export function musicSceneFor(started: boolean, view: PlayerView | null): MusicScene {
  if (!started || !view) return 'menu';
  if (view.winner || view.players.some((player) => player.victoryPoints >= 8)) return 'lateGame';
  if (view.trade) return 'trading';
  return 'game';
}

export type MusicAudio = {
  src: string;
  volume: number;
  currentTime: number;
  preload: string;
  onended: ((event: Event) => void) | null;
  load(): void;
  play(): Promise<void>;
  pause(): void;
};

export class BackgroundMusicPlayer {
  private audio: MusicAudio | null = null;
  private scene: MusicScene | null = null;
  private currentTrack: string | null = null;
  private enabled = false;
  private volume = DEFAULT_MUSIC_PREFERENCES.volume;
  private gapTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly reportError: (error: unknown) => void,
    private readonly createAudio: () => MusicAudio = () => new Audio(),
  ) {}

  async start(scene: MusicScene, volume: number): Promise<void> {
    this.scene = scene;
    this.enabled = true;
    this.setVolume(volume);
    this.clearGap();
    try {
      await this.playCurrent();
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  async setScene(scene: MusicScene): Promise<void> {
    if (this.scene === scene) return;
    this.scene = scene;
    this.clearGap();
    if (this.enabled) await this.playCurrent();
  }

  setVolume(volume: number): void {
    this.volume = Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : DEFAULT_MUSIC_PREFERENCES.volume;
    if (this.audio) this.audio.volume = this.volume;
  }

  stop(): void {
    this.enabled = false;
    this.clearGap();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  dispose(): void {
    this.stop();
    if (this.audio) this.audio.onended = null;
    this.audio = null;
  }

  private getAudio(): MusicAudio {
    if (!this.audio) {
      this.audio = this.createAudio();
      this.audio.preload = 'none';
      this.audio.onended = this.handleEnded;
    }
    return this.audio;
  }

  private async playCurrent(): Promise<void> {
    if (!this.enabled || !this.scene) return;

    const audio = this.getAudio();
    const track = MUSIC_TRACKS[this.scene];
    if (this.currentTrack !== track) {
      audio.pause();
      audio.src = track;
      audio.load();
      this.currentTrack = track;
    } else {
      audio.currentTime = 0;
    }
    audio.volume = this.volume;
    await audio.play();
  }

  private readonly handleEnded = (): void => {
    if (!this.enabled || !this.scene) return;
    const endedScene = this.scene;
    const delay = MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS + 1));
    this.gapTimer = setTimeout(() => {
      this.gapTimer = null;
      if (!this.enabled || this.scene !== endedScene) return;
      void this.playCurrent().catch((error: unknown) => {
        this.stop();
        this.reportError(error);
      });
    }, delay);
  };

  private clearGap(): void {
    if (this.gapTimer !== null) clearTimeout(this.gapTimer);
    this.gapTimer = null;
  }
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackgroundMusicPlayer,
  DEFAULT_MUSIC_PREFERENCES,
  type MusicPreferences,
  type MusicScene,
} from './music';

const STORAGE_KEY = 'catan.music';

function clampVolume(volume: number): number {
  return Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : DEFAULT_MUSIC_PREFERENCES.volume;
}

export function loadMusicPreferences(): MusicPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_MUSIC_PREFERENCES };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_MUSIC_PREFERENCES };
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== 'object') return { ...DEFAULT_MUSIC_PREFERENCES };

    const preferences = value as { enabled?: unknown; volume?: unknown };
    return {
      enabled: preferences.enabled === true,
      volume:
        typeof preferences.volume === 'number' && Number.isFinite(preferences.volume)
          ? clampVolume(preferences.volume)
          : DEFAULT_MUSIC_PREFERENCES.volume,
    };
  } catch (error) {
    console.warn('Unable to load music preferences.', error);
    return { ...DEFAULT_MUSIC_PREFERENCES };
  }
}

export function saveMusicPreferences(preferences: MusicPreferences): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled: preferences.enabled, volume: clampVolume(preferences.volume) }),
    );
  } catch (error) {
    console.warn('Unable to save music preferences.', error);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to play background music.';
}

export function useBackgroundMusic(scene: MusicScene) {
  const [preferences, setPreferences] = useState(loadMusicPreferences);
  const [error, setError] = useState<string | null>(null);
  const sceneRef = useRef(scene);
  const preferencesRef = useRef(preferences);
  const activated = useRef(false);
  const player = useRef<BackgroundMusicPlayer | null>(null);
  sceneRef.current = scene;
  preferencesRef.current = preferences;

  const getPlayer = useCallback(() => {
    if (!player.current) {
      player.current = new BackgroundMusicPlayer((reason) => setError(errorMessage(reason)));
    }
    return player.current;
  }, []);

  useEffect(() => {
    saveMusicPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!preferences.enabled || !activated.current) return;
    void getPlayer().setScene(scene).then(
      () => setError(null),
      (reason: unknown) => {
        activated.current = false;
        setError(errorMessage(reason));
      },
    );
  }, [getPlayer, preferences.enabled, scene]);

  useEffect(() => {
    if (!preferences.enabled || activated.current) return;
    const activate = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-music-control]')) return;
      if (activated.current) return;
      activated.current = true;
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
      void getPlayer().start(sceneRef.current, preferencesRef.current.volume).then(
        () => setError(null),
        (reason: unknown) => {
          activated.current = false;
          setError(errorMessage(reason));
        },
      );
    };
    window.addEventListener('pointerdown', activate);
    window.addEventListener('keydown', activate);
    return () => {
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
    };
  }, [getPlayer, preferences.enabled]);

  useEffect(() => () => player.current?.dispose(), []);

  const toggleEnabled = useCallback(async () => {
    if (preferences.enabled) {
      activated.current = false;
      player.current?.stop();
      setPreferences((current) => ({ ...current, enabled: false }));
      setError(null);
      return;
    }
    try {
      await getPlayer().start(sceneRef.current, preferences.volume);
      activated.current = true;
      setPreferences((current) => ({ ...current, enabled: true }));
      setError(null);
    } catch (reason) {
      activated.current = false;
      setError(errorMessage(reason));
    }
  }, [getPlayer, preferences.enabled, preferences.volume]);

  const setVolume = useCallback((volume: number) => {
    const bounded = clampVolume(volume);
    setPreferences((current) => ({ ...current, volume: bounded }));
    player.current?.setVolume(bounded);
  }, []);

  return { preferences, error, toggleEnabled, setVolume };
}

export type BackgroundMusicControls = ReturnType<typeof useBackgroundMusic>;

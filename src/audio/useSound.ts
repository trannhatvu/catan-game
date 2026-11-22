import { useCallback, useEffect, useState } from 'react';
import {
  loadSoundPreferences,
  playSound,
  saveSoundPreferences,
  unlockSound,
  type SoundCue,
  type SoundPreferences,
} from './sound';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to enable sound.';
}

export function useSound() {
  const [preferences, setPreferences] = useState(loadSoundPreferences);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saveSoundPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!preferences.enabled) return;
    let attempted = false;
    const unlock = () => {
      if (attempted) return;
      attempted = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      void unlockSound().then(
        () => setError(null),
        (reason: unknown) => setError(errorMessage(reason)),
      );
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [preferences.enabled]);

  const toggleEnabled = useCallback(async () => {
    if (preferences.enabled) {
      setPreferences((current) => ({ ...current, enabled: false }));
      setError(null);
      return;
    }
    try {
      await unlockSound();
      setPreferences((current) => ({ ...current, enabled: true }));
      setError(null);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [preferences.enabled]);

  const setVolume = useCallback((volume: number) => {
    setPreferences((current) => ({ ...current, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  const play = useCallback(
    (cue: SoundCue) => {
      if (preferences.enabled) playSound(cue, preferences.volume);
    },
    [preferences.enabled, preferences.volume],
  );

  return { preferences, error, toggleEnabled, setVolume, play };
}

export type UseSound = ReturnType<typeof useSound>;
export type { SoundPreferences };

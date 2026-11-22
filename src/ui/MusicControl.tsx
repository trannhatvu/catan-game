import type { MusicPreferences } from '../audio/music';

type MusicControlProps = {
  preferences: MusicPreferences;
  error: string | null;
  onToggle: () => void;
  onVolumeChange: (volume: number) => void;
};

export function MusicControl({ preferences, error, onToggle, onVolumeChange }: MusicControlProps) {
  const { enabled, volume } = preferences;

  return (
    <details className="sound-control music-control" name="audio-settings" data-music-control>
      <summary className="mode-toggle sound-summary" aria-label={`Background music settings, music ${enabled ? 'on' : 'off'}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </summary>
      <div className="sound-popover" role="group" aria-label="Background music settings">
        <button className="sound-enable" type="button" aria-pressed={enabled} onClick={onToggle}>
          {enabled ? 'Pause music' : 'Play music'}
        </button>
        <label className="sound-volume">
          <span>Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            aria-label="Background music volume"
            onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
          />
          <output>{Math.round(volume * 100)}%</output>
        </label>
        {error && (
          <p className="sound-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}

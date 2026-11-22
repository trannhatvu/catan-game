import type { MusicPreferences } from '../audio/music';
import { useI18n } from '../i18n';

type MusicControlProps = {
  preferences: MusicPreferences;
  error: string | null;
  onToggle: () => void;
  onVolumeChange: (volume: number) => void;
};

export function MusicControl({ preferences, error, onToggle, onVolumeChange }: MusicControlProps) {
  const { enabled, volume } = preferences;
  const { t } = useI18n();

  return (
    <details className="sound-control music-control" name="audio-settings" data-music-control>
      <summary
        className="mode-toggle sound-summary"
        aria-label={`${t('musicSettings')}, ${t(enabled ? 'musicOn' : 'musicOff')}`}
        title={t('musicSettings')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      </summary>
      <div className="sound-popover" role="group" aria-label={t('musicSettings')}>
        <button className="sound-enable" type="button" aria-pressed={enabled} onClick={onToggle}>
          {enabled ? t('pauseMusic') : t('playMusic')}
        </button>
        <label className="sound-volume">
          <span>{t('musicVolume')}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            aria-label={t('musicVolume')}
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

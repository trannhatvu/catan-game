import type { SoundPreferences } from '../audio/sound';
import { useI18n } from '../i18n';

type SoundControlProps = {
  preferences: SoundPreferences;
  error: string | null;
  onToggle: () => void;
  onVolumeChange: (volume: number) => void;
};

export function SoundControl({ preferences, error, onToggle, onVolumeChange }: SoundControlProps) {
  const { enabled, volume } = preferences;
  const { t } = useI18n();

  return (
    <details className="sound-control" name="audio-settings">
      <summary
        className="mode-toggle sound-summary"
        aria-label={`${t('soundSettings')}, ${t(enabled ? 'soundsOn' : 'soundsOff')}`}
        title={t('soundSettings')}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 9v6h4l5 4V5L7 9H3" />
          {enabled ? <path d="M16 9a5 5 0 0 1 0 6m2.5-8.5a8.5 8.5 0 0 1 0 11" /> : <path d="m16 9 5 6m0-6-5 6" />}
        </svg>
      </summary>
      <div className="sound-popover" role="group" aria-label={t('soundSettings')}>
        <button className="sound-enable" type="button" aria-pressed={enabled} onClick={onToggle}>
          {enabled ? t('muteSounds') : t('enableSounds')}
        </button>
        <label className="sound-volume">
          <span>{t('soundVolume')}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            aria-label={t('soundVolume')}
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

import { PLAYER_COLORS } from '../../shared/rules';
import { MAPS, isMapId } from '../../shared/scenario';
import type { GameApi } from '../net/useGame';
import type { BackgroundMusicControls } from '../audio/useMusic';
import { MusicControl } from './MusicControl';
import { LanguageControl } from './LanguageControl';
import { localizedMapBlurb, localizedMapName, useI18n } from '../i18n';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

export function Lobby({ api, music }: { api: GameApi; music: BackgroundMusicControls }) {
  const { language, t } = useI18n();
  const room = api.room!;
  const isHost = room.hostId === api.me;
  const online = room.players.filter((p) => p.connected).length;
  const enough = online >= MIN_PLAYERS;

  return (
    <div className="entrance">
      <div className="entrance-card">
        <div className="wordmark" style={{ fontSize: 30 }}>
          Cat<span>a</span>n
        </div>
        <div className="lobby-code">{room.code}</div>
        <p className="lobby-hint">{t('shareCode', { max: MAX_PLAYERS })}</p>

        <ul className="seat-list">
          {room.players.map((p, i) => (
            <li key={p.id} className="seat" style={{ ['--seat-color' as string]: PLAYER_COLORS[i] }}>
              <span className="seat-name">{p.name}</span>
              {p.id === room.hostId && <span className="seat-tag">{t('host')}</span>}
              {p.id === api.me && <span className="seat-tag">{t('you')}</span>}
              {!p.connected && <span className="seat-tag">{t('offline')}</span>}
            </li>
          ))}
          {Array.from({ length: MAX_PLAYERS - room.players.length }, (_, i) => (
            <li key={`empty-${i}`} className="seat" style={{ opacity: 0.4 }}>
              <span className="seat-name" style={{ color: 'var(--text-faint)' }}>
                {t('waitingForPlayer')}
              </span>
            </li>
          ))}
        </ul>

        <label className="field">
          <span className="field-label">{t('map')}</span>
          <select
            value={room.map}
            disabled={!isHost}
            onChange={(e) => isMapId(e.target.value) && api.setMap(e.target.value)}
          >
            {Object.values(MAPS).map((m) => (
              <option key={m.id} value={m.id}>
                {localizedMapName(language, m.id)}
              </option>
            ))}
          </select>
          <span className="lobby-hint">{localizedMapBlurb(language, room.map)}</span>
        </label>

        {isHost ? (
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={!enough} onClick={api.startGame}>
            {enough ? t('dealBoard') : t('waitingForMorePlayers', { count: MIN_PLAYERS - online })}
          </button>
        ) : (
          <div className="notice" style={{ background: 'var(--sea-abyss)', borderColor: 'var(--panel-line)', color: 'var(--text-dim)' }}>
            {t('waitingForHost')}
          </div>
        )}
        <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={api.leave}>
          {t('leaveLobby')}
        </button>
        <div className="music-control-row">
          <span>{t('backgroundMusic')}</span>
          <MusicControl
            preferences={music.preferences}
            error={music.error}
            onToggle={() => void music.toggleEnabled()}
            onVolumeChange={music.setVolume}
          />
        </div>
        <div className="language-control-row">
          <span>{t('language')}</span>
          <LanguageControl compact />
        </div>
      </div>
    </div>
  );
}

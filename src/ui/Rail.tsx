import type { PlayerView } from '../../shared/redact';
import { RESOURCES, type PlayerId } from '../../shared/types';
import { RESOURCE_COLOR, ResourceGlyph } from '../board/icons';
import { resourceName, translateGameLog, useI18n } from '../i18n';

export function Rail({ view, me }: { view: PlayerView; me: PlayerId | null }) {
  const { language, t } = useI18n();
  return (
    <aside className="rail">
      <div className="players">
        {view.players.map((p) => {
          const owed = view.pendingDiscards[p.id];
          return (
            <div
              key={p.id}
              className="player-card"
              data-player={p.id}
              style={{ ['--player-color' as string]: p.color }}
              data-active={p.id === view.currentPlayerId}
              data-offline={!p.connected}
            >
              <span className="avatar" aria-hidden="true">
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="player-name">
                {p.name}
                {p.id === me && <span className="award">{t('you')}</span>}
                {view.longestRoad.owner === p.id && <span className="award">{t('awardRoad')}</span>}
                {view.largestArmy.owner === p.id && <span className="award">{t('awardArmy')}</span>}
              </div>
              <div className="player-vp">{p.victoryPoints}</div>
              <div className="player-meta">
                <span>
                  <b>{p.handSize}</b> {t('cards')}
                </span>
                <span>
                  <b>{p.devCardCount}</b> {t('devShort')}
                </span>
                <span>
                  <b>{p.knightsPlayed}</b> {t('knights')}
                </span>
                {owed ? <span style={{ color: 'var(--grain)' }}>{t('discarding', { count: owed })}</span> : null}
                {!p.connected && <span style={{ color: 'var(--text-faint)' }}>{t('offline')}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bank" aria-label={t('bank')}>
        <span className="bank-label">{t('bank')}</span>
        {RESOURCES.map((r) => (
          <span key={r} className="bank-cell" title={resourceName(language, r)} data-empty={view.bank[r] === 0}>
            <span className="bank-glyph" style={{ color: RESOURCE_COLOR[r] }}>
              <ResourceGlyph resource={r} />
            </span>
            <b>{view.bank[r]}</b>
          </span>
        ))}
        <span className="bank-cell" title={t('developmentCards')}>
          <span className="bank-glyph bank-dev">?</span>
          <b>{view.devDeckSize}</b>
        </span>
      </div>

      <div className="log">
        {view.log.length === 0 && <p className="log-empty">{t('nothingHappened')}</p>}
        {[...view.log].reverse().map((entry) => {
          const who = view.players.find((p) => p.id === entry.player);
          return (
            <p key={entry.id} className="log-entry">
              {who && <b style={{ color: who.color }}>{who.name}</b>} {translateGameLog(entry.text, language)}
            </p>
          );
        })}
      </div>
    </aside>
  );
}

import { useEffect, useState } from 'react';
import type { PlayerView } from '../../shared/redact';
import { RESOURCES, type Action, type DevCardType, type PlayerId, type Resource, type ResourceCounts } from '../../shared/types';
import { RESOURCE_COLOR, ResourceGlyph } from '../board/icons';
import { resourceName, useI18n, type Language, type TranslationKey } from '../i18n';
import { emptyCounts, totalOf } from './HandBar';
import { Confetti } from './Confetti';

function Scrim({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className ? `scrim ${className}` : 'scrim'} role="dialog" aria-modal="true">
      <div className="modal">{children}</div>
    </div>
  );
}

/** A row of five resources with +/- steppers, bounded by `max`. */
function CountPicker({
  counts,
  max,
  onChange,
  showHeld = true,
}: {
  counts: ResourceCounts;
  max: ResourceCounts;
  onChange: (next: ResourceCounts) => void;
  /** Off when `max` is just a cap rather than the player's actual hand. */
  showHeld?: boolean;
}) {
  const { language, t } = useI18n();
  const step = (r: Resource, delta: number) => {
    const next = { ...counts, [r]: Math.max(0, Math.min(max[r], counts[r] + delta)) };
    onChange(next);
  };

  return (
    <div className="picker">
      {RESOURCES.map((r) => (
        <div key={r} className="picker-cell" data-selected={counts[r] > 0}>
          <span style={{ color: RESOURCE_COLOR[r] }}>
            <ResourceGlyph resource={r} />
          </span>
          <div className="stepper">
            <button
              onClick={() => step(r, -1)}
              disabled={counts[r] === 0}
              aria-label={t('oneLessResource', { resource: resourceName(language, r) })}
            >
              −
            </button>
            <span>{counts[r]}</span>
            <button
              onClick={() => step(r, 1)}
              disabled={counts[r] >= max[r]}
              aria-label={t('oneMoreResource', { resource: resourceName(language, r) })}
            >
              +
            </button>
          </div>
          {showHeld && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{t('heldCount', { count: max[r] })}</span>}
        </div>
      ))}
    </div>
  );
}

export function DiscardModal({ view, send }: { view: PlayerView; send: (a: Action) => void }) {
  const { t } = useI18n();
  const owed = view.moves.mustDiscard;
  const held = view.you?.resources ?? emptyCounts();
  const [picked, setPicked] = useState<ResourceCounts>(emptyCounts);
  const chosen = totalOf(picked);

  if (owed === 0) return null;

  return (
    <Scrim>
      <h2>{t('robberTakesCut')}</h2>
      <p className="modal-lede">
        {t('discardExplanation', { held: totalOf(held), count: owed })}
      </p>
      <CountPicker counts={picked} max={held} onChange={setPicked} />
      <div className="modal-actions">
        <span style={{ marginRight: 'auto', color: chosen === owed ? 'var(--good)' : 'var(--text-dim)', fontSize: 14 }}>
          {t('chosenCount', { chosen, count: owed })}
        </span>
        <button
          className="btn btn-primary"
          disabled={chosen !== owed}
          onClick={() => {
            send({ type: 'discard', resources: picked });
            setPicked(emptyCounts());
          }}
        >
          {t('discard')}
        </button>
      </div>
    </Scrim>
  );
}

export function StealModal({ view, send }: { view: PlayerView; send: (a: Action) => void }) {
  const { t } = useI18n();
  const targets = view.moves.stealTargets;
  if (view.phase !== 'stealing' || targets.length === 0) return null;

  return (
    <Scrim>
      <h2>{t('takeCard')}</h2>
      <p className="modal-lede">{t('robberStealExplanation')}</p>
      <div className="responses">
        {targets.map((id) => {
          const p = view.players.find((x) => x.id === id)!;
          return (
            <button key={id} className="response" onClick={() => send({ type: 'steal', target: id })}>
              <span className="turn-dot" style={{ ['--turn-color' as string]: p.color }} />
              <span>{p.name}</span>
              <span className="response-state">{t('playerCards', { count: p.handSize })}</span>
            </button>
          );
        })}
      </div>
    </Scrim>
  );
}

const DEV_CARD_COPY: Record<DevCardType, { title: TranslationKey; text: TranslationKey }> = {
  knight: { title: 'knight', text: 'knightDescription' },
  roadBuilding: { title: 'roadBuilding', text: 'roadBuildingDescription' },
  yearOfPlenty: { title: 'yearOfPlenty', text: 'yearOfPlentyDescription' },
  monopoly: { title: 'monopoly', text: 'monopolyDescription' },
  victoryPoint: { title: 'victoryPointCard', text: 'victoryPointDescription' },
};

export function DevCardModal({
  view,
  send,
  onClose,
}: {
  view: PlayerView;
  send: (a: Action) => void;
  onClose: () => void;
}) {
  const { language, t } = useI18n();
  const [choosing, setChoosing] = useState<'yearOfPlenty' | 'monopoly' | null>(null);
  const [picks, setPicks] = useState<Resource[]>([]);
  const cards = (view.you?.devCards ?? []).filter((c) => !c.played);

  const play = (type: DevCardType) => {
    if (type === 'knight') {
      send({ type: 'playKnight' });
      onClose();
    } else if (type === 'roadBuilding') {
      send({ type: 'playRoadBuilding' });
      onClose();
    } else if (type === 'yearOfPlenty' || type === 'monopoly') {
      setPicks([]);
      setChoosing(type);
    }
  };

  if (choosing === 'monopoly') {
    return (
      <Scrim>
        <h2>{t('monopoly')}</h2>
        <p className="modal-lede">{t('monopolyExplanation')}</p>
        <div className="picker">
          {RESOURCES.map((r) => (
            <button
              key={r}
              className="picker-cell"
              data-selected={picks[0] === r}
              onClick={() => setPicks([r])}
            >
              <span style={{ color: RESOURCE_COLOR[r] }}>
                <ResourceGlyph resource={r} />
              </span>
              <span style={{ fontSize: 12 }}>{resourceName(language, r)}</span>
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => setChoosing(null)}>
            {t('back')}
          </button>
          <button
            className="btn btn-primary"
            disabled={picks.length !== 1}
            onClick={() => {
              send({ type: 'playMonopoly', resource: picks[0] });
              onClose();
            }}
          >
            {t('takeThem')}
          </button>
        </div>
      </Scrim>
    );
  }

  if (choosing === 'yearOfPlenty') {
    return (
      <Scrim>
        <h2>{t('yearOfPlenty')}</h2>
        <p className="modal-lede">{t('yearOfPlentyExplanation')}</p>
        <div className="picker">
          {RESOURCES.map((r) => (
            <button
              key={r}
              className="picker-cell"
              data-selected={picks.includes(r)}
              disabled={picks.length >= 2}
              onClick={() => setPicks([...picks, r])}
            >
              <span style={{ color: RESOURCE_COLOR[r] }}>
                <ResourceGlyph resource={r} />
              </span>
              <span style={{ fontSize: 12 }}>{resourceName(language, r)}</span>
            </button>
          ))}
        </div>
        <p className="modal-lede">
          {t('chosenResources', {
            resources: picks.length
              ? picks.map((resource) => resourceName(language, resource)).join(language === 'vi' ? ' và ' : ' and ')
              : t('nothingYet'),
          })}
        </p>
        <div className="modal-actions">
          <button className="btn" onClick={() => setPicks([])}>
            {t('clear')}
          </button>
          <button className="btn" onClick={() => setChoosing(null)}>
            {t('back')}
          </button>
          <button
            className="btn btn-primary"
            disabled={picks.length !== 2}
            onClick={() => {
              send({ type: 'playYearOfPlenty', resources: [picks[0], picks[1]] });
              onClose();
            }}
          >
            {t('takeThem')}
          </button>
        </div>
      </Scrim>
    );
  }

  return (
    <Scrim>
      <h2>{t('yourDevelopmentCards')}</h2>
      <p className="modal-lede">{t('oneCardPerTurn')}</p>
      <div className="dev-list">
        {cards.length === 0 && <p className="log-empty">{t('noCardsYet')}</p>}
        {cards.map((card, i) => {
          const copy = DEV_CARD_COPY[card.type];
          return (
            <div key={i} className="dev-card" data-playable={card.playable}>
              <div>
                <h3>{t(copy.title)}</h3>
                <p>{t(copy.text)}</p>
              </div>
              {card.type !== 'victoryPoint' && (
                <button
                  className="btn"
                  disabled={!card.playable || !view.moves.playableDevCards.includes(card.type)}
                  onClick={() => play(card.type)}
                >
                  {t('play')}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>
          {t('close')}
        </button>
      </div>
    </Scrim>
  );
}

export function TradeModal({
  view,
  send,
  onClose,
}: {
  view: PlayerView;
  send: (a: Action) => void;
  onClose: () => void;
}) {
  const { language, t } = useI18n();
  const held = view.you?.resources ?? emptyCounts();
  const [give, setGive] = useState<ResourceCounts>(emptyCounts);
  const [want, setWant] = useState<ResourceCounts>(emptyCounts);

  const offer = view.trade;
  const mine = offer?.from === view.you?.id;

  // Once an offer is on the table the form is replaced by the responses.
  if (offer && mine) {
    return (
      <Scrim>
        <h2>{t('offerOnTable')}</h2>
        <p className="modal-lede">
          {t('youGiveFor', { give: describe(offer.give, language), want: describe(offer.want, language) })}
        </p>
        <div className="responses">
          {view.players
            .filter((p) => p.id !== view.you?.id)
            .map((p) => {
              const state = offer.responses[p.id] ?? 'pending';
              return (
                <div key={p.id} className="response">
                  <span className="turn-dot" style={{ ['--turn-color' as string]: p.color }} />
                  <span>{p.name}</span>
                  <span className="response-state" data-state={state}>
                    {state === 'accept'
                      ? t('accepted')
                      : state === 'reject'
                        ? t('declined')
                        : state === 'counter'
                          ? t('countered')
                          : t('thinking')}
                  </span>
                  {state === 'accept' && (
                    <button
                      className="btn btn-primary"
                      style={{ padding: '5px 12px' }}
                      onClick={() => {
                        send({ type: 'acceptTradeWith', player: p.id });
                        onClose();
                      }}
                    >
                      {t('trade')}
                    </button>
                  )}
                </div>
              );
            })}
        </div>
        {offer.counter && (
          <div style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 15 }}>
              {t('counterofferFrom', { name: view.players.find((p) => p.id === offer.counter!.from)?.name ?? '' })}
            </h3>
            <p className="modal-lede">
              {t('theyGiveWant', {
                give: describe(offer.counter.give, language),
                want: describe(offer.counter.want, language),
              })}
            </p>
            <div className="modal-actions">
              <button className="btn" onClick={() => send({ type: 'respondCounterTrade', accept: false })}>
                {t('declineCounter')}
              </button>
              <button
                className="btn btn-primary"
                disabled={!view.moves.canAcceptCounter}
                onClick={() => {
                  send({ type: 'respondCounterTrade', accept: true });
                  onClose();
                }}
              >
                {t('acceptCounter')}
              </button>
            </div>
            {!view.moves.canAcceptCounter && <p className="log-empty">{t('requestedCardsUnavailable')}</p>}
          </div>
        )}
        <div className="modal-actions">
          <button
            className="btn"
            onClick={() => {
              send({ type: 'cancelTrade' });
              onClose();
            }}
          >
            {t('withdrawOffer')}
          </button>
        </div>
      </Scrim>
    );
  }

  const bankable = RESOURCES.filter((r) => held[r] >= view.moves.bankRates[r]);

  return (
    <Scrim>
      <h2>{t('trade')}</h2>
      <p className="modal-lede">{t('tradeExplanation')}</p>

      <div className="trade-sides">
        <div className="trade-side">
          <h3>{t('youGive')}</h3>
          <CountPicker counts={give} max={held} onChange={setGive} />
        </div>
        <div className="trade-swap">{t('inExchangeFor')}</div>
        <div className="trade-side">
          <h3>{t('youWant')}</h3>
          <CountPicker counts={want} max={view.moves.tradeWantMax} onChange={setWant} showHeld={false} />
        </div>
      </div>

      <div className="modal-actions" style={{ marginBottom: 22 }}>
        <button className="btn" onClick={onClose}>
          {t('cancel')}
        </button>
        <button
          className="btn btn-primary"
          disabled={totalOf(give) === 0 || totalOf(want) === 0 || !view.moves.canOfferTrade}
          onClick={() => send({ type: 'offerTrade', give, want })}
        >
          {t('offerIt')}
        </button>
      </div>

      <h3 style={{ fontSize: 15, marginBottom: 8 }}>{t('bankAndHarbours')}</h3>
      {bankable.length === 0 ? (
        <p className="log-empty">
          {t('needResourcesForBank', { count: Math.min(...RESOURCES.map((r) => view.moves.bankRates[r])) })}
        </p>
      ) : (
        <div className="responses">
          {bankable.map((from) => (
            <div key={from} className="response">
              <span style={{ color: RESOURCE_COLOR[from], width: 22, height: 22 }}>
                <ResourceGlyph resource={from} />
              </span>
              <span>
                {t('bankRateForOne', { count: view.moves.bankRates[from], resource: resourceName(language, from).toLowerCase() })}
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {RESOURCES.filter((to) => to !== from).map((to) => (
                  <button
                    key={to}
                    className="btn"
                    style={{ padding: '4px 8px' }}
                    title={t('tradeFor', { resource: resourceName(language, to).toLowerCase() })}
                    onClick={() => send({ type: 'bankTrade', give: from, want: to })}
                  >
                    <span style={{ color: RESOURCE_COLOR[to], width: 18, height: 18, display: 'block' }}>
                      <ResourceGlyph resource={to} />
                    </span>
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </Scrim>
  );
}

/** Shown to everyone who is not the offering player. */
export function TradeOfferModal({ view, send }: { view: PlayerView; send: (a: Action) => void }) {
  const { language, t } = useI18n();
  const [countering, setCountering] = useState(false);
  const [give, setGive] = useState<ResourceCounts>(emptyCounts);
  const [want, setWant] = useState<ResourceCounts>(emptyCounts);
  const offer = view.trade;
  if (!offer) return null;
  if (offer.counter?.from === view.you?.id) {
    return (
      <Scrim>
        <h2>{t('counterofferSent')}</h2>
        <p className="modal-lede">
          {t('counterofferWaiting', { name: view.players.find((p) => p.id === offer.from)?.name ?? '' })}
        </p>
      </Scrim>
    );
  }
  if (!view.moves.mustAnswerTrade) return null;
  const from = view.players.find((p) => p.id === offer.from);
  const overlaps = RESOURCES.some((r) => give[r] > 0 && want[r] > 0);

  return (
    <Scrim>
      <h2>{t('playerWantsToTrade', { name: from?.name ?? '' })}</h2>
      <p className="modal-lede">
        {t('theyWantBack', { give: describe(offer.give, language), want: describe(offer.want, language) })}
      </p>
      {countering ? (
        <>
          <div className="trade-sides">
            <div className="trade-side">
              <h3>{t('youGive')}</h3>
              <CountPicker counts={give} max={view.you?.resources ?? emptyCounts()} onChange={setGive} />
            </div>
            <div className="trade-swap">{t('inExchangeForText')}</div>
            <div className="trade-side">
              <h3>{t('youWant')}</h3>
              <CountPicker counts={want} max={view.moves.counterWantMax} onChange={setWant} showHeld={false} />
            </div>
          </div>
          {overlaps && <p className="log-empty">{t('differentResourceTypes')}</p>}
          <div className="modal-actions">
            <button className="btn" onClick={() => setCountering(false)}>
              {t('back')}
            </button>
            <button className="btn" onClick={() => send({ type: 'respondTrade', accept: false })}>
              {t('noThanks')}
            </button>
            <button
              className="btn btn-primary"
              disabled={
                !view.moves.canCounterTrade ||
                totalOf(give) === 0 ||
                totalOf(want) === 0 ||
                overlaps
              }
              onClick={() => {
                send({ type: 'counterTrade', give, want });
                setCountering(false);
                setGive(emptyCounts());
                setWant(emptyCounts());
              }}
            >
              {t('sendCounter')}
            </button>
          </div>
        </>
      ) : (
        <>
          {offer.counter && <p className="log-empty">{t('anotherCounterofferWaiting')}</p>}
          <div className="modal-actions">
            <button className="btn" onClick={() => send({ type: 'respondTrade', accept: false })}>
              {t('noThanks')}
            </button>
            <button
              className="btn btn-primary"
              disabled={!view.moves.canAcceptTrade}
              onClick={() => send({ type: 'respondTrade', accept: true })}
            >
              {t('accept')}
            </button>
            <button
              className="btn"
              disabled={!view.moves.canCounterTrade}
              onClick={() => setCountering(true)}
            >
              {t('counteroffer')}
            </button>
          </div>
          {!view.moves.canAcceptTrade && <p className="log-empty">{t('doNotHoldWanted')}</p>}
        </>
      )}
    </Scrim>
  );
}

/** Held back briefly so the board's victory lap and the confetti get seen first. */
const WINNER_DELAY_MS = 2600;

export function WinnerModal({ view, onLeave }: { view: PlayerView; onLeave: () => void }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!view.winner) return setShown(false);
    const quiet = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setShown(true), quiet ? 0 : WINNER_DELAY_MS);
    return () => clearTimeout(t);
  }, [view.winner]);

  if (!view.winner) return null;
  const winner = view.players.find((p) => p.id === view.winner);
  const ranked = [...view.players].sort(
    (a, b) => b.victoryPoints + (b.hiddenVictoryPoints ?? 0) - (a.victoryPoints + (a.hiddenVictoryPoints ?? 0)),
  );

  // The confetti stays mounted when the banner arrives, so it fires only once.
  return (
    <>
      <Confetti colors={view.players.map((p) => p.color)} />
      {shown && (
        <Scrim>
          <div className="winner">
            <div className="wordmark">{t('playerWins', { name: winner?.name ?? '' })}</div>
            <p className="modal-lede">{t('tenPointsIslandSettled')}</p>
            <ul className="scoreboard">
              {ranked.map((p) => (
                <li key={p.id} style={{ ['--player-color' as string]: p.color }}>
                  <span>{p.name}</span>
                  <b>{p.victoryPoints + (p.hiddenVictoryPoints ?? 0)}</b>
                </li>
              ))}
            </ul>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onLeave}>
              {t('backToStart')}
            </button>
          </div>
        </Scrim>
      )}
    </>
  );
}

export function QuitGameModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const { t } = useI18n();

  return (
    <Scrim className="quit-game-confirmation">
      <h2>{t('quitGameConfirmTitle')}</h2>
      <p className="modal-lede">{t('quitGameWarning')}</p>
      <div className="modal-actions">
        <button className="btn" onClick={onCancel}>{t('cancel')}</button>
        <button className="btn btn-primary" onClick={onConfirm}>{t('confirmQuitGame')}</button>
      </div>
    </Scrim>
  );
}

export function AbandonedModal({ view, onLeave }: { view: PlayerView; onLeave: () => void }) {
  const { t } = useI18n();
  if (view.phase !== 'finished' || view.winner !== null) return null;

  const player = view.players.find((p) => p.id === view.abandonedBy);
  return (
    <Scrim>
      <div className="winner">
        <div className="wordmark">{t('gameAbandoned')}</div>
        <p className="modal-lede">{t('gameAbandonedBy', { name: player?.name ?? t('playerFallback') })}</p>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onLeave}>
          {t('backToStart')}
        </button>
      </div>
    </Scrim>
  );
}

function describe(counts: ResourceCounts, language: Language): string {
  const parts = RESOURCES.filter((r) => counts[r] > 0).map((r) => `${counts[r]} ${resourceName(language, r).toLowerCase()}`);
  return parts.length ? parts.join(language === 'vi' ? ' và ' : ' and ') : translateNothing(language);
}

function translateNothing(language: Language): string {
  return language === 'vi' ? 'không có tài nguyên' : 'nothing';
}

/** Close a modal on Escape — expected of anything that covers the board. */
export function useEscape(onEscape: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape]);
}

export type { PlayerId };

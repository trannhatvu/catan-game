import type { PlayerView } from '../../shared/redact';
import { BUILD_COSTS, RESOURCES, type Resource, type ResourceCounts } from '../../shared/types';
import { RESOURCE_COLOR, ResourceGlyph } from '../board/icons';
import { resourceName, useI18n, type Translator } from '../i18n';

export type Pending = 'settlement' | 'city' | 'road' | 'robber' | null;

export function Dice({ dice, rollId = 0 }: { dice: [number, number] | null; rollId?: number }) {
  if (!dice) return null;
  return (
    <div className="dice">
      <Die key={`${rollId}-0`} value={dice[0]} />
      <Die key={`${rollId}-1`} value={dice[1]} />
      <span className="dice-total">{dice[0] + dice[1]}</span>
    </div>
  );
}

/** Pip positions on a 3x3 grid, in CSS grid-area terms. */
const PIP_LAYOUT: Record<number, [number, number][]> = {
  1: [[2, 2]],
  2: [
    [1, 1],
    [3, 3],
  ],
  3: [
    [1, 1],
    [2, 2],
    [3, 3],
  ],
  4: [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ],
  5: [
    [1, 1],
    [1, 3],
    [2, 2],
    [3, 1],
    [3, 3],
  ],
  6: [
    [1, 1],
    [1, 3],
    [2, 1],
    [2, 3],
    [3, 1],
    [3, 3],
  ],
};

function Die({ value }: { value: number }) {
  const { t } = useI18n();
  return (
    <div className="die" data-rolling="true" aria-label={t('dieShowing', { value })}>
      {(PIP_LAYOUT[value] ?? []).map(([row, col], i) => (
        <span key={i} className="pip" style={{ gridRow: row, gridColumn: col }} />
      ))}
    </div>
  );
}

export function Cards({ resources }: { resources: ResourceCounts }) {
  const { language } = useI18n();
  return (
    <div className="cards">
      {RESOURCES.map((r) => (
        <div
          key={r}
          className="card"
          data-resource={r}
          style={{ ['--card-color' as string]: RESOURCE_COLOR[r] }}
          data-empty={resources[r] === 0}
          title={`${resourceName(language, r)}: ${resources[r]}`}
        >
          <ResourceGlyph resource={r} />
          {/* Keyed on the count so a change remounts the chip and it pops. */}
          <span key={resources[r]} className="card-count">
            {resources[r]}
          </span>
        </div>
      ))}
    </div>
  );
}

function CostRow({ cost }: { cost: ResourceCounts }) {
  return (
    <span className="build-costs">
      {RESOURCES.flatMap((r) =>
        Array.from({ length: cost[r] }, (_, i) => (
          <span
            key={`${r}${i}`}
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: RESOURCE_COLOR[r],
              display: 'inline-block',
            }}
          />
        )),
      )}
    </span>
  );
}

function BuildButton({
  label,
  cost,
  active,
  disabled,
  onClick,
}: {
  label: string;
  cost: ResourceCounts;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={active ? 'btn btn-primary' : 'btn'}
      disabled={disabled}
      onClick={onClick}
      style={{ display: 'grid', justifyItems: 'center', gap: 2, padding: '8px 14px' }}
    >
      <span>{label}</span>
      <CostRow cost={cost} />
    </button>
  );
}

/** One line telling the player exactly what the game is waiting on. */
function prompt(view: PlayerView, owed: number, t: Translator): string | null {
  if (view.phase === 'finished') return null;
  if (owed > 0) return t('discardCards', { count: owed });
  if (view.moves.mustAnswerCounter) return t('answerCounteroffer');
  if (view.trade?.counter?.from === view.you?.id) return t('waitingCounterofferResponse');
  if (!view.moves.isMyTurn) {
    if (view.moves.mustAnswerTrade) return t('answerTradeOffer');
    const who = view.players.find((p) => p.id === view.currentPlayerId);
    return who ? t('playerIsPlaying', { name: who.name }) : null;
  }
  switch (view.phase) {
    case 'initiative':
      return t('rollToChooseFirst');
    case 'setup':
      return view.setup?.placing === 'settlement'
        ? t('placeSettlement')
        : t('placeRoadNextToIt');
    case 'rolling':
      return t('rollToStartTurn');
    case 'movingRobber':
      return t('moveRobberToHex');
    case 'stealing':
      return t('chooseWhoToStealFrom');
    case 'discarding':
      return t('waitingForEveryoneToDiscard');
    default:
      return view.freeRoads > 0 ? t('placeFreeRoads', { count: view.freeRoads }) : null;
  }
}

export type HandBarProps = {
  view: PlayerView;
  rollId: number;
  pending: Pending;
  setPending: (p: Pending) => void;
  onRollForStart: () => void;
  onRoll: () => void;
  onEndTurn: () => void;
  onBuyDevCard: () => void;
  openTrade: () => void;
  openCards: () => void;
};

export function HandBar({
  view,
  rollId,
  pending,
  setPending,
  onRollForStart,
  onRoll,
  onEndTurn,
  onBuyDevCard,
  openTrade,
  openCards,
}: HandBarProps) {
  const { t } = useI18n();
  const { moves } = view;
  const owed = moves.mustDiscard;
  const hint = prompt(view, owed, t);
  const myTurn = moves.isMyTurn;
  const inMain = view.phase === 'main' && myTurn;

  const toggle = (next: Exclude<Pending, null>) => setPending(pending === next ? null : next);

  return (
    <div className="handbar">
      <Cards resources={view.you?.resources ?? { brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 }} />

      <Dice dice={view.dice} rollId={rollId} />

      {hint && <p className="prompt">{hint}</p>}

      {view.phase === 'initiative' && view.initiative && (
        <div className="responses" aria-label={t('firstPlayerRolls')}>
          {view.initiative.eligible.map((id) => {
            const player = view.players.find((p) => p.id === id);
            const score = view.initiative!.rolls[id];
            return (
              <div className="response" key={id}>
                <span className="turn-dot" style={{ ['--turn-color' as string]: player?.color ?? 'transparent' }} />
                <span>{player?.name ?? t('playerFallback')}</span>
                <span className="response-state">{score === undefined ? t('waitingToRoll') : t('rolledScore', { score })}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="actions">
        {moves.canRollForStart && (
          <button className="btn btn-primary" onClick={onRollForStart}>
            {t('rollForFirstPlayer')}
          </button>
        )}

        {myTurn && view.phase === 'rolling' && (
          <button className="btn btn-primary" onClick={onRoll}>
            {t('rollDice')}
          </button>
        )}

        {inMain && (
          <>
            <BuildButton
              label={t('road')}
              cost={BUILD_COSTS.road}
              active={pending === 'road'}
              disabled={moves.roadSpots.length === 0}
              onClick={() => toggle('road')}
            />
            <BuildButton
              label={t('settlement')}
              cost={BUILD_COSTS.settlement}
              active={pending === 'settlement'}
              disabled={moves.settlementSpots.length === 0}
              onClick={() => toggle('settlement')}
            />
            <BuildButton
              label={t('city')}
              cost={BUILD_COSTS.city}
              active={pending === 'city'}
              disabled={moves.citySpots.length === 0}
              onClick={() => toggle('city')}
            />
            <BuildButton
              label={t('buyCard')}
              cost={BUILD_COSTS.devCard}
              active={false}
              disabled={!moves.canBuyDevCard}
              onClick={onBuyDevCard}
            />
          </>
        )}

        {myTurn && (view.phase === 'main' || view.phase === 'rolling') && (
          <button className="btn" onClick={openCards} disabled={(view.you?.devCards.length ?? 0) === 0}>
            {t('yourCards', { count: view.you?.devCards.filter((c) => !c.played).length ?? 0 })}
          </button>
        )}

        {inMain && (
          <button className="btn" onClick={openTrade}>
            {t('trade')}
          </button>
        )}

        {inMain && (
          <button className="btn btn-primary" onClick={onEndTurn}>
            {t('endTurn')}
          </button>
        )}
      </div>
    </div>
  );
}

export const emptyCounts = (): ResourceCounts => ({ brick: 0, lumber: 0, wool: 0, grain: 0, ore: 0 });

export function totalOf(counts: ResourceCounts): number {
  return RESOURCES.reduce((n, r) => n + counts[r], 0);
}

export type { Resource };

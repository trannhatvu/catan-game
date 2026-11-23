import { useEffect, useRef, useState } from 'react';
import { BoardView, useBoardMode } from './board3d/BoardView';
import { useGame } from './net/useGame';
import { Entrance } from './ui/Entrance';
import { HandBar, type Pending } from './ui/HandBar';
import { Lobby } from './ui/Lobby';
import { Rail } from './ui/Rail';
import { CardFlights } from './ui/CardFlights';
import { MusicControl } from './ui/MusicControl';
import { SoundControl } from './ui/SoundControl';
import { detectRoll, detectSoundCues, type RollFx } from './fx/events';
import type { PlayerView } from '../shared/redact';
import { musicSceneFor } from './audio/music';
import { useBackgroundMusic } from './audio/useMusic';
import { useSound } from './audio/useSound';
import { useI18n, translateServerMessage } from './i18n';
import { LanguageControl } from './ui/LanguageControl';
import {
  DevCardModal,
  DiscardModal,
  StealModal,
  TradeModal,
  TradeOfferModal,
  AbandonedModal,
  QuitGameModal,
  WinnerModal,
  useEscape,
} from './ui/Modals';

export default function App() {
  const api = useGame();
  const music = useBackgroundMusic(musicSceneFor(api.room?.started ?? false, api.view));

  if (!api.room) return <Entrance api={api} music={music} />;
  if (!api.room.started || !api.view) return <Lobby api={api} music={music} />;
  return <Game api={api} music={music} />;
}

function Game({
  api,
  music,
}: {
  api: ReturnType<typeof useGame>;
  music: ReturnType<typeof useBackgroundMusic>;
}) {
  const view = api.view!;
  const [pending, setPending] = useState<Pending>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const boardMode = useBoardMode();
  const sound = useSound();
  const roll = useRoll(view);
  const previousSoundView = useRef<PlayerView | null>(null);
  const { language, t } = useI18n();

  useEffect(() => {
    const cues = detectSoundCues(previousSoundView.current, view);
    previousSoundView.current = view;
    cues.forEach(sound.play);
  }, [sound.play, view]);

  // Some prompts are not optional: during setup and after a 7 the game is
  // waiting on one specific click, so the board asks for it directly.
  const forced: Pending =
    view.moves.isMyTurn && view.phase === 'setup'
      ? view.setup?.placing === 'road'
        ? 'road'
        : 'settlement'
      : view.moves.isMyTurn && view.phase === 'movingRobber'
        ? 'robber'
        : view.moves.isMyTurn && view.phase === 'main' && view.freeRoads > 0
          ? 'road'
          : null;

  const active = forced ?? pending;

  // Drop a half-finished choice whenever the game moves on without it.
  useEffect(() => {
    if (view.phase !== 'main') setPending(null);
  }, [view.phase, view.turn]);

  useEffect(() => {
    if (view.trade === null) setShowTrade(false);
  }, [view.trade]);

  useEffect(() => {
    if (view.moves.mustAnswerCounter) setShowTrade(true);
  }, [view.moves.mustAnswerCounter]);

  useEffect(() => {
    if (view.phase === 'finished') setShowQuitConfirm(false);
  }, [view.phase]);

  // Rejected actions surface as a short toast rather than a blocking dialog.
  useEffect(() => {
    if (!api.error) return;
    const timer = setTimeout(api.dismissError, 3500);
    return () => clearTimeout(timer);
  }, [api.error, api.dismissError]);

  useEscape(() => {
    setPending(null);
    setShowTrade(false);
    setShowCards(false);
    setShowQuitConfirm(false);
  });

  const current = view.players.find((p) => p.id === view.currentPlayerId);

  return (
    <div className="game">
      <header className="topbar">
        <div className="wordmark">
          Cat<span>a</span>n
        </div>
        <button className="mode-toggle" onClick={api.leave} title={t('backToMainMenuHint')}>
          {t('menu')}
        </button>
        {view.moves.canAbandon && (
          <button
            className="mode-toggle quit-game-button"
            disabled={!api.connected}
            onClick={() => setShowQuitConfirm(true)}
            title={t('quitGameHint')}
          >
            {t('quitGame')}
          </button>
        )}
                <span className="room-code">{api.room!.code}</span>
        {!api.connected && <span className="room-code">{t('reconnecting')}</span>}
        {boardMode.canToggle && (
          <button className="mode-toggle" onClick={boardMode.toggle} title={t('switchBoardView')}>
            {boardMode.is3d ? t('view2d') : t('view3d')}
          </button>
        )}
        <SoundControl
          preferences={sound.preferences}
          error={sound.error}
          onToggle={() => void sound.toggleEnabled()}
          onVolumeChange={sound.setVolume}
        />
        <MusicControl
          preferences={music.preferences}
          error={music.error}
          onToggle={() => void music.toggleEnabled()}
          onVolumeChange={music.setVolume}
        />
        <LanguageControl compact />
        <div className="turn-banner" data-mine={view.moves.isMyTurn && view.phase !== 'finished'}>
          <span className="turn-dot" style={{ ['--turn-color' as string]: current?.color ?? 'transparent' }} />
          {view.phase === 'finished'
            ? t('gameOver')
            : view.phase === 'initiative'
              ? view.moves.isMyTurn
                ? t('yourRoll')
                : t('playerRolling', { name: current?.name ?? t('playerFallback') })
              : view.moves.isMyTurn
                ? t('yourTurn')
                : t('playerTurn', { name: current?.name ?? t('playerFallback') })}
        </div>
      </header>

      <div className="board-stage">
        <BoardView
          is3d={boardMode.is3d}
          roll={roll}
          view={view}
          pending={active}
          onVertex={(vertex) => {
            if (view.phase === 'setup') api.send({ type: 'placeSetupSettlement', vertex });
            else if (active === 'city') api.send({ type: 'buildCity', vertex });
            else api.send({ type: 'buildSettlement', vertex });
            setPending(null);
          }}
          onEdge={(edge) => {
            if (view.phase === 'setup') api.send({ type: 'placeSetupRoad', edge });
            else api.send({ type: 'buildRoad', edge });
            setPending(null);
          }}
          onHex={(hex) => {
            api.send({ type: 'moveRobber', hex });
            setPending(null);
          }}
        />
      </div>

      <Rail view={view} me={api.me} />

      <HandBar
        view={view}
        rollId={roll?.id ?? 0}
        pending={active}
        setPending={setPending}
        onRollForStart={() => api.send({ type: 'rollForStart' })}
        onRoll={() => api.send({ type: 'rollDice' })}
        onEndTurn={() => api.send({ type: 'endTurn' })}
        onBuyDevCard={() => api.send({ type: 'buyDevCard' })}
        openTrade={() => setShowTrade(true)}
        openCards={() => setShowCards(true)}
      />

      <CardFlights roll={roll} me={api.me} />

      <DiscardModal view={view} send={api.send} />
      <StealModal view={view} send={api.send} />
      <TradeOfferModal view={view} send={api.send} />
      {showTrade && <TradeModal view={view} send={api.send} onClose={() => setShowTrade(false)} />}
      {showCards && <DevCardModal view={view} send={api.send} onClose={() => setShowCards(false)} />}
      {showQuitConfirm && view.moves.canAbandon && (
        <QuitGameModal
          onCancel={() => setShowQuitConfirm(false)}
          onConfirm={() => api.send({ type: 'abandonGame' })}
        />
      )}
      <WinnerModal view={view} onLeave={api.leave} />
      <AbandonedModal view={view} onLeave={api.leave} />

      {api.error && (
        <div className="toast" role="status" onClick={api.dismissError}>
          {translateServerMessage(api.error, language)}
        </div>
      )}
    </div>
  );
}

/** The most recent roll seen in this tab, as something the board and overlay can animate. */
function useRoll(view: PlayerView): RollFx | null {
  const prev = useRef<PlayerView | null>(null);
  const [roll, setRoll] = useState<RollFx | null>(null);
  useEffect(() => {
    const ev = detectRoll(prev.current, view);
    prev.current = view;
    if (ev) setRoll((r) => ({ ...ev, id: (r?.id ?? 0) + 1 }));
  }, [view]);
  return roll;
}

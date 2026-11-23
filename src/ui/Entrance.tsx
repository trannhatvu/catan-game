import { useEffect, useState, type FormEvent } from 'react';
import { savedSeats, type GameApi } from '../net/useGame';
import type { RoomSummary } from '../../server/rooms';
import { MAX_UNFINISHED_ROOMS_PER_USER } from '../../shared/types';
import type { BackgroundMusicControls } from '../audio/useMusic';
import { MusicControl } from './MusicControl';
import { LanguageControl } from './LanguageControl';
import { localizedMapName, translateServerMessage, useI18n } from '../i18n';

const MAX_PLAYERS = 4;

/** ponytail: polls every few seconds; push over the socket if lobby churn ever matters. */
function useLobbies(): RoomSummary[] {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  useEffect(() => {
    let live = true;
    const load = () =>
      fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: savedSeats() }),
      })
        .then((r) => r.json())
        .then((body: { rooms: RoomSummary[] }) => live && setRooms(body.rooms))
        .catch(() => {});
    void load();
    const timer = setInterval(load, 3000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, []);
  return rooms;
}

export function roomsForSavedSeats(
  rooms: RoomSummary[],
  seats: Readonly<Record<string, string>>,
): RoomSummary[] {
  return rooms.filter((room) => Object.prototype.hasOwnProperty.call(seats, room.code));
}

export function hasReachedUnfinishedRoomLimit(rooms: readonly RoomSummary[]): boolean {
  return rooms.filter((room) => !room.finished).length >= MAX_UNFINISHED_ROOMS_PER_USER;
}

export function Entrance({ api, music }: { api: GameApi; music: BackgroundMusicControls }) {
  const { language, t } = useI18n();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mine = savedSeats();
  const lobbies = roomsForSavedSeats(useLobbies(), mine);
  const atRoomLimit = hasReachedUnfinishedRoomLimit(lobbies);

  async function run(fn: () => Promise<string | null>) {
    setBusy(true);
    setProblem(await fn());
    setBusy(false);
  }

  function host(e: FormEvent) {
    e.preventDefault();
    if (atRoomLimit) return;
    void run(() => api.createRoom(name));
  }

  function join(e: FormEvent) {
    e.preventDefault();
    if (atRoomLimit) return;
    if (code.trim().length < 4) {
      setProblem('Enter the four-letter code from your host.');
      return;
    }
    void run(() => api.joinRoom(code, name));
  }

  return (
    <div className="entrance">
      <div className="entrance-card">
        <div className="wordmark">
          Cat<span>a</span>n
        </div>
        <p className="entrance-lede">{t('entranceLede')}</p>
        {atRoomLimit && (
          <div className="notice" role="status">
            {t('roomLimitReached', { max: MAX_UNFINISHED_ROOMS_PER_USER })}
          </div>
        )}

        <form onSubmit={host}>
          <label className="field">
            <span className="field-label">{t('yourName')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'vi' ? 'An' : 'Ann'}
              maxLength={16}
              autoComplete="nickname"
            />
          </label>

          <button className="btn btn-primary" type="submit" disabled={busy || !api.connected || atRoomLimit} style={{ width: '100%' }}>
            {t('startNewGame')}
          </button>
        </form>

        <div className="divider">{t('orJoinOne')}</div>

        <form onSubmit={join}>
          <label className="field">
            <span className="field-label">{t('gameCode')}</span>
            <input
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="XKPQ"
              maxLength={4}
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
          <button className="btn" type="submit" disabled={busy || !api.connected || atRoomLimit} style={{ width: '100%' }}>
            {t('joinGame')}
          </button>
        </form>

        {lobbies.length > 0 && (
          <>
            <div className="divider">{t('lobbies')}</div>
            <ul className="seat-list">
              {lobbies.map((r) => (
                <li key={r.code} className="seat">
                  <span className="seat-name">
                    <span className="room-code">{r.code}</span> {localizedMapName(language, r.map)}
                  </span>
                  <span className="seat-tag">
                    {r.finished ? t('finished') : r.started ? t('playing') : t('connectedPlayers', { connected: r.connected, max: MAX_PLAYERS })}
                  </span>
                  <button className="btn" disabled={busy || !api.connected} onClick={() => void run(() => api.resume(r.code))}>
                    {t('resume')}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

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
        {!api.connected && <div className="notice">{t('connecting')}</div>}
        {(problem ?? api.error) && <div className="notice">{translateServerMessage(problem ?? api.error!, language)}</div>}
      </div>
    </div>
  );
}

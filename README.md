# Catan Online

The full base game of Catan, playable in the browser with friends over the
network — 2 to 4 players, an animated 3D board or a painted 2D one, and a server
that enforces every rule.

![The 3D board at the start of a game](./docs/screenshots/game-opening-3d.png)

## Features

**Gameplay**

- The complete base game, aligned with the rulebook: dice-based first-player
  selection with tie rerolls, snake-draft setup, robber, trading with
  counteroffers, development cards, longest road, largest army and ten points
  to win — see [rules coverage](#rules-coverage)
- Three maps: Classic, Fixed board and Large island

**Multiplayer**

- Real-time play over Socket.IO, joined with a four-letter room code
- Server-authoritative: the client only offers moves the server says are legal
- Refresh or drop and you keep your seat and hand
- Games are saved to disk, so a server restart doesn't end them

**Presentation**

- 3D board (three.js / react-three-fiber) with a 2D SVG fallback, switchable
  in-game, and support for `prefers-reduced-motion`
- English and Vietnamese interface
- Optional sound effects and background music

## Screenshots

Captured from a local demo session; the room codes shown are not live.

<details>
<summary>Show all screenshots</summary>

| Main menu | Two-player lobby |
| --- | --- |
| ![Main menu](./docs/screenshots/main-menu.png) | ![Two-player lobby](./docs/screenshots/lobby.png) |

| First-player dice roll in 2D | First-player dice roll in 3D |
| --- | --- |
| ![First-player roll in 2D](./docs/screenshots/initiative-roll.png) | ![First-player roll in 3D](./docs/screenshots/initiative-roll-3d.png) |

| Legal settlement spots | Opening setup in 2D |
| --- | --- |
| ![Legal settlement spots](./docs/screenshots/setup-settlement.png) | ![2D opening setup](./docs/screenshots/game-opening-2d.png) |

| Initial 2D board | Initial 3D board |
| --- | --- |
| ![Initial 2D board](./docs/screenshots/game-2d-setup.png) | ![Initial 3D board](./docs/screenshots/game-3d-setup.png) |

| Vietnamese interface | Background music controls |
| --- | --- |
| ![Vietnamese main menu](./docs/screenshots/menu-vietnamese.png) | ![Background music controls](./docs/screenshots/music-settings.png) |

| Sound effect controls | |
| --- | --- |
| ![Sound effect controls](./docs/screenshots/sound-settings.png) | |

</details>

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>, pick **Start a new game** and share the
four-letter code. Everyone else joins with it.

## Commands

| npm | [just](https://just.systems/) | What it does |
| --- | --- | --- |
| `npm install` | `just install` | Install dependencies |
| `npm run dev` | `just dev` | Server on `:3001`, Vite client on `:5173` |
| `npm test` | `just test` | Run the test suite once |
| `npm test -- <path>` | `just test <path>` | Run one test file |
| `npm run test:watch` | `just test-watch` | Run tests in watch mode |
| `npm run build` | `just build` | Type-check and bundle the client |
| `npm start` | `just start` | Serve the built client and sockets on `:3001` |
| — | `just deploy` | Build, then `npm start` — locally, not on a remote host |
| `npm run simulate -- <seed> <players> [map]` | `just simulate …` | Play a bot game |

Run `just` with no arguments to list every recipe.

`simulate` replays the same game for the same arguments. It prints the
play-by-play and the final scoreboard, and checks that no resource or
development card was conjured up or lost — the quickest way to see whether a
rules change broke something.

## Playing

### Board controls

In 2D and 3D, drag with the primary mouse button or one finger to pan. In 2D,
scroll or pinch to zoom, and reset the view to fit the board again. In 3D, a
right-mouse drag orbits, while a two-finger gesture orbits and zooms.

### Language

Choose English or Tiếng Việt from the main menu, lobby or in-game top bar; the
choice is saved in the browser. Vietnamese Catan terms follow the
[Play Plus Catan guide](https://playplus.vn/blogs/news/huong-dan-choi-board-game-catan).

### Audio

Sound effects and background music are off by default. Each has its own saved
toggle and volume in the in-game settings. Music changes with the menu, normal
play, active trades and the late game, with a 20–60 second pause between
tracks. All audio is bundled locally; see the
[music credits and license](./public/audio/music/CREDITS.md).

## Hosting

### Network exposure

`npm run dev` starts Vite with `--host`, so anyone on the same network can open
the game. Remove the flag from `package.json` to keep it on localhost.

### Saved games

Rooms are written to `data/rooms.json` after every change and loaded on start;
clients reconnect and rejoin by token after a restart. Set `CATAN_DATA` to use
another file; its parent directory must be writable by the server.

- **Treat save files as sensitive.** They contain hidden game state and
  reconnect tokens, so restrict access and never commit them.
- A missing file starts with no rooms. Corrupt or unreadable data prevents
  startup rather than silently discarding games.
- If a save fails, the server logs it and warns connected players. The game
  continues in memory, but changes since the last good save may be lost on
  restart.
- To restore a backup, stop the server, replace the save file and start again.

### Share a game from Windows + WSL2

[Dev Tunnels](https://learn.microsoft.com/en-us/azure/developer/dev-tunnels/cli-commands)
give friends a temporary public HTTPS link to a game running on your machine.

1. In WSL, start the single-process production server:

   ```bash
   just deploy
   ```

2. In VS Code's **Ports** view, keep port `3001` forwarded. From Windows
   PowerShell, check that it is reachable — this should print `200`:

   ```powershell
   (Invoke-WebRequest http://localhost:3001/api/rooms).StatusCode
   ```

3. Install the Dev Tunnels CLI once, then open a new PowerShell window so the
   updated `PATH` is available:

   ```powershell
   winget install --id Microsoft.devtunnel --exact
   ```

4. Sign in and host an anonymous tunnel for port `3001`:

   ```powershell
   devtunnel user login
   devtunnel host -p 3001 --allow-anonymous
   ```

   For the same URL every time, create a named tunnel once and host it
   afterwards:

   ```powershell
   devtunnel create catan-game -a
   devtunnel port create catan-game -p 3001 --protocol http
   devtunnel host catan-game
   ```

5. Share the `https://…-3001.<region>.devtunnels.ms` URL and the room code. Do
   not share the `-inspect` URL; it is a diagnostics page.

Keep `just deploy`, VS Code/WSL and the tunnel running while people play, and
press **Ctrl+C** in PowerShell to stop public access. Anyone with the URL can
reach the game and there is no player login, so share it only with people you
trust.

## Architecture

### The server decides everything

One pure reducer in `shared/rules.ts` is the only implementation of the rules.
The server runs it and sends each player a *redacted* view of the game plus the
exact list of moves they may legally make right now. The browser renders that
list and nothing else, so it cannot show an illegal move, cannot drift out of
sync, and cannot cheat by sending a crafted message — the server re-checks
every action regardless.

### Project layout

```text
shared/       the whole game, pure TypeScript, no DOM and no Node APIs
  types.ts      game state and actions
  layout.ts     hex/vertex/edge graph, derived rather than hand-listed
  scenario.ts   the board recipe (terrain supply, tokens, harbours)
  setup.ts      shuffling and balanced board generation
  rules.ts      applyAction() + legalMoves()  <- the rules live here only
  redact.ts     full state -> what one player is allowed to see
  rng.ts        seeded PRNG, so every transition is reproducible
server/
  index.ts      HTTP and Socket.IO
  rooms.ts      rooms, seats, reconnect tokens and persistence
src/          React client
  App.tsx, ui/  the interface
  net/          connection and reconnect handling (useGame.ts)
  i18n.tsx      English and Vietnamese strings
  audio/        sound effects and background music
  board/        the painted SVG board (2D view and WebGL fallback)
  board3d/      the lazily loaded 3D board (three.js via react-three-fiber)
  fx/           turns two consecutive views into "what just happened"
scripts/
  simulate.ts   reproducible bot games with card-conservation checks
```

Tests live next to the code in `shared/__tests__/`, `server/__tests__/` and
`src/__tests__/`.

### The board graph

Hexes are axial coordinates within distance 2 of the origin. A vertex is
identified by the sorted triple of hexes touching it, and an edge by the sorted
pair of its vertices, so both sets come out canonical and de-duplicated: exactly
19 hexes, 54 vertices, 72 edges, with the coastline walkable as a 30-edge ring.

That graph makes the rules that implementations usually get wrong fall out
directly. The distance rule is "no neighbouring vertex is occupied". Longest
road is a depth-first walk that refuses to pass *through* a vertex holding an
opponent's building, which is exactly how a road gets broken.

### Setup and maps

Players roll to decide who starts the setup draft; tied highest rollers reroll.

- **Classic** shuffles the terrain and places number tokens in the rulebook's
  A–R counterclockwise order, skipping the desert.
- **Fixed board** is a repeatable layout, but uses the normal snake draft rather
  than the rulebook's preset beginner placements.
- **Large island** is a 30-hex variant; the app still supports up to four
  players.

### Rules coverage

- Dice-based first-player selection with tie rerolls
- Snake-draft setup, with the second settlement paying out
- Rolling and production, including the bank-shortage rule
- The robber: discarding down to half above seven cards, and mandatory stealing
  when eligible
- Roads, settlements and cities with piece limits
- All five development cards, one per turn and never on the turn bought;
  hidden victory point cards
- Harbours at 2:1 and 3:1; bank and player trading with offers and
  counteroffers
- Longest road and largest army, including losing them
- Ten points to win

The full audit against the rulebook is in the
[rulebook compliance specification](./docs/CATAN_RULES_SPEC.md).

### Rooms and reconnection

Every game lives in one `Map<code, Room>` in `server/rooms.ts`, mirrored to
disk. The entrance lists open lobbies from `GET /api/rooms` — codes, map and
player counts, but no names or seat tokens.

Each seat gets a secret token kept in `sessionStorage`, so refreshing puts a
player back in their seat with their hand intact. It is per tab on purpose: a
second tab gets its own seat instead of stealing the first one's, which is how
most people try the game out.

A dropped connection keeps its seat. The **Menu** and **Leave lobby** buttons
give up a lobby seat but keep a game seat, which the entrance then offers to
resume using tokens remembered in `localStorage`. Rooms are removed when the
last player leaves the lobby, or a week after the last person disconnects.

### Rendering

Both boards take the same props and only ever offer the legal moves the server
listed. Animations are derived on the client by comparing each view with the
previous one; the server sends no extra events. Players with
`prefers-reduced-motion` get the state changes without the motion.

The 2D board is drawn entirely as SVG, with no image assets. Light always comes
from the upper left, so every tile, chit and piece has a lit face, a shaded face
and a shadow cast down and to the right. Each tile seeds a small PRNG from its
coordinates, so no two forests look alike, yet the board renders identically
for every player and on every reload. Tiles are memoised on their terrain and
number token rather than object identity, because the server sends a new state
object on every action.

The 3D board is loaded lazily and falls back to 2D without WebGL. It adds
bevelled tiles, instanced low-poly scenery, harbours with jetties and boats,
thrown dice, and animated pieces timed off the canvas clock.

### Extending

`HexType` already includes `sea` and `gold`, the board comes from a `Scenario`
object, and the development deck is a data table — the three hooks an expansion
would need. Nothing else is generalised until one is actually built.

## Further documentation

- [AGENTS.md](./AGENTS.md) — guide for contributors and coding agents
- [Rulebook compliance specification](./docs/CATAN_RULES_SPEC.md)
- [Improvement plan](./docs/IMPROVEMENT_PLAN.md)

## Credits

Sound effects are from Kenney's CC0
[Casino Audio](https://kenney.nl/assets/casino-audio),
[Impact Sounds](https://kenney.nl/assets/impact-sounds) and
[Interface Sounds](https://kenney.nl/assets/interface-sounds) packs; license
notices are in [`public/audio/kenney`](./public/audio/kenney). Background
music credits and its CC0 license are in
[`public/audio/music/CREDITS.md`](./public/audio/music/CREDITS.md).

Special thanks to [iTzMattyz](https://github.com/iTzMattyz/catan-online) for
the original Catan Online project and the inspiration for this version.

## Disclaimer

Unofficial fan project for personal use. CATAN is a trademark of CATAN GmbH;
this project is not affiliated with or endorsed by them.

## License

Original project code is licensed under the [MIT License](./LICENSE). Bundled
audio remains under its respective licenses; see [credits](#credits) and the
notices alongside the audio in [`public/audio`](./public/audio).

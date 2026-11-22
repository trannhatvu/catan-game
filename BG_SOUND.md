# Background Music

## Goal

Add optional, locally bundled medieval background music. Keep it separate
from sound effects, muted by default, volume-controlled, and saved per browser.
Do not stream audio from third-party sites at runtime.

## V1 playlist

| Game context | Track | Source |
| --- | --- | --- |
| Main menu or waiting lobby | Medieval: King's Feast | [OpenGameArt](https://opengameart.org/content/medieval-kings-feast) |
| Normal game | Medieval: The Bard's Tale | [OpenGameArt](https://opengameart.org/content/medieval-the-bards-tale) |
| Active trade offer | Medieval: Market Day | [OpenGameArt](https://opengameart.org/content/medieval-market-day) |
| Late game or finished game | Medieval: Rejoicing | [OpenGameArt](https://opengameart.org/content/medieval-rejoicing) |

All four tracks are by RandomMind and marked CC0 on their OpenGameArt pages.
Use the full MP3 versions to keep the bundle smaller than the provided loop WAVs.
Play a track once, then wait a random 20–60 seconds before replaying it. If the
game context changes, switch to that context's track immediately.

Late game means any public player score reaches 8 points; a finished game also
uses the late-game track. Trading means a public trade offer is active.

## Later candidates

Tranquil Fields and the Market Square day/night tracks, plus the two larger
music packs mentioned in the original research, are not part of v1. Verify
their exact source pages and licenses before adding them.

## Checklist

- [x] Rework the research into a scoped playlist and playback rules.
- [x] Verify the four selected tracks and their CC0 licenses.
- [x] Download the selected MP3s and record credits and source links.
- [x] Add persistent music controls, scene selection, and between-track gaps.
- [x] Test preferences, scene changes, replay timing, and playback errors.
- [x] Update the README and run focused tests, the full suite, and build.
- [x] Smoke-test local playback and record final results below.

## Validation

- `npm test` — 100 tests passed.
- `npm run build` — passed; Vite reports its Board3D chunk-size advisory.
- `git diff --check` — passed.
- Browser smoke test — enabled menu music from the entrance page; the control
  switched to "Pause music" without a playback error. All four local MP3 routes
  returned HTTP 200 with `audio/mpeg`.
- Dev server check — the Vite client served the app. A separate process already
  occupied port 3001, so the launched local server could not bind that port.
# Sound Effects Implementation Checklist

## Scope and acceptance

- Add optional, client-only sound effects using locally bundled Kenney CC0
  audio; do not add background music, runtime third-party requests,
  dependencies, or server/game-state changes.
- Keep sounds muted by default. Persist the enabled state and volume in
  `localStorage`, and provide an accessible control.
- Play cues only for new visible game events. Initial state, refresh, reconnect,
  reduced-motion settings, and switching board modes must not replay or suppress
  gameplay cues.

## Steps

- [x] Define the v1 scope, sound cues, and acceptance criteria.
- [x] Implement the client audio manager and saved preferences.
- [x] Detect sound cues from consecutive redacted views without parsing log
  text or replaying the initial view.
- [x] Add an accessible sound toggle and volume control to the game UI.
- [x] Verify Kenney's Casino Audio, Impact Sounds, and Interface Sounds packs
  are CC0 and select a small set of game-appropriate clips.
- [x] Bundle only the selected audio files and their original pack licenses.
- [x] Replace synthesized cues with decoded local audio, keeping playback
  errors visible in the sound settings.
- [x] Test local loading, playback, and failure handling; update the README
  with sound controls and asset sources.
- [x] Run focused tests, the full test suite, the production build, and
  `git diff --check`; record results here.

## Validation

- `npm test -- src/__tests__/events.test.tsx src/__tests__/sound.test.tsx` —
  7 tests passed.
- `npm test` — 94 tests passed.
- `npm run build` — passed; the existing large 3D bundle warning remains.
- Production browser smoke test — all six local Ogg clips fetched and decoded.
- `git diff --check` — passed.

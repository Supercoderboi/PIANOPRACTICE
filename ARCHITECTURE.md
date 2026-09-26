# PianoPractice architecture

## Data flow

`File -> MIDI adapter -> canonical Song -> IndexedDB / practice engine / notation renderer`

Practice input flows separately: `Web MIDI -> note messages -> deterministic PracticeEngine -> expected event IDs -> SVG highlights and measure scroll`.

Playback is an independent look-ahead Web Audio scheduler over canonical note times. Its current musical time feeds the same event IDs used by the score renderer, so playback and MIDI-driven practice both move the active score measure.

## Replacement boundaries

Parser-specific values do not leave `src/midi/parseMidi.ts`. A different parser can implement the same conversion to `Song`. Likewise, a score implementation can replace VexFlow if it keeps an event-ID to rendered-element mapping. Transcription should be an adapter that returns canonical `Song` data, with progress/cancel/confidence in its own service contract.

## Canonical representation

Songs store PPQ, tracks/instruments/channels, note pitches/tick starts/durations/seconds/velocity/track IDs, tempo changes, time signatures, key signatures, sustain CC64 events, and derived measures. Optional hand and confidence fields are ready for transcription/editor workflows.

## Dependencies

- React and TypeScript for UI and typed application modules.
- Vite for local development and bundling.
- `@tonejs/midi` for Standard MIDI File parsing and serialization support.
- VexFlow 5 for SVG notation engraving.
- Dexie 4 for IndexedDB persistence.
- Vitest for deterministic unit tests.

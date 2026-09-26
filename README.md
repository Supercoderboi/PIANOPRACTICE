# PianoPractice

Browser based piano practice built around MIDI files and local storage.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build, run `npm run build`; run automated checks with `npm test`.

Web MIDI is available in Chromium based browsers on secure contexts (localhost is allowed). Connect a USB MIDI keyboard, grant browser permission, and import a `.mid` or `.midi` file. Your library stays in this browser's IndexedDB; no account or server is required.

## Deploy to Netlify

This is a static Vite site. In Netlify, choose **Add new project → Import an existing project**, connect GitHub, and select `Supercoderboi/PIANOPRACTICE`. The included `netlify.toml` sets the build command to `npm run build` and the publish directory to `dist`; `.node-version` selects Node 22. No environment variables are required. After the first deploy, future pushes to the connected branch trigger redeploys.

The app stores imported songs in the current browser's IndexedDB. Netlify hosts the app files, but songs do not sync between devices.

## Architecture

- `src/midi/parseMidi.ts` adapts Standard MIDI Files into the canonical model. It retains tracks, instrument/channel, tempo and time/key signatures, note timing/velocity, and CC64 sustain events.
- `src/model/song.ts` defines that canonical model and tick/measure conversions. Neither UI nor practice code depends on parser-specific objects.
- `src/practice/engine.ts` deterministically groups simultaneous notes, applies pitch policy, and advances only when the expected event matches.
- `src/midi/webMidi.ts` owns browser device access and low latency note messages.
- `src/audio/SongPlayback.ts` schedules polyphonic notes from the canonical seconds/tempo map with a Web Audio look-ahead clock.
- `src/notation/renderMeasure.ts` engraves each measure from canonical tick positions, uses invisible spacers for silent spans, groups near-simultaneous pitches as chords, and links rendered SVG elements back to event IDs. `src/notation/exportPdf.ts` uses that same renderer to create a multi-page vector PDF with pitch names above every note.
- `public/sw.js` caches the app shell and same-origin assets for offline reopening after the first online visit. Imported songs remain in IndexedDB on this device.
- `src/storage/library.ts` stores songs in IndexedDB through Dexie.
- `src/ui` contains the React interface.

The transcription pipeline is intentionally not part of this slice. A future provider can accept authorized audio and return the same `Song` model; MIDI import remains independent of that service.

## Environment variables

There are no environment variables or backend services in this local first phase.

## Current scope

The current slice includes MIDI import, local library, event-linked grand-staff score display, Web MIDI input, follow/practice, tempo-synced polyphonic playback, falling-note visualization, note names above score notes, a downloadable multi-page PDF, and a scrollable 88-key keyboard. Choose both hands, tune/right hand, or bass/left hand; the setting filters practice, playback, and falling notes together. Notes with no stored hand are assigned by pitch, with middle C as the split. The app shell can reopen offline after an online load, with songs stored in IndexedDB. The score hides rests and snaps notation to a sixteenth-note grid for readability; canonical MIDI timing used by practice and playback is unchanged. MIDI export/editing, audio transcription, metronome, and loop controls remain later phases. Playback uses a built-in synthesized tone rather than recorded piano samples.

## Troubleshooting

- If MIDI access is unavailable, use current Chrome or Edge and open the app on `localhost` or HTTPS.
- If the device is missing, reconnect it, allow MIDI access in the browser prompt, then reconnect from Practice setup.
- The file picker accepts standard `.mid` and `.midi` files. A malformed file reports an import error rather than stopping the app.
- If a library entry disappears after clearing browser site data, that browser's IndexedDB was cleared; keep an exported copy of the source MIDI.

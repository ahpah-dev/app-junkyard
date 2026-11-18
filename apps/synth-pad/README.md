# Synth Pad

Sequence 16-step chiptune loops across four synthesized voices (Lead, Bass, Arp, Perc) and synthesize downloadable 16-bit PCM WAV files directly in the browser.

## Using the app

Choose a preset or click step cells on the sequencer canvas to toggle notes at the selected MIDI pitch. Adjust tempo (BPM), waveform (`square`, `triangle`, `saw`, `noise`), volume, and decay envelope per voice. Click **Render & play loop** to audition the generated loop or export standard `.wav` audio and JSON projects.

## Scope

Produces mono 16-bit PCM WAV files at 22,050 Hz across four tracks and 16 sixteenth-note steps.

## Forking it

Bundle `synth.js` into an indie game engine to generate procedural retro sound effects and music loops offline without audio asset files.

Use `npm run fork -- synth-pad <destination>` from the catalog root to extract this app with its runtime and license.

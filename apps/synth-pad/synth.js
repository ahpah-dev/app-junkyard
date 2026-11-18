export const steps = 16;
export const waveforms = ['square', 'triangle', 'saw', 'noise'];

export const presets = [
  {
    name: 'Arcade March',
    values: {
      version: 1,
      title: 'Arcade March',
      bpm: 132,
      tracks: [
        {
          name: 'Lead',
          waveform: 'square',
          volume: 0.55,
          decayMs: 140,
          notes: [72, null, 76, null, 79, 76, 72, null, 74, null, 77, null, 79, 84, 79, null],
        },
        {
          name: 'Bass',
          waveform: 'triangle',
          volume: 0.75,
          decayMs: 180,
          notes: [48, null, 48, null, 55, null, 48, null, 50, null, 50, null, 55, null, 43, null],
        },
        {
          name: 'Arp',
          waveform: 'saw',
          volume: 0.35,
          decayMs: 90,
          notes: [60, 64, 67, 64, 60, 64, 67, 72, 62, 65, 69, 65, 67, 71, 74, 79],
        },
        {
          name: 'Perc',
          waveform: 'noise',
          volume: 0.45,
          decayMs: 70,
          notes: [60, null, 72, null, 60, null, 72, 72, 60, null, 72, null, 60, 72, 60, 72],
        },
      ],
    },
  },
  {
    name: 'Coin Chime',
    values: {
      version: 1,
      title: 'Coin Chime',
      bpm: 160,
      tracks: [
        {
          name: 'Lead',
          waveform: 'square',
          volume: 0.65,
          decayMs: 160,
          notes: [83, 88, null, null, 83, 88, null, null, 88, 91, 95, null, null, null, null, null],
        },
        {
          name: 'Bass',
          waveform: 'triangle',
          volume: 0.5,
          decayMs: 120,
          notes: [52, null, null, null, 52, null, null, null, 52, null, 59, null, null, null, null, null],
        },
        { name: 'Arp', waveform: 'saw', volume: 0.3, decayMs: 80, notes: Array(16).fill(null) },
        { name: 'Perc', waveform: 'noise', volume: 0.3, decayMs: 50, notes: Array(16).fill(null) },
      ],
    },
  },
  {
    name: 'Boss Alarm',
    values: {
      version: 1,
      title: 'Boss Alarm',
      bpm: 145,
      tracks: [
        {
          name: 'Lead',
          waveform: 'saw',
          volume: 0.6,
          decayMs: 150,
          notes: [60, 61, 60, 61, 63, 64, 63, 64, 60, 61, 60, 61, 67, 66, 63, 61],
        },
        {
          name: 'Bass',
          waveform: 'square',
          volume: 0.65,
          decayMs: 160,
          notes: [36, null, 36, 36, 39, null, 39, 39, 36, null, 36, 36, 43, null, 42, null],
        },
        { name: 'Arp', waveform: 'triangle', volume: 0.4, decayMs: 100, notes: Array(16).fill(null) },
        {
          name: 'Perc',
          waveform: 'noise',
          volume: 0.55,
          decayMs: 80,
          notes: [60, null, 60, null, 60, null, 60, 60, 60, null, 60, null, 60, 60, 60, 60],
        },
      ],
    },
  },
];

export const initial = structuredClone(presets[0].values);

export function valid(p) {
  return (
    p?.version === 1 &&
    typeof p.title === 'string' &&
    p.title.length <= 60 &&
    Number.isInteger(p.bpm) &&
    p.bpm >= 60 &&
    p.bpm <= 240 &&
    Array.isArray(p.tracks) &&
    p.tracks.length === 4 &&
    p.tracks.every(
      (t) =>
        t &&
        typeof t.name === 'string' &&
        waveforms.includes(t.waveform) &&
        typeof t.volume === 'number' &&
        t.volume >= 0 &&
        t.volume <= 1 &&
        Number.isInteger(t.decayMs) &&
        t.decayMs >= 20 &&
        t.decayMs <= 500 &&
        Array.isArray(t.notes) &&
        t.notes.length === steps &&
        t.notes.every((n) => n === null || (Number.isInteger(n) && n >= 24 && n <= 108)),
    )
  );
}

export function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function renderPCM(p, sampleRate = 22050) {
  if (!valid(p)) throw Error('Invalid Synth Pad project.');
  const stepSec = 60 / p.bpm / 4;
  const stepSamples = Math.round(stepSec * sampleRate);
  const totalSamples = stepSamples * steps;
  const mix = new Float32Array(totalSamples);

  for (const track of p.tracks) {
    if (track.volume <= 0) continue;
    const decaySamples = Math.max(1, Math.round((track.decayMs / 1000) * sampleRate));
    const attackSamples = Math.max(1, Math.round(0.005 * sampleRate));
    for (let s = 0; s < steps; s++) {
      const midi = track.notes[s];
      if (midi === null) continue;
      const freq = midiToHz(midi);
      const start = s * stepSamples;
      const noteLen = Math.min(totalSamples - start, Math.max(stepSamples, decaySamples));
      let phase = 0;
      let rng = (s + 1) * 2654435761;
      for (let i = 0; i < noteLen; i++) {
        const env =
          i < attackSamples ? i / attackSamples : Math.max(0, 1 - (i - attackSamples) / decaySamples);
        let osc = 0;
        if (track.waveform === 'square') {
          osc = phase < 0.5 ? 1 : -1;
        } else if (track.waveform === 'triangle') {
          osc = 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25));
        } else if (track.waveform === 'saw') {
          osc = 2 * phase - 1;
        } else {
          rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
          osc = (rng / 4294967296) * 2 - 1;
        }
        phase = (phase + freq / sampleRate) % 1;
        mix[start + i] += osc * env * track.volume * 0.45;
      }
    }
  }
  for (let i = 0; i < mix.length; i++) mix[i] = Math.tanh(mix[i]);
  return mix;
}

export function encodeWAV(samples, sampleRate = 22050) {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }
  return new Uint8Array(buffer);
}

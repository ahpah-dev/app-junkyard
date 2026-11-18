import {
  button,
  draft,
  el,
  field,
  importFile,
  input,
  persist,
  saveFile,
  select,
  studio,
} from '../../shared/creative.js';
import { encodeWAV, initial, presets, renderPCM, steps, valid, waveforms } from './synth.js';

const pitches = [
  [36, 'C2'], [43, 'G2'], [48, 'C3'], [52, 'E3'], [55, 'G3'],
  [60, 'C4'], [62, 'D4'], [64, 'E4'], [65, 'F4'], [67, 'G4'],
  [69, 'A4'], [71, 'B4'], [72, 'C5'], [74, 'D5'], [76, 'E5'],
  [77, 'F5'], [79, 'G5'], [84, 'C6'],
];

export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let p = draft(ctx, initial, valid),
    activeTrack = 0,
    brushMidi = 72,
    audioUrl = null;
  const canvas = el('canvas', {
      width: 640,
      height: 220,
      'aria-label': '16-step 4-track chiptune pattern sequencer',
    }),
    caption = el('p', { className: 'cr-caption' }),
    playerHost = el('div');

  const save = () => persist(ctx, p, status);

  function draw() {
    const c = canvas.getContext('2d');
    const padL = 76;
    const cellW = (canvas.width - padL) / steps;
    const rowH = canvas.height / p.tracks.length;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#1d2d30';
    c.fillRect(0, 0, canvas.width, canvas.height);

    p.tracks.forEach((tr, r) => {
      c.fillStyle = r === activeTrack ? '#f4c76c' : '#d8dfd8';
      c.font = 'bold 13px sans-serif';
      c.textBaseline = 'middle';
      c.fillText(`${tr.name} (${tr.waveform[0].toUpperCase()})`, 10, (r + 0.5) * rowH);
      for (let s = 0; s < steps; s++) {
        const x = padL + s * cellW,
          y = r * rowH;
        const note = tr.notes[s];
        const beat = Math.floor(s / 4) % 2 === 0;
        c.fillStyle = note !== null ? (r === activeTrack ? '#e35525' : '#52937b') : beat ? '#2a3e42' : '#233538';
        c.fillRect(x + 2, y + 4, cellW - 4, rowH - 8);
        if (note !== null) {
          c.fillStyle = '#ffffff';
          c.font = 'bold 10px monospace';
          c.fillText(String(note), x + 6, y + rowH / 2);
        }
      }
    });
    const activeNotes = p.tracks.reduce((sum, t) => sum + t.notes.filter((n) => n !== null).length, 0);
    caption.textContent = `${p.title} · ${p.bpm} BPM · ${activeNotes} active notes · Click cells to toggle pitch ${brushMidi}`;
  }

  canvas.onclick = (e) => {
    const box = canvas.getBoundingClientRect();
    const px = ((e.clientX - box.left) * canvas.width) / box.width;
    const py = ((e.clientY - box.top) * canvas.height) / box.height;
    const padL = 76;
    if (px < padL) {
      activeTrack = Math.max(0, Math.min(3, Math.floor((py * 4) / canvas.height)));
      rebuildTools();
      draw();
      return;
    }
    const stepIdx = Math.floor(((px - padL) * steps) / (canvas.width - padL));
    const trackIdx = Math.floor((py * 4) / canvas.height);
    if (stepIdx < 0 || stepIdx >= steps || trackIdx < 0 || trackIdx >= 4) return;
    activeTrack = trackIdx;
    const notes = p.tracks[trackIdx].notes;
    notes[stepIdx] = notes[stepIdx] === null ? brushMidi : null;
    save();
    rebuildTools();
    draw();
  };

  function makeWavBlob() {
    const pcm = renderPCM(p, 22050);
    return new Blob([encodeWAV(pcm, 22050)], { type: 'audio/wav' });
  }

  function rebuildTools() {
    const tr = p.tracks[activeTrack];
    tools.replaceChildren(
      field(
        'Load preset',
        select(
          [['', 'Choose preset…'], ...presets.map((pr, i) => [String(i), pr.name])],
          '',
          (v) => {
            if (!v) return;
            p = structuredClone(presets[Number(v)].values);
            save();
            rebuildTools();
            draw();
          },
        ),
      ),
      field(
        'Loop title',
        input('text', p.title, (v) => {
          p.title = v;
          save();
          draw();
        }, { maxlength: 60 }),
      ),
      field(
        'Tempo (BPM)',
        input('number', p.bpm, (v) => {
          const n = Number(v);
          if (Number.isInteger(n) && n >= 60 && n <= 240) {
            p.bpm = n;
            save();
            draw();
          }
        }, { min: 60, max: 240, step: 1 }),
      ),
      field(
        'Active voice',
        select(
          p.tracks.map((t, i) => [String(i), t.name]),
          String(activeTrack),
          (v) => {
            activeTrack = Number(v);
            rebuildTools();
            draw();
          },
        ),
      ),
      field(
        'Paint MIDI note',
        select(
          pitches.map(([m, label]) => [String(m), `${label} (MIDI ${m})`]),
          String(brushMidi),
          (v) => {
            brushMidi = Number(v);
            draw();
          },
        ),
      ),
      field(
        tr.name + ' waveform',
        select(
          waveforms.map((w) => [w, w[0].toUpperCase() + w.slice(1)]),
          tr.waveform,
          (v) => {
            tr.waveform = v;
            save();
            draw();
          },
        ),
      ),
      field(
        tr.name + ' volume',
        input('range', tr.volume, (v) => {
          tr.volume = Number(v);
          save();
        }, { min: 0, max: 1, step: 0.05 }),
      ),
      field(
        tr.name + ' decay (ms)',
        input('number', tr.decayMs, (v) => {
          const n = Number(v);
          if (Number.isInteger(n) && n >= 20 && n <= 500) {
            tr.decayMs = n;
            save();
          }
        }, { min: 20, max: 500, step: 10 }),
      ),
      button('Render & play loop', () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        audioUrl = URL.createObjectURL(makeWavBlob());
        const audio = el('audio', { controls: true, loop: true, autoplay: true, src: audioUrl, style: 'width:100%' });
        playerHost.replaceChildren(audio);
      }),
      button('Download WAV audio', () =>
        saveFile((p.title || 'synth').toLowerCase().replace(/[^a-z0-9-]+/g, '-') + '.wav', makeWavBlob(), 'audio/wav'),
      ),
      button('Clear voice track', () => {
        tr.notes.fill(null);
        save();
        draw();
      }),
      button('Save project JSON', () => saveFile('synth-project.json', JSON.stringify(p, null, 2))),
      importFile(
        'Open project JSON',
        (d) => {
          if (!valid(d)) throw Error('Choose a Synth Pad v1 project.');
          p = d;
          save();
          rebuildTools();
          draw();
        },
        status,
      ),
    );
  }

  stage.append(el('div', { className: 'cr-preview' }, canvas), caption, playerHost, status);
  rebuildTools();
  draw();
}

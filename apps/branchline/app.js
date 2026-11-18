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
import { initial, exportGame, links, validProject } from './engine.js';
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let p = draft(ctx, initial, validProject),
    active = p.start;
  const editor = el('div', { className: 'cr-stage' }),
    frame = el('div'),
    audit = el('p', { className: 'cr-caption' });
  stage.append(editor, audit, status, frame);
  const scene = () => p.scenes.find((s) => s.id === active),
    options = () => p.scenes.map((s) => [s.id, s.name || s.id]);
  function changed() {
    persist(ctx, p, status);
    const orphan = links(p);
    audit.textContent = orphan.length
      ? 'No incoming path from opening scene: ' + orphan.join(', ')
      : p.scenes.length + ' scenes · every scene is linked from the opening';
  }
  function rebuild() {
    frame.replaceChildren();
    const s = scene(),
      body = el('textarea', {
        rows: 5,
        maxlength: 4000,
        oninput: (e) => {
          s.body = e.target.value;
          changed();
        },
      });
    body.value = s.body;
    const name = input(
      'text',
      s.name,
      (v) => {
        s.name = v;
        changed();
        tools.querySelectorAll('option').forEach((o) => {
          if (o.value === s.id) o.textContent = s.name || s.id;
        });
        editor.querySelectorAll('option').forEach((o) => {
          if (o.value === s.id) o.textContent = s.name || s.id;
        });
      },
      { maxlength: 80 },
    );
    tools.replaceChildren(
      field(
        'Story title',
        input(
          'text',
          p.title,
          (v) => {
            p.title = v;
            changed();
          },
          { maxlength: 80 },
        ),
      ),
      field(
        'Edit scene',
        select(options(), active, (id) => {
          active = id;
          rebuild();
        }),
      ),
      field(
        'Opening scene',
        select(options(), p.start, (id) => {
          p.start = id;
          changed();
        }),
      ),
      button('Add scene', () => {
        if (p.scenes.length >= 100) {
          status.textContent = 'Maximum 100 scenes.';
          return;
        }
        let n = 1;
        while (p.scenes.some((s) => s.id === 'scene-' + n)) n++;
        active = 'scene-' + n;
        p.scenes.push({
          id: active,
          name: 'Scene ' + n,
          body: '',
          choices: [],
        });
        rebuild();
        changed();
      }),
      button('Remove scene', () => {
        if (p.scenes.length === 1) {
          status.textContent = 'Keep at least one scene.';
          return;
        }
        const removed = active;
        p.scenes = p.scenes.filter((s) => s.id !== removed);
        p.scenes.forEach((s) => (s.choices = s.choices.filter((c) => c.to !== removed)));
        if (p.start === removed) p.start = p.scenes[0].id;
        active = p.start;
        rebuild();
        changed();
      }),
      button('Play story', () => {
        const game = el('iframe', {
          title: 'Story playtest',
          sandbox: 'allow-scripts',
          srcdoc: exportGame(p),
        });
        frame.replaceChildren(game);
        game.scrollIntoView({ block: 'nearest' });
      }),
      button('Export playable HTML', () => saveFile('story.html', exportGame(p), 'text/html')),
      button('Save project JSON', () => saveFile('story-project.json', JSON.stringify(p, null, 2))),
      importFile(
        'Open project JSON',
        (data) => {
          if (!validProject(data)) throw Error('Choose a linked Branchline v1 project.');
          p = data;
          active = p.start;
          rebuild();
          changed();
        },
        status,
      ),
    );
    editor.replaceChildren(field('Scene name', name), field('Passage', body));
    for (const [i, c] of s.choices.entries()) {
      const change = (k) => (v) => {
        c[k] = v;
        changed();
      };
      editor.append(
        el(
          'fieldset',
          { className: 'cr-stage' },
          el('legend', {}, 'Choice ' + (i + 1)),
          field('Button text', input('text', c.label, change('label'), { maxlength: 140 })),
          field('Destination', select(options(), c.to, change('to'))),
          el(
            'div',
            { className: 'cr-row' },
            field('Requires flag', input('text', c.need, change('need'), { maxlength: 40 })),
            field('Grants flag', input('text', c.set, change('set'), { maxlength: 40 })),
          ),
          button('Remove choice', () => {
            s.choices.splice(i, 1);
            rebuild();
            changed();
          }),
        ),
      );
    }
    editor.append(
      button('Add choice', () => {
        if (s.choices.length >= 12) {
          status.textContent = 'Maximum 12 choices per scene.';
          return;
        }
        s.choices.push({
          label: 'Continue',
          to: p.scenes.find((v) => v !== s)?.id || s.id,
          need: '',
          set: '',
        });
        rebuild();
        changed();
      }),
    );
  }
  rebuild();
  changed();
}

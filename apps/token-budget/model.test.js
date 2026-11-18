import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateTokens, packPrompt } from './model.js';

test('estimates subword tokens and character density', () => {
  const short = estimateTokens('hello world');
  assert.equal(short.tokens, 2);
  const longWord = estimateTokens('internationalization');
  assert.ok(longWord.tokens >= 4);
  assert.ok(longWord.charsPerToken > 0);
});

test('packs prompt sections by priority, enforces budget, and forecasts costs', () => {
  const sections = [
    { id: 'low', role: 'history', priority: 5, text: 'word '.repeat(120) },
    { id: 'sys', role: 'system', priority: 1, text: 'always keep this system instruction' },
  ];
  const r = packPrompt(sections, 150, 50, 2, 10, 1000);
  assert.equal(r.availableInput, 100);
  assert.ok(r.usedInputTokens <= 100);
  assert.equal(r.sections.find((s) => s.id === 'sys').status, 'Kept');
  assert.notEqual(r.sections.find((s) => s.id === 'low').status, 'Kept');
  assert.ok(r.monthlyCostUsd > 0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { productionNote } from './telegram-production-note.mjs';
const pr = { number: 1000, title: '[CI2][iHP] Repair Home navigation', body: 'DOT-Release-Note: Fixed Home navigation and loading.\n\n## Verification\nPassed.' };
test('success contains only surface, PR number and reviewed release note', () => {
  assert.equal(productionNote({ surface: 'iHP', pr, result: 'success' }), 'iHP · PR #1000 · Fixed Home navigation and loading.');
});
test('eHP format remains available without sending anything', () => {
  assert.equal(productionNote({ surface: 'eHP', pr: { number: 12, title: '[CI3][eHP] Fix menu layout' }, result: 'success' }), 'eHP · PR #12 · Fix menu layout');
});
test('failure is explicit within the terse note', () => {
  assert.equal(productionNote({ surface: 'iHP', pr, result: 'failure' }), 'iHP · PR #1000 · Deploy failed: Fixed Home navigation and loading.');
});
test('empty template field falls back to cleaned PR title', () => {
  for (const value of ['', '   ', '\t\t']) {
    assert.equal(productionNote({ surface: 'iHP', pr: { ...pr, body: `DOT-Release-Note:${value}\n\n## Verification` }, result: 'success' }), 'iHP · PR #1000 · Repair Home navigation');
  }
});
test('unknown PR, unknown surface and cancelled result cannot fabricate a note', () => {
  assert.throws(() => productionNote({ surface: 'iHP', pr: {}, result: 'success' }));
  assert.throws(() => productionNote({ surface: 'unknown', pr, result: 'success' }));
  assert.throws(() => productionNote({ surface: 'iHP', pr, result: 'cancelled' }));
});
test('links, extra lines and control characters do not leak into the note', () => {
  const note = productionNote({ surface: 'iHP', pr: { number: 10, title: 'Fix menu https://example.com\n layout', body: 'ChatGPT-Conversation-Title: Secret title\nChatGPT-Chat: https://chatgpt.com/c/test' }, result: 'success' });
  assert.equal(note, 'iHP · PR #10 · Fix menu layout');
  assert.ok(!note.includes('ChatGPT') && !note.includes('https:') && !note.includes('\n'));
});

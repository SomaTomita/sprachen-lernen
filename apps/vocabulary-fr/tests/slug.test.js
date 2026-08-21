import test from 'node:test';
import assert from 'node:assert/strict';
import { slugId } from '../tools/slug.mjs';

test('strips French accents', () => {
  assert.equal(slugId('café', 'A1'), 'a1-cafe');
  assert.equal(slugId('élève', 'A1'), 'a1-eleve');
  assert.equal(slugId('français', 'A1'), 'a1-francais');
  assert.equal(slugId('être', 'A1'), 'a1-etre');
  assert.equal(slugId('naïf', 'A1'), 'a1-naif');
});
test('expands the œ/æ ligatures (NFD does not decompose them)', () => {
  assert.equal(slugId('sœur', 'A1'), 'a1-soeur');
  assert.equal(slugId('œuf', 'A1'), 'a1-oeuf');
  assert.equal(slugId('cœur', 'A1'), 'a1-coeur');
});
test('apostrophes and spaces become single hyphens', () => {
  assert.equal(slugId("aujourd'hui", 'A1'), 'a1-aujourd-hui');
});

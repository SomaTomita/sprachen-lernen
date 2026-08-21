import test from 'node:test';
import assert from 'node:assert/strict';
import { displayHeadword, HARD_H } from '../tools/elision.mjs';

test('no elision before a consonant', () => {
  assert.equal(displayHeadword('le', 'livre'), 'le livre');
  assert.equal(displayHeadword('la', 'maison'), 'la maison');
});
test("elides to l' before a vowel", () => {
  assert.equal(displayHeadword('la', 'école'), "l'école");
  assert.equal(displayHeadword('le', 'enfant'), "l'enfant");
  assert.equal(displayHeadword('la', 'eau'), "l'eau");
  assert.equal(displayHeadword('le', 'ami'), "l'ami");
});
test("elides before a mute h but not an aspirated h", () => {
  assert.equal(displayHeadword('le', 'homme'), "l'homme");
  assert.equal(displayHeadword('le', 'hôtel'), "l'hôtel");
  assert.equal(displayHeadword('le', 'héros'), 'le héros');   // h aspiré
});
test('accented vowels elide too', () => {
  assert.equal(displayHeadword('la', 'île'), "l'île");
  assert.equal(displayHeadword('le', 'être'), "l'être");
});
test('no article returns the bare lemma', () => {
  assert.equal(displayHeadword(null, 'parler'), 'parler');
  assert.equal(displayHeadword(undefined, 'bon'), 'bon');
});
test('the aspirated-h list is exported so data tasks can extend it', () => {
  assert.ok(HARD_H instanceof Set);
  assert.ok(HARD_H.has('héros'));
});

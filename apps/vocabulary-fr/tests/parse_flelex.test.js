import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFlelex, FLELEX_POS } from '../tools/parse_flelex.mjs';

const SAMPLE = [
  'word\ttag\tfreq_A1\tfreq_A2\tfreq_B1\tfreq_B2\tfreq_C1\tfreq_C2\tfreq_total\tlevel',
  'maison\tNOM\t100\t0\t0\t0\t0\t0\t100\tA1',
  'être\tNOM\t0\t0\t10\t0\t0\t0\t10\tB1',      // homograph: 名詞は B1
  'être\tVER\t900\t0\t0\t0\t0\t0\t900\tA1',    // homograph: 動詞は A1
  'abaisser\tVER\t0\t0\t0\t1\t0\t0\t1\tB2',
].join('\r\n');                                  // ← CRLF

test('keeps only rows at the requested level, ignoring CRLF', () => {
  const out = parseFlelex(SAMPLE, 'A1');
  assert.deepEqual(out.map(r => `${r.lemma}/${r.pos}`).sort(), ['maison/noun', 'être/verb']);
});
test('treats homographs as separate rows (être is VER=A1 even though NOM=B1)', () => {
  const out = parseFlelex(SAMPLE, 'A1');
  const etre = out.find(r => r.lemma === 'être');
  assert.equal(etre.pos, 'verb');
});
test('maps the TreeTagger tagset to internal pos', () => {
  assert.equal(FLELEX_POS['NOM'], 'noun');
  assert.equal(FLELEX_POS['VER'], 'verb');
  assert.equal(FLELEX_POS['ADJ'], 'adjective');
  assert.equal(FLELEX_POS['PRO'], 'pronoun');
  assert.equal(FLELEX_POS['KON'], 'conjunction');
});

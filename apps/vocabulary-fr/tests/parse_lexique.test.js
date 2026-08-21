import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLexique } from '../tools/parse_lexique.mjs';

const HDR = 'ortho\tphon\tlemme\tcgram\tgenre\tnombre\tfreqlemfilms2\tfreqlemlivres';
const SAMPLE = [
  HDR,
  'maison\tmEzO~\tmaison\tNOM\tf\ts\t100\t90',
  'maisons\tmEzO~\tmaison\tNOM\tf\tp\t20\t18',
  'livre\tlivR\tlivre\tNOM\tm\ts\t80\t70',
  'journal\tZuRnal\tjournal\tNOM\tm\ts\t50\t40',
  'journaux\tZuRno\tjournal\tNOM\tm\tp\t10\t9',
  'parler\tpaRle\tparler\tVER\t\t\t200\t180',
].join('\n');

test('gives gender as the article le/la for nouns', () => {
  const lx = parseLexique(SAMPLE);
  assert.equal(lx.get('maison').article, 'la');
  assert.equal(lx.get('livre').article, 'le');
});
test('picks up the irregular plural from the p-number row', () => {
  const lx = parseLexique(SAMPLE);
  assert.equal(lx.get('maison').plural, 'maisons');
  assert.equal(lx.get('journal').plural, 'journaux');
});
test('non-nouns carry no article or plural', () => {
  const lx = parseLexique(SAMPLE);
  assert.equal(lx.get('parler').article, null);
  assert.equal(lx.get('parler').plural, null);
});

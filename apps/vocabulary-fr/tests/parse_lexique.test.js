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

// 回帰テスト: Lexique は同一 lemma に男性形/女性形の行を別々に持ち、行順は保証されない。
// 性と複数形を別々の行から拾うと `le ami` に `amies` が付いたり、先頭が女性形の
// amoureux で性を取り違える（実測 A1 名詞 634 のうち 32 件が該当した）。
test('takes gender and plural from the same gender row (ortho == lemme is the anchor)', () => {
  const HDR2 = 'ortho\tphon\tlemme\tcgram\tgenre\tnombre\tfreqlemfilms2\tfreqlemlivres';
  const SAMPLE2 = [
    HDR2,
    // ami: 男性単数 → 女性単数 → 女性複数 → 男性複数（女性複数が男性複数より前に来る）
    'ami\tami\tami\tNOM\tm\ts\t10\t10',
    'amie\tami\tami\tNOM\tf\ts\t5\t5',
    'amies\tami\tami\tNOM\tf\tp\t4\t4',
    'amis\tami\tami\tNOM\tm\tp\t8\t8',
    // amoureux: 女性形の行が先頭に来るケース
    'amoureuse\tamuRoz\tamoureux\tNOM\tf\ts\t3\t3',
    'amoureuses\tamuRoz\tamoureux\tNOM\tf\tp\t2\t2',
    'amoureux\tamuRo\tamoureux\tNOM\tm\ts\t6\t6',
  ].join('\n');
  const lx = parseLexique(SAMPLE2);
  assert.equal(lx.get('ami').article, 'le');
  assert.equal(lx.get('ami').plural, 'amis');        // amies (女性) を拾ってはいけない
  assert.equal(lx.get('amoureux').article, 'le');    // 先頭の女性行に引きずられない
  assert.equal(lx.get('amoureux').plural, null);     // -x は不変（lemma と同形なので null）
});

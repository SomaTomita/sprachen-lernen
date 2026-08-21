import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntry, buildAll } from '../tools/build_seed.mjs';

test('maps row → seed entry (no examples yet)', () => {
  const e = buildEntry({ lemma:'huis', pos:'noun', article:'het', plural:'huizen', ja:'家', en:'house' }, 'A1');
  assert.deepEqual(e, {
    id:'a1-huis', lemma:'huis', pos:'noun', article:'het', plural:'huizen',
    level:'A1', lemmaAudio:'audio/lemma/a1-huis.mp3',
    meanings:[{ ja:'家', en:'house' }],
  });
  assert.equal('examples' in e, false);
});
test('omits article/plural when absent; dedupes by id (first wins)', () => {
  const rows = [
    { lemma:'lopen', pos:'verb', ja:'歩く', en:'to walk' },
    { lemma:'huis', pos:'noun', article:'het', ja:'家', en:'house' },
    { lemma:'huis', pos:'noun', article:'het', ja:'住宅', en:'house' },
  ];
  const out = buildAll(rows, 'A1');
  assert.equal(out.length, 2);
  assert.equal('article' in out[0], false);
  assert.equal(out[1].meanings[0].ja, '家');
});

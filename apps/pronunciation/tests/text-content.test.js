import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = JSON.parse(readFileSync(new URL('../data/text.json', import.meta.url), 'utf8'));

// 教材 Vorstellung の原文（ユーザー提供スクリーンショット）。
// 表示テキスト = 各文の tokens[].t を空白連結 → 文を空白連結。数詞は教材どおり数字。
const EXPECTED = {
  p1: 'Mein Name ist Anna. Ich komme aus Österreich und lebe seit drei Jahren in Deutschland. Ich bin 15 Jahre alt und habe zwei Geschwister: Meine Schwester heißt Klara und ist 13 Jahre alt, mein Bruder Michael ist 18 Jahre alt. Wir wohnen mit unseren Eltern in einem Haus in der Nähe von München. Meine Mutter ist Köchin, mein Vater arbeitet in einer Bank.',
  p2: 'Ich lese gerne und mag Tiere: Wir haben einen Hund, zwei Katzen und im Garten einen Teich mit Goldfischen. Ich gehe auch gerne in die Schule, mein Lieblingsfach ist Mathematik. Physik und Chemie mag ich nicht so gerne.',
  p3: 'Nach der Schule gehe ich oft mit meinen Freundinnen im Park spazieren, manchmal essen wir ein Eis. Am Samstag gehen wir oft ins Kino. Am Sonntag schlafe ich lange, dann koche ich mit meiner Mutter das Mittagessen. Nach dem Essen gehen wir mit dem Hund am See spazieren. Sonntag ist mein Lieblingstag!',
};

/** 段落の表示テキストを tokens から復元 */
function displayText(paragraph) {
  return paragraph.sentences.map(s => s.tokens.map(t => t.t).join(' ')).join(' ');
}

test('段落は3つ', () => {
  assert.equal(text.paragraphs.length, 3);
  assert.deepEqual(text.paragraphs.map(p => p.id), ['p1', 'p2', 'p3']);
});

test('表示テキストが教材原文と完全一致（段落ごと）', () => {
  for (const p of text.paragraphs) {
    assert.equal(displayText(p), EXPECTED[p.id], `${p.id} の本文が原文と一致しない`);
  }
});

test('全文（3段落連結）が原文と一致', () => {
  const all = text.paragraphs.map(displayText).join(' ');
  assert.equal(all, [EXPECTED.p1, EXPECTED.p2, EXPECTED.p3].join(' '));
});

test('数詞トークンは表示=数字・音声(de/word)=読み下し（WordBoundary 整合の回帰防止）', () => {
  for (const p of text.paragraphs) {
    for (const s of p.sentences) {
      for (const tok of s.tokens) {
        if (/^\d+$/.test(tok.t)) {
          assert.ok(tok.word && !/^\d+$/.test(tok.word), `${s.id}: 数字トークン "${tok.t}" に読み(word)が無い`);
          assert.ok(s.de.includes(tok.word), `${s.id}: de に読み "${tok.word}" が含まれない（音声タイミングがずれる）`);
          assert.ok(!s.de.includes(tok.t), `${s.id}: de に数字 "${tok.t}" が残っている（WordBoundary が出ない）`);
        }
      }
    }
  }
});

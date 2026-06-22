import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = JSON.parse(readFileSync(new URL('../data/text.json', import.meta.url), 'utf8'));

test('全トークンの rule id が rules に存在する', () => {
  const ids = new Set(text.rules.map(r => r.id));
  for (const p of text.paragraphs)
    for (const s of p.sentences)
      for (const tok of s.tokens)
        for (const id of tok.r || [])
          assert.ok(ids.has(id), `${s.id}: unknown rule "${id}"`);
});

test('timing があれば tokens と件数一致', () => {
  for (const p of text.paragraphs)
    for (const s of p.sentences)
      if (s.timing && s.timing.length)
        assert.equal(s.timing.length, s.tokens.length, `${s.id} mismatch`);
});

test('各文に audio パスと最低1トークン', () => {
  for (const p of text.paragraphs)
    for (const s of p.sentences) {
      assert.match(s.audio, /^audio\/.+\.mp3$/);
      assert.ok(s.tokens.length > 0);
    }
});

test('全ての見出し語に英語の対訳(glossary)がある', () => {
  const clean = w => String(w).replace(/^[.,:;!?]+|[.,:;!?]+$/g, '').toLowerCase();
  const g = text.glossary || {};
  const missing = new Set();
  for (const p of text.paragraphs)
    for (const s of p.sentences)
      for (const tok of s.tokens) {
        const key = clean(tok.word || tok.t);
        if (!g[key] || !g[key].trim()) missing.add(key);
      }
  assert.equal(missing.size, 0, `英語訳が無い見出し語: ${[...missing].join(', ')}`);
});

test('sentence.id は一意', () => {
  const seen = new Set();
  for (const p of text.paragraphs)
    for (const s of p.sentences) {
      assert.ok(!seen.has(s.id), `duplicate id ${s.id}`);
      seen.add(s.id);
    }
});

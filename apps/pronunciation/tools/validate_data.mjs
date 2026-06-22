import { readFileSync } from 'node:fs';

const text = JSON.parse(readFileSync(new URL('../data/text.json', import.meta.url), 'utf8'));
const ruleIds = new Set((text.rules || []).map(r => r.id));
const errors = [];

for (const p of text.paragraphs) {
  for (const s of p.sentences) {
    // ルールID の存在
    for (const tok of s.tokens) {
      for (const id of tok.r || []) {
        if (!ruleIds.has(id)) errors.push(`${s.id}: unknown rule id "${id}" on token "${tok.t}"`);
      }
    }
    // timing が入っていれば件数一致
    if (s.timing && s.timing.length && s.timing.length !== s.tokens.length) {
      errors.push(`${s.id}: timing(${s.timing.length}) != tokens(${s.tokens.length}) — de="${s.de}"`);
    }
  }
}

if (errors.length) {
  console.error('VALIDATION FAILED:');
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('text.json OK');

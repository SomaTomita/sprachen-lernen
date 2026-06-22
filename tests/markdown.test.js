import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, renderInline, escapeHtml } from '../js/markdown.js';

test('escapeHtml neutralizes angle brackets and quotes', () => {
  assert.equal(escapeHtml('<b>"&"</b>'), '&lt;b&gt;&quot;&amp;&quot;&lt;/b&gt;');
});

test('inline: bold, italic, code', () => {
  assert.equal(renderInline('**a** and *b* and `c`'), '<strong>a</strong> and <em>b</em> and <code>c</code>');
});

test('inline: link with underscores in URL is not mangled by italic', () => {
  const out = renderInline('[A2 Modellsatz](https://www.goethe.de/A2_Modellsatz_Erwachsene.pdf)');
  assert.match(out, /href="https:\/\/www\.goethe\.de\/A2_Modellsatz_Erwachsene\.pdf"/);
  assert.doesNotMatch(out, /<em>/);
  assert.match(out, /target="_blank"/);
});

test('inline: relative .md link kept as-is, no target', () => {
  const out = renderInline('[A2](../exam-info/goethe-a2.md)');
  assert.equal(out, '<a href="../exam-info/goethe-a2.md">A2</a>');
});

test('inline: javascript: URL is neutralized', () => {
  const out = renderInline('[x](javascript:alert(1))');
  assert.match(out, /href="#"/);
  assert.doesNotMatch(out, /javascript:/);
});

test('inline: code with angle brackets is escaped, not parsed', () => {
  assert.equal(renderInline('`<script>`'), '<code>&lt;script&gt;</code>');
});

test('heading levels', () => {
  assert.equal(renderMarkdown('# Title'), '<h1>Title</h1>');
  assert.equal(renderMarkdown('### Sub'), '<h3>Sub</h3>');
});

test('horizontal rule', () => {
  assert.equal(renderMarkdown('---'), '<hr>');
});

test('GFM table with alignment', () => {
  const md = ['| A | B |', '|:--|--:|', '| 1 | 2 |'].join('\n');
  const out = renderMarkdown(md);
  assert.match(out, /<div class="table-wrap"><table>/);
  assert.match(out, /<th style="text-align:left">A<\/th>/);
  assert.match(out, /<th style="text-align:right">B<\/th>/);
  assert.match(out, /<td style="text-align:left">1<\/td>/);
});

test('table cells receive inline formatting', () => {
  const md = ['| Wort | Laut |', '|---|---|', '| `w` | **v** |'].join('\n');
  const out = renderMarkdown(md);
  assert.match(out, /<td><code>w<\/code><\/td>/);
  assert.match(out, /<td><strong>v<\/strong><\/td>/);
});

test('unordered list', () => {
  assert.equal(renderMarkdown('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
});

test('ordered list', () => {
  assert.equal(renderMarkdown('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
});

test('nested list (bullets under an ordered item)', () => {
  const md = ['1. parent', '   - child1', '   - child2'].join('\n');
  const out = renderMarkdown(md);
  assert.equal(out, '<ol><li>parent<ul><li>child1</li><li>child2</li></ul></li></ol>');
});

test('task list renders checkboxes and a task-list class', () => {
  const md = ['- [ ] todo', '- [x] done'].join('\n');
  const out = renderMarkdown(md);
  assert.match(out, /<ul class="task-list">/);
  assert.match(out, /<li class="task"><label class="task-label"><input type="checkbox"><span>todo<\/span><\/label><\/li>/);
  assert.match(out, /<li class="task is-done"><label class="task-label"><input type="checkbox" checked><span>done<\/span><\/label><\/li>/);
});

test('blockquote keeps consecutive lines as separate <br> lines', () => {
  const md = ['> line one', '> line two'].join('\n');
  const out = renderMarkdown(md);
  assert.match(out, /^<blockquote><p>line one<br>\nline two<\/p><\/blockquote>$/);
});

test('paragraph: soft line breaks become <br>', () => {
  const out = renderMarkdown('first\nsecond');
  assert.equal(out, '<p>first<br>\nsecond</p>');
});

test('paragraph stops at a following heading', () => {
  const out = renderMarkdown('para\n# Heading');
  assert.equal(out, '<p>para</p>\n<h1>Heading</h1>');
});

test('full document smoke test', () => {
  const md = [
    '# Doc',
    '',
    'Intro **bold**.',
    '',
    '## Section',
    '',
    '| a | b |',
    '|---|---|',
    '| 1 | 2 |',
    '',
    '- one',
    '- two',
  ].join('\n');
  const out = renderMarkdown(md);
  assert.match(out, /<h1>Doc<\/h1>/);
  assert.match(out, /<h2>Section<\/h2>/);
  assert.match(out, /<p>Intro <strong>bold<\/strong>\.<\/p>/);
  assert.match(out, /<table>/);
  assert.match(out, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
});

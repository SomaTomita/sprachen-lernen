// Reading-list reader: every word is shown inline (meaning + all examples),
// no click-to-expand, no detail pane. Search filters the list live.
import { renderSentence, playKaraoke, playLemma, registerPlayButton } from './audio.js';

export function renderReader(app, words, level = 'A1') {
    app.innerHTML = `
    <section class="reader" aria-labelledby="reader-title">
      <div class="reader-head">
        <h2 class="reader-title" id="reader-title">読むだけ</h2>
        <p class="search-count" id="search-count" role="status" aria-live="polite"></p>
      </div>
      <div class="search-field">
        <label for="filter" class="visually-hidden">単語を検索（蘭語 / 意味 / 例文）</label>
        <input id="filter" class="text-input" type="search" name="q" inputmode="search"
          autocomplete="off" spellcheck="false"
          placeholder="検索（蘭語 / 日本語 / 英語 / 例文）…" aria-controls="reading-list" />
      </div>
      <ul id="reading-list" class="reading-list" aria-label="単語一覧"></ul>
    </section>`;
    const listEl = app.querySelector('#reading-list');
    const filter = app.querySelector('#filter');
    const count = app.querySelector('#search-count');

    // Build one reading card (li) for a word, wiring all example play buttons.
    function buildCard(w) {
        const li = document.createElement('li');
        li.className = 'reading-card';

        const head = document.createElement('div');
        head.className = 'reading-card-head';

        const titleRow = document.createElement('div');
        titleRow.className = 'reading-title-row';
        const headword = document.createElement('h3');
        headword.className = 'reading-headword';
        headword.textContent = `${w.article ? w.article + ' ' : ''}${w.lemma}`;
        const lemmaBtn = document.createElement('button');
        lemmaBtn.type = 'button';
        lemmaBtn.textContent = '▶';
        lemmaBtn.className = 'icon-button button-play';
        lemmaBtn.setAttribute('aria-label', '発音を再生');
        registerPlayButton(lemmaBtn, () => playLemma(level, w));
        titleRow.append(headword, lemmaBtn);
        head.append(titleRow);

        const meta = [];
        if (w.pos)
            meta.push(w.pos);
        if (w.plural)
            meta.push(`複数形: ${w.plural}`);
        if (meta.length) {
            const metaEl = document.createElement('p');
            metaEl.className = 'reading-meta';
            metaEl.textContent = meta.join(' · ');
            head.append(metaEl);
        }
        li.append(head);

        const meanings = document.createElement('div');
        meanings.className = 'reading-meanings';
        for (const m of w.meanings) {
            const p = document.createElement('p');
            p.className = 'reading-meaning';
            const ja = document.createElement('span');
            ja.className = 'ja';
            ja.textContent = m.ja;
            const en = document.createElement('span');
            en.className = 'en';
            en.textContent = ` / ${m.en}`;
            p.append(ja, en);
            meanings.append(p);
        }
        li.append(meanings);

        const exWrap = document.createElement('div');
        exWrap.className = 'examples';
        for (const e of w.examples) {
            const row = document.createElement('div');
            row.className = 'ex';
            const de = document.createElement('p');
            de.className = 'de';
            const tr = document.createElement('p');
            tr.className = 'tr';
            tr.textContent = `${e.ja} / ${e.en}`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = '▶';
            btn.className = 'icon-button button-play';
            btn.setAttribute('aria-label', `例文を再生: ${e.nl}`);
            const spans = renderSentence(de, e);
            registerPlayButton(btn, () => playKaraoke(level, e, spans));
            row.append(btn, de, tr);
            exWrap.append(row);
        }
        li.append(exWrap);
        return li;
    }

    function draw(items) {
        listEl.innerHTML = '';
        count.textContent = `${items.length} 件`;
        if (items.length === 0) {
            const li = document.createElement('li');
            li.className = 'reading-empty-row';
            const empty = document.createElement('p');
            empty.className = 'word-empty';
            empty.textContent = '該当する単語がありません。';
            li.append(empty);
            listEl.append(li);
            return;
        }
        // One fragment for the whole list keeps 786 cards a single reflow.
        const frag = document.createDocumentFragment();
        for (const w of items)
            frag.append(buildCard(w));
        listEl.append(frag);
    }

    function matches(w, q) {
        if (!q)
            return true;
        if (w.lemma.toLowerCase().includes(q))
            return true;
        if (w.meanings.some(m => m.ja.includes(q) || m.en.toLowerCase().includes(q)))
            return true;
        return w.examples.some(e => e.nl.toLowerCase().includes(q)
            || e.ja.includes(q)
            || e.en.toLowerCase().includes(q));
    }

    filter.oninput = () => {
        const q = filter.value.trim().toLowerCase();
        draw(words.filter(w => matches(w, q)));
    };

    draw(words);
    filter.focus();
}

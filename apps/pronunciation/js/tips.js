/** トークンが参照する rule オブジェクトの配列を返す */
export function tipsForToken(token, rulesById) {
  return (token.r || []).map(id => rulesById[id]).filter(Boolean);
}

/** 見出し語の正規化キー（句読点除去・小文字）→ glossary 参照用 */
function glossKey(word) {
  return String(word).replace(/^[.,:;!?]+|[.,:;!?]+$/g, '').toLowerCase();
}

/**
 * 発音ポイントパネルを host に描画。
 * @param {string} [meaning] その語が属する文の日本語訳（控えめに併記）
 * @param {Record<string,string>} [glossary] 語→英語の対訳辞書
 */
export function renderTipPanel(host, token, rulesById, meaning, glossary = {}) {
  const tips = tipsForToken(token, rulesById);
  const word = token.word || token.t;
  const gloss = glossary[glossKey(word)];
  const tipsHtml = tips.length
    ? `<ul class="tip-list">${tips.map(r => `
        <li class="tip-item">
          <p class="tip-label">${r.label}</p>
          <p class="tip-detail">${r.detail}</p>
        </li>`).join('')}</ul>`
    : `<p class="tip-empty">この語の発音ポイントは登録されていません。</p>`;
  const meaningHtml = meaning
    ? `<div class="tip-meaning">
         <p class="tip-meaning-label">文の意味</p>
         <p class="tip-meaning-text">${meaning}</p>
       </div>`
    : '';
  host.innerHTML = `
    <p class="eyebrow">発音のポイント</p>
    <h3 class="tip-word" translate="no">${word}</h3>
    ${gloss ? `<p class="tip-gloss">${gloss}</p>` : ''}
    ${tipsHtml}
    ${meaningHtml}`;
}

/** 全ルール一覧を host に描画（カードグリッド） */
export function renderRuleList(host, rules) {
  host.innerHTML = `
    <section class="rules" aria-labelledby="rules-title">
      <div class="reader-head">
        <h2 class="reader-title" id="rules-title">発音のポイント</h2>
        <p class="search-count">${rules.length} 件</p>
      </div>
      <p class="rule-intro">ネイティブ朗読の解説にもとづく発音ルール。本文の各単語をクリックすると、該当するルールが表示されます。</p>
      <ul class="rule-list">
        ${rules.map(r => `
          <li class="rule-item">
            <p class="rule-label">${r.label}</p>
            <p class="rule-detail">${r.detail}</p>
            ${r.examples && r.examples.length ? `<p class="rule-examples" translate="no">例: ${r.examples.join(' · ')}</p>` : ''}
          </li>`).join('')}
      </ul>
    </section>`;
}

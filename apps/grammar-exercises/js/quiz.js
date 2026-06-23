// quiz.js — 問題の描画と即時採点。DOM 生成のみ（状態は保存しない）。
import { isCorrect, matchAllCorrect } from "./grade.js";
import { LESSONS } from "./data.js";
import { canSpeak, speak } from "./speak.js";

// 正誤アイコン（emoji は使わず inline SVG・aria-hidden）。
const ICON_OK = `<svg viewBox="0 0 16 16" aria-hidden="true" width="18" height="18" focusable="false"><path d="M6.4 11.6 2.8 8l1.1-1.1 2.5 2.5L12.1 4l1.1 1.1z" fill="currentColor"/></svg>`;
const ICON_NG = `<svg viewBox="0 0 16 16" aria-hidden="true" width="18" height="18" focusable="false"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
// スピーカーアイコン（emoji は使わず inline SVG・aria-hidden）。本体＋音波2本。
const ICON_SPEAKER = `<svg viewBox="0 0 16 16" aria-hidden="true" width="18" height="18" focusable="false"><path d="M3 6h2.2L8 3.5v9L5.2 10H3z" fill="currentColor"/><path d="M10.4 5.6a3 3 0 0 1 0 4.8M12.1 4a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`;

// タップで独語を発音する円形ボタン（SVGアイコン・aria-label つき）。
function speakButton(text) {
  const btn = el("button", { type: "button", class: "ex-speak", "aria-label": `「${text}」を発音` });
  btn.innerHTML = ICON_SPEAKER;
  btn.addEventListener("click", (e) => {
    // スピーカーはトークン<button>等の内側に入りうる。click を親へ伝播させると
    // 配置済みトークンが vacateSlot で外れる／bank トークンが pickUp される（#19）。
    e.stopPropagation();
    speak(text);
  });
  return btn;
}

// TTS が使える環境でだけスピーカーボタンを返す。使えなければ null（描画されない＝レイアウトずれ無し）。
function maybeSpeak(text) {
  return canSpeak() ? speakButton(text) : null;
}

let uid = 0;
// 1ページ内で衝突しない ID を採番（ラベル紐付け・radio name 用）。
function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}`;
}

// 属性つきの要素を作る小ヘルパ。text は textContent、svg は innerHTML（信頼済み）。
function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  if (text != null) node.textContent = text;
  return node;
}

// 視覚的に隠した <label>（スクリーンリーダー用）を input に紐付ける。
function hiddenLabel(forId, text) {
  return el("label", { class: "visually-hidden", for: forId }, text);
}

// テキスト入力欄（fill / transform / table 共通）。
function textInput(id, ariaLabel) {
  const input = el("input", {
    type: "text",
    id,
    class: "ex-input",
    autocomplete: "off",
    autocapitalize: "off",
    autocorrect: "off",
    spellcheck: "false",
    "aria-label": ariaLabel,
  });
  return input;
}

// 「チェック」など第一アクションのボタン。
function actionButton(label, className = "button-primary") {
  return el("button", { type: "button", class: className }, label);
}

// フィードバック領域（aria-live）。正誤バッジ＋explain（＋不正解時は正解）。
function makeFeedback() {
  const box = el("div", { class: "ex-feedback", "aria-live": "polite" });
  return box;
}

// 正解の値リストを「各値＋スピーカーボタン」で描画する行を作る。
// values は個々の正解（語/活用形）の配列。各値を1項目にして、語ごとに発音できるようにする。
function answerLine(values) {
  const ans = el("p", { class: "ex-answer" });
  ans.append(el("span", { class: "ex-answer-label" }, "正解: "));
  const list = el("span", { class: "ex-answer-values" });
  values.forEach((value) => {
    const item = el("span", { class: "ex-answer-item" });
    item.append(el("span", { class: "ex-answer-value" }, value));
    const sp = maybeSpeak(value);
    if (sp) item.append(sp);
    list.append(item);
  });
  ans.append(list);
  return ans;
}

// 正誤バッジ＋explain（＋正解の併記）をフィードバック領域に描画。
// correctValues（正解の値の配列）があれば、正解・不正解どちらでも「正解」行を出す。
function showFeedback(box, ok, explain, correctValues) {
  box.className = `ex-feedback ${ok ? "is-ok" : "is-ng"}`;
  box.replaceChildren();

  const badge = el("p", { class: "ex-badge" });
  const icon = el("span", { class: "ex-badge-icon", "aria-hidden": "true" });
  icon.innerHTML = ok ? ICON_OK : ICON_NG;
  badge.append(icon, el("span", { class: "ex-badge-text" }, ok ? "正解" : "不正解"));
  box.append(badge);

  if (correctValues && correctValues.length) {
    box.append(answerLine(correctValues));
  }

  box.append(el("p", { class: "ex-explain" }, explain));
}

// rule（あれば）を prompt の下に小さく表示。
function appendRule(section, rule) {
  if (rule) section.append(el("p", { class: "ex-rule" }, rule));
}

// 採点系の共通フッタ（チェック / 再挑戦）を組み立てる。
// onCheck() が真偽を返したら確定し、再挑戦で reset() を呼んで入力を再有効化。
function gradedControls({ inputs, feedback, onCheck, reset }) {
  const controls = el("div", { class: "ex-controls" });
  const checkBtn = actionButton("チェック");
  const retryBtn = actionButton("再挑戦", "button-secondary");
  retryBtn.classList.add("hidden");

  const setEnabled = (enabled) => {
    for (const i of inputs) i.disabled = !enabled;
  };

  checkBtn.addEventListener("click", () => {
    onCheck();
    setEnabled(false);
    checkBtn.classList.add("hidden");
    retryBtn.classList.remove("hidden");
  });

  retryBtn.addEventListener("click", () => {
    reset();
    feedback.className = "ex-feedback";
    feedback.replaceChildren();
    setEnabled(true);
    checkBtn.classList.remove("hidden");
    retryBtn.classList.add("hidden");
    if (inputs[0]) inputs[0].focus();
  });

  controls.append(checkBtn, retryBtn);
  return controls;
}

// --- fill: prompt の "___" を順に <input> に置換。複数 blank で複数論点。---
function renderFill(ex, onScore) {
  const section = el("section", { class: "ex" });
  appendRule(section, ex.rule);

  const promptEl = el("p", { class: "ex-prompt" });
  const segments = ex.prompt.split("___");
  const inputs = [];

  segments.forEach((seg, i) => {
    if (seg) promptEl.append(document.createTextNode(seg));
    if (i < segments.length - 1) {
      const id = nextId("blank");
      const blankIndex = inputs.length;
      const label = `空欄 ${blankIndex + 1}`;
      const input = textInput(id, label);
      promptEl.append(hiddenLabel(id, label), input);
      inputs.push(input);
    }
  });
  section.append(promptEl);

  const feedback = makeFeedback();
  let scored = false;

  const onCheck = () => {
    const ok = ex.blanks.every((b, i) =>
      isCorrect(inputs[i] ? inputs[i].value : "", b.accept),
    );
    const correct = ex.blanks.map((b) => b.accept[0]);
    showFeedback(feedback, ok, ex.explain, correct);
    if (!scored) {
      scored = true;
      onScore(ok);
    }
  };
  const reset = () => {
    for (const i of inputs) i.value = "";
  };

  section.append(gradedControls({ inputs, feedback, onCheck, reset }), feedback);
  return section;
}

// --- table: columns/rows から <table>。object セルは <input>。---
function renderTable(ex, onScore) {
  const section = el("section", { class: "ex" });
  section.append(el("p", { class: "ex-prompt" }, ex.prompt));
  appendRule(section, ex.rule);

  const wrap = el("div", { class: "ex-table-wrap" });
  const table = el("table", { class: "ex-table" });

  const thead = el("thead");
  const headRow = el("tr");
  for (const col of ex.columns) headRow.append(el("th", { scope: "col" }, col));
  thead.append(headRow);
  table.append(thead);

  const tbody = el("tbody");
  const inputs = [];
  // 各 input が「どの accept を採点するか」を保持（DOM順=出題順）。
  const blanks = [];

  ex.rows.forEach((row, r) => {
    const tr = el("tr");
    row.cells.forEach((cell, c) => {
      const td = el("td");
      if (typeof cell === "object" && cell !== null) {
        const id = nextId("cell");
        const rowLabel = typeof row.cells[0] === "string" ? row.cells[0] : `行${r + 1}`;
        const colLabel = ex.columns[c] || `列${c + 1}`;
        const aria = `${rowLabel} の ${colLabel}`;
        const input = textInput(id, aria);
        td.append(hiddenLabel(id, aria), input);
        inputs.push(input);
        blanks.push(cell);
      } else {
        td.append(document.createTextNode(String(cell)));
      }
      tr.append(td);
    });
    tbody.append(tr);
  });
  table.append(tbody);
  wrap.append(table);
  section.append(wrap);

  const feedback = makeFeedback();
  let scored = false;

  const onCheck = () => {
    const ok = blanks.every((b, i) => isCorrect(inputs[i].value, b.accept));
    const correct = blanks.map((b) => b.accept[0]);
    showFeedback(feedback, ok, ex.explain, correct);
    if (!scored) {
      scored = true;
      onScore(ok);
    }
  };
  const reset = () => {
    for (const i of inputs) i.value = "";
  };

  section.append(gradedControls({ inputs, feedback, onCheck, reset }), feedback);
  return section;
}

// --- choice: <fieldset><legend>＋radio。選択 index を answer と照合。---
function renderChoice(ex, onScore) {
  const section = el("section", { class: "ex" });
  const fieldset = el("fieldset", { class: "ex-choice" });
  const legend = el("legend", { class: "ex-prompt" }, ex.prompt);
  fieldset.append(legend);
  if (ex.rule) fieldset.append(el("p", { class: "ex-rule" }, ex.rule));

  const name = nextId("choice");
  const inputs = [];

  ex.options.forEach((opt, i) => {
    const id = `${name}-opt-${i}`;
    // 行ラッパ：label とスピーカーボタンを横並び。スピーカーは label の外（兄弟）に置くので、
    // 発音タップでラジオがトグルされない。
    const optionRow = el("div", { class: "ex-option-row" });
    const optionLabel = el("label", { class: "ex-option", for: id });
    const radio = el("input", { type: "radio", name, id, value: String(i) });
    optionLabel.append(radio, el("span", { class: "ex-option-text" }, opt));
    optionRow.append(optionLabel);
    // 選択肢は最初から見えているので、選ぶ前に各独語を聞ける。
    const sp = maybeSpeak(opt);
    if (sp) optionRow.append(sp);
    fieldset.append(optionRow);
    inputs.push(radio);
  });
  section.append(fieldset);

  const feedback = makeFeedback();
  let scored = false;

  const grade = (chosen) => {
    const ok = chosen === ex.answer;
    showFeedback(feedback, ok, ex.explain, [ex.options[ex.answer]]);
    if (!scored) {
      scored = true;
      onScore(ok);
    }
  };
  const reset = () => {
    for (const r of inputs) r.checked = false;
  };
  const setEnabled = (enabled) => {
    for (const r of inputs) r.disabled = !enabled;
  };

  const controls = el("div", { class: "ex-controls" });
  const retryBtn = actionButton("再挑戦", "button-secondary");
  retryBtn.classList.add("hidden");
  retryBtn.addEventListener("click", () => {
    reset();
    feedback.className = "ex-feedback";
    feedback.replaceChildren();
    setEnabled(true);
    retryBtn.classList.add("hidden");
    if (!ex.instant) checkBtn.classList.remove("hidden");
    if (inputs[0]) inputs[0].focus();
  });

  let checkBtn = null;
  if (ex.instant) {
    // instant: 選択した瞬間に採点・確定。チェックボタンは出さない。
    inputs.forEach((radio, i) => {
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        grade(i);
        setEnabled(false);
        retryBtn.classList.remove("hidden");
      });
    });
    controls.append(retryBtn);
  } else {
    // 通常: 選んでから「チェック」。未選択時はチェックを止める。
    checkBtn = actionButton("チェック");
    checkBtn.addEventListener("click", () => {
      const chosen = inputs.findIndex((r) => r.checked);
      if (chosen === -1) {
        feedback.className = "ex-feedback is-hint";
        feedback.replaceChildren(el("p", { class: "ex-explain" }, "選択肢を1つ選んでください。"));
        return;
      }
      grade(chosen);
      setEnabled(false);
      checkBtn.classList.add("hidden");
      retryBtn.classList.remove("hidden");
    });
    controls.append(checkBtn, retryBtn);
  }

  section.append(controls, feedback);
  return section;
}

// --- transform: 単一 <input>。accept（複数可）と照合。---
function renderTransform(ex, onScore) {
  const section = el("section", { class: "ex" });
  section.append(el("p", { class: "ex-prompt" }, ex.prompt));
  appendRule(section, ex.rule);

  const id = nextId("transform");
  const label = "書き換えた文";
  const input = textInput(id, label);
  input.classList.add("ex-input-wide");
  const field = el("div", { class: "ex-field" });
  field.append(hiddenLabel(id, label), input);
  section.append(field);

  const feedback = makeFeedback();
  const inputs = [input];
  let scored = false;

  const onCheck = () => {
    const ok = isCorrect(input.value, ex.accept);
    showFeedback(feedback, ok, ex.explain, [ex.accept[0]]);
    if (!scored) {
      scored = true;
      onScore(ok);
    }
  };
  const reset = () => {
    input.value = "";
  };

  section.append(gradedControls({ inputs, feedback, onCheck, reset }), feedback);
  return section;
}

// --- free: textarea＋「答えを見る」。自動採点しない（自己採点）。---
function renderFree(ex) {
  const section = el("section", { class: "ex ex-free" });
  section.append(el("p", { class: "ex-prompt" }, ex.prompt));
  appendRule(section, ex.rule);

  const id = nextId("free");
  const label = "あなたの答え";
  const field = el("div", { class: "ex-field" });
  const textarea = el("textarea", {
    id,
    class: "ex-textarea",
    rows: "2",
    autocomplete: "off",
    "aria-label": label,
  });
  field.append(hiddenLabel(id, label), textarea);
  section.append(field);

  const feedback = makeFeedback();
  const revealBtn = actionButton("答えを見る");

  revealBtn.addEventListener("click", () => {
    feedback.className = "ex-feedback is-model";
    feedback.replaceChildren();
    const model = el("p", { class: "ex-model" });
    model.append(el("span", { class: "ex-model-label" }, "模範解答: "));
    model.append(el("span", { class: "ex-model-value" }, ex.answer));
    const sp = maybeSpeak(ex.answer);
    if (sp) model.append(sp);
    feedback.append(model, el("p", { class: "ex-explain" }, ex.explain));
    revealBtn.disabled = true;
  });

  const controls = el("div", { class: "ex-controls" });
  controls.append(revealBtn);
  section.append(controls, feedback);
  return section;
}

// 配列を破壊せずにシャッフルした新配列を返す（Fisher-Yates）。
// アプリコードなので Math.random 可（純関数のテスト対象は grade.js 側）。
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- match: 左の各 left に right トークンを割り当てる。タップ配置（主）＋ドラッグ（追加）。---
// DOM 構造:
//   section.ex.ex-match
//     p.ex-prompt / p.ex-rule? / p.ex-match-hint（操作説明）
//     div.ex-match-status[aria-live=polite]（配置・採点の読み上げ）
//     ul.ex-match-rows … li ごとに span.ex-match-left ＋ button.ex-match-slot（置き場所）
//     div.ex-match-bank … トークン置き場（残りの right）
//      button(再挑戦) / feedback
function renderMatch(ex, onScore) {
  const section = el("section", { class: "ex ex-match" });
  appendRule(section, ex.rule);
  section.firstChild
    ? section.insertBefore(el("p", { class: "ex-prompt" }, ex.prompt), section.firstChild)
    : section.append(el("p", { class: "ex-prompt" }, ex.prompt));

  section.append(
    el("p", { class: "ex-match-hint" }, "タップで選んで、置き場所をタップ。ドラッグでも置けます。"),
  );

  // aria-live：配置・採点の状況を読み上げる。
  const status = el("div", { class: "ex-match-status", "aria-live": "polite" });

  // 採点状態。assignment[left] = right（未割り当ては undefined）。
  const assignment = Object.create(null);
  let picked = null; // 現在「手に持っている」トークン要素（タップ配置用）
  let scored = false;

  const feedback = makeFeedback();

  // --- 要素生成 ---
  const rowsList = el("ul", { class: "ex-match-rows" });
  const bank = el("div", { class: "ex-match-bank", role: "list", "aria-label": "答えのトークン" });

  // left ごとの行とスロットを作る。スロット button は left を data 属性で保持。
  const slots = new Map(); // left -> slot button
  ex.pairs.forEach((pair) => {
    const li = el("li", { class: "ex-match-row" });
    const leftCell = el("span", { class: "ex-match-left" }, pair.left);
    const sp = maybeSpeak(pair.left);
    if (sp) leftCell.append(sp);

    const slot = el("button", {
      type: "button",
      class: "ex-match-slot",
      "aria-label": `${pair.left} の答え（空き）`,
    });
    slot.dataset.left = pair.left;
    slot.append(el("span", { class: "ex-match-slot-placeholder" }, "ここに置く"));
    slots.set(pair.left, slot);

    li.append(leftCell, slot);
    rowsList.append(li);
  });

  // right トークンを作る。各トークンは button。data-right で値を保持。
  const makeToken = (value) => {
    const token = el("button", {
      type: "button",
      class: "ex-match-token",
      "aria-pressed": "false",
      "aria-label": `トークン ${value}`,
      draggable: "true",
    });
    token.dataset.right = value;
    token.append(el("span", { class: "ex-match-token-text" }, value));
    const sp = maybeSpeak(value);
    if (sp) token.append(sp);
    return token;
  };

  const tokens = shuffled(ex.pairs.map((p) => p.right)).map(makeToken);

  const announce = (msg) => {
    status.textContent = msg;
  };

  // --- ピックアップ（タップ配置）---
  const clearPicked = () => {
    if (picked) {
      picked.setAttribute("aria-pressed", "false");
      picked.classList.remove("is-picked");
      picked = null;
    }
  };
  const pickUp = (token) => {
    if (picked === token) {
      clearPicked();
      announce(`${token.dataset.right} の選択を解除しました。`);
      return;
    }
    clearPicked();
    picked = token;
    token.setAttribute("aria-pressed", "true");
    token.classList.add("is-picked");
    announce(`${token.dataset.right} を選択中。置き場所をタップしてください。`);
  };

  // トークンを bank に戻す（DOM 末尾へ）。aria/見た目をリセット。
  const returnToBank = (token) => {
    token.classList.remove("is-placed");
    token.setAttribute("aria-pressed", "false");
    bank.append(token);
  };

  // スロットの見た目とラベルを「空き」に戻す。
  const emptySlot = (slot, left) => {
    slot.classList.remove("is-filled", "is-correct", "is-incorrect");
    slot.replaceChildren(el("span", { class: "ex-match-slot-placeholder" }, "ここに置く"));
    slot.setAttribute("aria-label", `${left} の答え（空き）`);
  };

  // スロットに置かれているトークンを bank に戻し、assignment を消す。
  const vacateSlot = (slot) => {
    const left = slot.dataset.left;
    const existing = slot.querySelector(".ex-match-token");
    if (existing) returnToBank(existing);
    delete assignment[left];
    emptySlot(slot, left);
  };

  // トークンをスロットへ配置。すでに別トークンが居れば bank に戻す。
  const placeToken = (slot, token) => {
    const left = slot.dataset.left;
    // 置こうとするトークンが別スロットに居れば、そこを空にする。
    const fromSlot = token.closest(".ex-match-slot");
    if (fromSlot && fromSlot !== slot) {
      delete assignment[fromSlot.dataset.left];
      emptySlot(fromSlot, fromSlot.dataset.left);
    }
    // 置き先に既存トークンがあれば bank へ。
    const existing = slot.querySelector(".ex-match-token");
    if (existing && existing !== token) returnToBank(existing);

    slot.classList.add("is-filled");
    slot.replaceChildren(token);
    token.classList.add("is-placed");
    token.setAttribute("aria-pressed", "false");
    assignment[left] = token.dataset.right;
    slot.setAttribute("aria-label", `${left} の答え：${token.dataset.right}`);
    announce(`${left} に ${token.dataset.right} を置きました。`);
    maybeGrade();
  };

  // 全スロットが埋まったら一度だけ採点する。
  const maybeGrade = () => {
    if (scored) return;
    const allFilled = ex.pairs.every((p) => assignment[p.left] !== undefined);
    if (!allFilled) return;
    grade();
  };

  const grade = () => {
    const ok = matchAllCorrect(ex.pairs, assignment);
    // 各スロットを正誤マーク（アイコン＋テキスト。色だけに依存しない）。
    ex.pairs.forEach((pair) => {
      const slot = slots.get(pair.left);
      const correct = assignment[pair.left] === pair.right;
      slot.classList.add(correct ? "is-correct" : "is-incorrect");
      const mark = el("span", { class: "ex-match-mark", "aria-hidden": "true" });
      mark.innerHTML = correct ? ICON_OK : ICON_NG;
      const word = el("span", { class: "ex-match-mark-text visually-hidden" }, correct ? "正解" : "不正解");
      slot.append(mark, word);
    });
    // トークンは確定したので操作不可に。
    for (const t of tokens) t.disabled = true;
    for (const s of slots.values()) s.disabled = true;
    clearPicked();

    showFeedback(feedback, ok, ex.explain);
    announce(ok ? "全問正解です。" : "不正解があります。解説を確認してください。");
    if (!scored) {
      scored = true;
      onScore(ok);
    }
    retryBtn.classList.remove("hidden");
  };

  // --- イベント：トークン（タップ配置 / ドラッグ開始）---
  tokens.forEach((token) => {
    token.addEventListener("click", () => {
      if (scored) return;
      // bank にあるトークンはピックアップ。スロット内のトークンは bank に戻す。
      if (token.closest(".ex-match-slot")) {
        const slot = token.closest(".ex-match-slot");
        vacateSlot(slot);
        announce(`${token.dataset.right} を取り出しました。`);
      } else {
        pickUp(token);
      }
    });
    token.addEventListener("dragstart", (e) => {
      if (scored) return;
      e.dataTransfer.setData("text/plain", token.dataset.right);
      e.dataTransfer.effectAllowed = "move";
      token.classList.add("is-dragging");
      // ドラッグ開始時はタップのピックアップを解除（混乱防止）。
      clearPicked();
    });
    token.addEventListener("dragend", () => token.classList.remove("is-dragging"));
    bank.append(token);
  });

  // --- イベント：スロット（タップでドロップ / ドラッグ受け入れ）---
  slots.forEach((slot) => {
    slot.addEventListener("click", () => {
      if (scored) return;
      // 手に持っているトークンがあれば置く。
      if (picked) {
        const token = picked;
        clearPicked();
        placeToken(slot, token);
        return;
      }
      // 持っていない＆スロットが埋まっていれば、そのトークンを bank に戻す。
      if (slot.classList.contains("is-filled")) {
        const existing = slot.querySelector(".ex-match-token");
        const val = existing ? existing.dataset.right : "";
        vacateSlot(slot);
        announce(`${val} を ${slot.dataset.left} から戻しました。`);
      }
    });
    slot.addEventListener("dragover", (e) => {
      if (scored) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      slot.classList.add("is-dragover");
    });
    slot.addEventListener("dragleave", () => slot.classList.remove("is-dragover"));
    slot.addEventListener("drop", (e) => {
      if (scored) return;
      e.preventDefault();
      slot.classList.remove("is-dragover");
      const value = e.dataTransfer.getData("text/plain");
      // ドラッグ中の実体トークンを探す（同値が複数ありうるので is-dragging を優先）。
      const token =
        tokens.find((t) => t.classList.contains("is-dragging")) ||
        tokens.find((t) => t.dataset.right === value && !t.classList.contains("is-placed"));
      if (token) placeToken(slot, token);
    });
  });

  // --- 再挑戦：配置を全部クリアして最初から ---
  const retryBtn = actionButton("再挑戦", "button-secondary");
  retryBtn.classList.add("hidden");
  retryBtn.addEventListener("click", () => {
    scored = false;
    clearPicked();
    // スロットを空にしトークンを bank へ。
    for (const [left, slot] of slots.entries()) {
      const existing = slot.querySelector(".ex-match-token");
      if (existing) returnToBank(existing);
      emptySlot(slot, left);
      slot.disabled = false;
    }
    for (const k of Object.keys(assignment)) delete assignment[k];
    for (const t of tokens) t.disabled = false;
    feedback.className = "ex-feedback";
    feedback.replaceChildren();
    announce("やり直します。トークンを選んでください。");
    retryBtn.classList.add("hidden");
    if (tokens[0]) tokens[0].focus();
  });

  const controls = el("div", { class: "ex-controls" });
  controls.append(retryBtn);

  section.append(status, rowsList, bank, controls, feedback);
  return section;
}

const RENDERERS = {
  fill: renderFill,
  table: renderTable,
  choice: renderChoice,
  transform: renderTransform,
  match: renderMatch,
};

// 自動採点タイプ（スコアに数える）。free は数えない。
const GRADED_TYPES = new Set(["fill", "table", "choice", "transform", "match"]);

// ヘッダ（戻りリンク・タイトル・レッスン切替）を作る。
function renderHeader(lesson) {
  const header = el("header", { class: "ex-head" });

  const nav = el("nav", { class: "ex-nav", "aria-label": "ナビゲーション" });
  nav.append(el("a", { class: "ex-navlink", href: "../../#/" }, "‹ ホーム"));
  if (lesson.doc) {
    nav.append(el("a", { class: "ex-navlink", href: lesson.doc }, "← 解説を読む"));
  }
  header.append(nav);

  header.append(el("h1", { class: "ex-title" }, lesson.title));
  if (lesson.intro) header.append(el("p", { class: "ex-intro" }, lesson.intro));

  // レッスン切替（深リンク）。
  const switcher = el("div", { class: "ex-switch", role: "group", "aria-label": "レッスン切替" });
  switcher.append(el("span", { class: "ex-switch-label" }, "レッスン:"));
  for (const id of LESSONS.map((l) => l.id)) {
    const current = id === lesson.lesson;
    const link = el("a", {
      class: `ex-switch-link${current ? " is-current" : ""}`,
      href: `?lesson=${id}`,
      "aria-current": current ? "page" : null,
    }, id);
    switcher.append(link);
  }
  header.append(switcher);

  return header;
}

// セッションスコア表示（自動採点のみ）。保存はしない。
function makeScoreBar(total) {
  const bar = el("div", { class: "ex-score" });
  const text = el("span", { class: "ex-score-text" }, `0 / ${total} 正解`);
  bar.append(text);
  return { bar, text };
}

// 1レッスンぶんを app に描画する。
export function renderQuiz(app, lesson) {
  app.replaceChildren();
  app.append(renderHeader(lesson));

  const exercises = Array.isArray(lesson.exercises) ? lesson.exercises : [];
  const gradedTotal = exercises.filter((ex) => GRADED_TYPES.has(ex.type)).length;
  const { bar, text } = makeScoreBar(gradedTotal);
  app.append(bar);

  // セッション内のスコア状態（保存しない・関数内クロージャのみ）。
  let correct = 0;
  const onScore = (ok) => {
    if (ok) correct += 1;
    text.textContent = `${correct} / ${gradedTotal} 正解`;
  };

  const list = el("ol", { class: "ex-list" });
  exercises.forEach((ex, i) => {
    const renderer = RENDERERS[ex.type];
    const li = el("li", { class: "ex-item" });
    if (ex.type === "free") {
      // free は RENDERERS に載せず別扱い：自己採点なので onScore を渡さない（スコアに数えない）。
      li.append(renderFree(ex));
    } else if (!renderer) {
      li.append(el("p", { class: "ex-prompt" }, `未対応の問題タイプ: ${ex.type}`));
    } else {
      li.append(renderer(ex, onScore));
    }
    li.firstChild.prepend(el("h2", { class: "ex-num" }, `問 ${i + 1}`));
    list.append(li);
  });
  app.append(list);
}

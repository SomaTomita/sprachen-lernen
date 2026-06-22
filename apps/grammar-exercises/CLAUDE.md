# Deutsch 文法練習アプリ (grammar-exercises)

`content/grammar/` の各文法レッスンに準拠した練習問題を解くオフラインアプリ。
**即時採点＋解説**で復習する。**トラッキングはしない**（進捗を保存しない ── 解いて答え合わせするだけ）。素 HTML/CSS/JS・ビルド無し。

## よく使うコマンド
`apps/grammar-exercises/` 直下で実行（コードもコマンドも相対パス）。
- 起動: 親 `deutsch/` の `./serve.sh` → ホームの「文法練習」カード → `http://localhost:8000/apps/grammar-exercises/`。単体は `apps/grammar-exercises/` で `python3 -m http.server 8000`。`file://` 不可（ES Modules/fetch）。
- 直接レッスンへ: `…/apps/grammar-exercises/?lesson=01`（`?lesson` 無しはレッスン選択画面）。
- テスト: `node --test`（`grade.js` の純関数＋`data/*.json` の整合）。

## スタックと制約
- 素 HTML/CSS/JS（ES Modules）。ビルド無し・フレームワーク無し・**依存なし**・**外部CDN/Webフォント禁止**・オフライン。TypeScript 不使用。
- **トラッキング無し**：localStorage / cookie に保存しない。スコアはセッション内表示のみ。
- デザイン: BMW corporate-automotive（正本 `../../docs/design/bmw-corporate-automotive.md`）。白canvas / blue `#1c69d4` / 0px矩形 / Inter 700・300 / **ドロップシャドウ禁止**。CSS トークンは vocabulary から流用。
- a11y(Web Interface Guidelines): コントラスト4.5:1 / `:focus-visible` / タッチ44px / aria(`aria-live` で正誤・解説を読み上げ) / `prefers-reduced-motion` / **正誤を色だけで示さない（SVGアイコン＋テキスト）** / **emojiをアイコンにしない（SVG）** / 横スクロール無し。
- パスは相対（絶対パス禁止）。

## 構成
```
index.html              エントリ
css/styles.css          BMWトークン＋練習UI
js/
  main.js               ?lesson ルーティング・レッスン選択・切替・エラー表示
  data.js               loadLesson() ＋ LESSONS 一覧
  grade.js              純関数（normalize / isCorrect）── テスト対象
  quiz.js               renderQuiz()＋6タイプの描画と即時採点・フィードバック
  speak.js              タップ発音（Web Speech API）。再生をここに集約＝将来 edge-tts mp3 に差し替え可
data/01.json … data/05.json 問題（対応 md に準拠・継続追加 → issue #10）
tests/grade.test.js tests/data.test.js
docs/plans/             設計・実装計画
```

## 問題データモデル（`data/<lesson>.json`）
```jsonc
{
  "lesson": "01", "title": "01 人称代名詞と sein",
  "doc": "../../#/grammar/personalpronomen",   // 「解説を読む」戻りリンク
  "intro": "…",
  "exercises": [ /* 下記6タイプ。各問 rule + explain を持つ */ ]
}
```
- `choice`: `{type, prompt, rule?, options:[], answer:<index>, instant?, explain}`。`instant:true` で**選んだ瞬間に即採点**（チェック不要・序盤のテンポ用）。
- `match`: `{type, prompt, rule?, pairs:[{left,right}], explain}`。左にトークンを**ドラッグ／タップ移動**で対応づけ、全部置いたら即採点。自動採点・スコア対象。
- `fill`: `{type, prompt(___を含む), rule?, blanks:[{accept:[…]}], explain}`
- `table`: `{type, prompt, rule?, columns:[], rows:[{cells:[ "ラベル" | {accept:[…]} ]}], explain}`
- `transform`: `{type, prompt, rule?, accept:[…], explain}`
- `free`: `{type, prompt, rule?, answer:"模範解答", explain}`（自動採点なし）
- `rule`=解く前の短い法則。`explain`=解いた後に**正解・不正解どちらでも**出す多論点解説。

**出題順（テンポ）**: 1レッスン約20問。前半6〜8問は `instant` 選択・`match` を前に置いてサクサク進める。穴埋め記述は序盤に置かない。

## 採点
- `grade.js` `normalize()`: trim・小文字化・連続空白圧縮・`ß`→`ss`・末尾`.`除去（`?`/`!`・母音ウムラウトは保持）。
- `grade.js` `isCorrect(input, accept)`: 正規化して受理リストのいずれかと一致。`choice` は選択 index と `answer` を比較。
- `match` は `grade.js` `matchAllCorrect(pairs, 割当)` で採点（左↔右が全て正しいか）。
- `free` は採点せず「答えを見る」で `answer`＋`explain` を表示（自己採点）。スコアは自動採点タイプ（fill/table/choice/transform/match）のみ。

## 音声（タップ発音）
- 独語の選択肢・正解・模範解答に**円形スピーカーボタン**を付け、タップで発音（`js/speak.js` の `speak(text)`、`lang=de-DE`）。
- **Web Speech API**（OSの独語音声）を使う＝音声ファイル不要・生成不要・オフライン。再生は `speak.js` の1関数に集約してあるので、品質を上げたくなったら**ここだけ** edge-tts の mp3 再生に差し替えればよい（他は無改変）。
- `canSpeak()` が false（独語TTS非対応の端末）なら**ボタンを描画しない**（`maybeSpeak()`）＝壊れない・レイアウトずれ無し。
- スピーカーは BMW 例外として**円形 icon-button**（44px・aria-label「『〜』を発音」・SVGアイコン）。emoji 不可。

## レッスンの足し方
`../../content/grammar/CLAUDE.md` の規約に従う（解説md＋`data/NN.json`＋`content.js`/`data.js`登録＋相互リンク）。
追加後は `node --test` を green に（`data.test.js` が件数・全タイプ・想定正解の通過を担保）。

**文法は継続的に増える**。レッスン追加は GitHub issue **#10**（文法コンテンツ継続追加トラッカー・close しない）で管理する。レッスンを足すたびに #10 を参照（PR に `Refs #10`）し、進捗チェックを更新する（1レッスン = 1 PR を目安）。`data.test.js` は `data/*.json` をデータ駆動で検証するので、JSON を足せば自動で対象になる。

## 落とし穴
- `file://` では動かない（fetch/ES Modules）。必ずサーバ経由。
- `table` のセルは「文字列＝ラベル」と「`{accept}`＝空欄」が混在する。描画時に取り違えない。
- `match` は**ドラッグ＋タップ移動＋キーボード**の3操作に対応（ドラッグ単独にしない＝モバイル/a11y のため）。
- `grade.js` は純関数に保つ（DOM・副作用を入れない）。触ったら `node --test`。
- 進捗を保存したくなっても**保存しない**（このアプリの方針）。

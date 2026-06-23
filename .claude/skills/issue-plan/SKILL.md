---
name: issue-plan
description: 機能要望・バグ報告を小さな GitHub issue に分割して todo チェックリスト付きで作成する。開発を始める前の計画段階で使う。「issueにして」「issueを切って」「計画して」と言われたら必ずこれを使う。
argument-hint: "[要望の説明]"
allowed-tools: Bash(gh issue list *), Bash(gh issue view *), Bash(gh label list *), Bash(gh label create *)
---

# Issue Plan — 要望を小さな issue に分割する

機能要望やバグ報告を受け取ったら、**実装を始める前に**このスキルで issue に落とし込む。
リポジトリは `SomaTomita/study-deutsch`。issue 操作はすべて `gh` CLI で行う。

分割対象の要望: $ARGUMENTS（未指定なら直前の会話の要望を対象にする）

## このリポジトリの前提（speaking-reader と違う点）

- **ビルド無し・フレームワーク無し・依存ゼロ**（npm install 不要）。lint / format ツールは無い。
- テストは Node 標準の `node --test`。
  - ホーム/Markdown レンダラ: リポジトリ直下で `node --test tests/*.test.js`
  - 各アプリ: そのアプリ直下で `cd apps/<app> && node --test`
- データ検証（単語/発音アプリ）: アプリ直下で `node tools/validate_data.mjs <level>`（例: `A1`）。
- 音声 mp3 は**追跡対象**（オフライン再生に必須）。データ変更で音声が要るときは edge-tts で再生成する（後述 work-issue 参照）。

## 分割ルール（最重要）

- **1 issue = 1 PR = 1 つの独立した変更**。半日以内に完了できるサイズまで分割する。
- 「データ生成」「UI」「音声」「資料(docs)」など、レイヤーをまたぐ要望はレイヤーごとに issue を分ける。
- 分割した issue 間に依存があれば、本文に `Depends on #N` と明記する。
- 大きな機能は親 issue（エピック）を 1 つ作り、本文のチェックリストから子 issue にリンクする。エピックは close しない運用（ラベル `epic`）。
- 分割案はまずユーザーに提示して承認を得てから `gh issue create` を実行する。

## issue 本文テンプレート

```markdown
## 目的

<なぜやるか。1〜2 文>

## Todo

- [ ] <実装手順 1>
- [ ] <実装手順 2>
- [ ] 該当範囲のテストが通る（`node --test ...`）
- [ ] データ変更時: `node tools/validate_data.mjs <level>` が通る

## 受け入れ条件

- <完了と判断できる具体的な条件（コマンド／画面動作）>

## 対象外（スコープ外）

- <この issue ではやらないこと>
```

- **Todo セクションは必須**。実装中に `/work-issue` がチェックを進める前提で、具体的な手順を書く。
- 受け入れ条件は検証可能な形（コマンド、画面動作）で書く。
- UI を触る issue は Todo に「a11y 確認（`/web-design-guidelines`）」を入れる（BMW デザイン正本 `docs/design/bmw-corporate-automotive.md` 準拠）。

## 作成コマンド

```bash
gh issue create \
  --title "<type>: <短い要約>" \
  --body "$(cat <<'EOF'
<上のテンプレートを埋めた本文>
EOF
)" \
  --label "<feat|fix|refactor|docs|test|chore>"
```

- タイトルは conventional commit と同じ type 接頭辞（`feat:` `fix:` など）を付ける。
- ラベルが存在しない場合は `gh label create <name>` で先に作る（既存: `feat` `fix` `docs` `chore` `epic`。`refactor` `test` `perf` `ci` は未作成なら作る）。
- 作成後、issue 番号と URL の一覧をユーザーに報告する。

## 次のステップ

issue 作成後、着手する issue を決めたら `/work-issue` に進む。

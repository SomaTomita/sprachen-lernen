---
name: work-issue
description: GitHub issue に着手してブランチ作成・実装・commit まで進める。「#N をやって」「issue に着手」と言われたら必ずこれを使う。ブランチ命名・commit メッセージ・issue の todo 更新ルールを含む。
argument-hint: "[issue-number]"
allowed-tools: Bash(gh issue view *), Bash(gh issue edit *), Bash(gh issue comment *), Bash(git switch *), Bash(git pull *), Bash(git add *), Bash(git commit *), Bash(node --test *), Bash(node tools/validate_data.mjs *)
---

# Work Issue — issue 着手から commit まで

issue 番号を受け取ったら、このスキルの手順で実装を進める。
**issue なしの実装は禁止**。issue がなければ先に `/issue-plan` で作る。
リポジトリは `SomaTomita/study-deutsch`。

対象 issue 番号: $ARGUMENTS（未指定なら会話から特定し、不明ならユーザーに確認する）

## 1. 着手

```bash
gh issue view <N>                      # 本文・todo・受け入れ条件を必ず読む
git switch main && git pull            # 最新の main から分岐
git switch -c <type>/<N>-<short-desc>  # 例: fix/14-a1-unnatural-sentences
```

- ブランチ名の `<type>` は issue タイトルの type と一致させる（feat / fix / refactor / docs / test / chore / perf / ci）。
- `<short-desc>` は英語ケバブケース 2〜4 語。

## 2. 実装中

- issue 本文の **Todo を上から順に**進める。完了するたびに issue のチェックボックスを更新する:

```bash
gh issue view <N> --json body -q .body          # 現在の本文を取得
# `- [ ]` を `- [x]` に置き換えた本文で更新
gh issue edit <N> --body "<更新後の本文>"
```

- 計画と違う対応が必要になったら、勝手にスコープを広げず issue にコメントで記録する:

```bash
gh issue comment <N> --body "<変更点と理由>"
```

## 3. データ変更を伴うとき（単語/発音アプリ）

- **`words.json` / `text.json` の `de`（ドイツ語本文）を変えたら、その例文の音声 mp3 と `timing` は古くなる**（カラオケが壊れる）。必ず再生成する。
- 単語アプリ（`apps/vocabulary`）の例文音声＋タイミング再生成（変更分だけ作り直すため、対象 mp3 を先に削除してから実行）:

```bash
cd apps/vocabulary
# 例: a1-alter の 2 文を作り直す場合
rm -f data/A1/audio/a1-alter-1.mp3 data/A1/audio/a1-alter-2.mp3
# words.json の該当例文から audio/timing キーも消しておく（未生成として再合成させる）
tools/.venv/bin/python tools/tts_generate.py A1     # 既存 mp3+timing がある例文はスキップ＝差分のみ生成
node tools/validate_data.mjs A1
```

- 見出し語（lemma）の綴りを変えた場合は `tools/tts_lemma.py <level>` も回す。
- venv が無ければ: `python3 -m venv tools/.venv && tools/.venv/bin/pip install edge-tts`（edge-tts はネットワーク必須）。
- 生成物のうち `tools/sources/`・`tools/batches*`・`data/*/parts/`・`.venv/` は gitignore 済み。**mp3 と words.json は追跡対象なので commit に含める**。

## 4. commit ルール

- 形式: `<type>: <説明> (#<issue番号>)` — 例: `fix: correct unnatural A1 example sentences (#14)`
- **AI 表記を一切入れない**。`Co-Authored-By`・`Generated with Claude Code` などをコミットメッセージに含めない（リポジトリ／ユーザー方針）。
- **commit の粒度はまとめる**。1 issue = 1 つの意味のまとまりとして、原則 1〜数コミットに収める。todo 1 項目ごとの細切れにはしない。
- **`--no-verify` などフック回避フラグは禁止**。フックが落ちたら直す。
- commit 前に必ず該当範囲のテスト／検証を green に:

```bash
node --test tests/*.test.js          # ホーム/Markdown レンダラを触ったとき
(cd apps/<app> && node --test)       # 各アプリの純関数（srs/stats/grade 等）を触ったとき
(cd apps/<app> && node tools/validate_data.mjs <level>)   # データ変更時
```

- `git status` で生成物・無関係ファイルが混ざっていないか確認してから `git add`（`-f` は使わない＝gitignore を尊重）。

## 5. 完了条件

issue の Todo がすべて `[x]`、受け入れ条件を満たし、テスト・検証が通ったら `/ship-pr` に進む。

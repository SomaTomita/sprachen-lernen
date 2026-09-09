---
name: ship-pr
description: 作業ブランチから PR を作成し main へ squash merge するまでの手順。「PR にして」「マージして」と言われたら必ずこれを使う。3秒で読める PR 要約・issue リンク・マージ後処理のルールを含む。
argument-hint: "[issue-number]"
allowed-tools: Bash(git push *), Bash(git switch *), Bash(git pull *), Bash(git diff *), Bash(git branch *), Bash(gh pr create *), Bash(gh pr view *), Bash(gh pr comment *), Bash(gh pr merge *), Bash(gh issue view *)
---

# Ship PR — PR 作成から main マージまで

`/work-issue` の完了条件（todo 全消化・テスト／検証通過）を満たしてから使う。
リポジトリは `SomaTomita/sprachen-lernen`。

対象 issue 番号: $ARGUMENTS（未指定なら現在のブランチ名・会話から特定する）

## 1. PR 作成

```bash
git push -u origin <branch>
gh pr create --title "<type>: <説明> (#<N>)" --body "$(cat <<'EOF'
Closes #<N>

## 変更内容（3秒で読める要約）

<1〜3 行。何が・なぜ変わったかだけ。実装の詳細は書かない>

## 確認方法

- [ ] 該当範囲の `node --test` が通る
- [ ] データ変更時: `node tools/validate_data.mjs <level>` が通る
- [ ] <受け入れ条件に対応した動作確認手順>
EOF
)"
```

### PR 本文ルール

- **先頭は必ず `Closes #<N>`**。issue へのリンクを切らさない（マージ時に issue が自動 close される）。
- **「変更内容」は 3 秒で読み切れる長さ（1〜3 行）に収める**。箇条書き 3 点以内。
  詳細を書きたければ折りたたみ（`<details>`）に入れ、本文は短く保つ。
- タイトルは squash merge 後に main の commit メッセージになるため、`<type>: <説明> (#<N>)` 形式を厳守する。
- **AI 表記を入れない**。`Generated with Claude Code` や `Co-Authored-By: Claude` を PR 本文・コメントに含めない。

### PR コメントルール

- レビュー対応や追記の PR コメントにも、関連 issue 番号（`#<N>`）を含めて文脈を残す。

```bash
gh pr comment <PR番号> --body "#<N> の <todo項目> に対応: <変更の一言要約>"
```

## 2. マージ前チェック

- [ ] CI（あれば）グリーン
- [ ] issue の Todo がすべて `[x]`
- [ ] PR 本文先頭に `Closes #<N>` がある
- [ ] `git diff main...HEAD` に生成物・無関係な変更が混ざっていない
- [ ] データ変更を含む場合: 変更した例文の mp3 と `timing` が再生成済み（古い音声が残っていない）

## 3. マージ（rebase and merge を既定）

```bash
gh pr merge <PR番号> --rebase --delete-branch
```

- **既定は rebase and merge（`--rebase`）**。コミットをまとめてある前提なので main の履歴は直線的（1 PR ≒ 1〜数コミット）に保たれる。merge commit（`--merge`）は使わない。
- **squash（`--squash`）は例外フォールバックのみ**: rebase 時に conflict がどうしても解決できない場合に限って使う。フォールバックしたら理由を PR コメントに残す。
- **マージはユーザーの承認方針に従う**。原則はマージ前チェックの結果と PR の URL を提示して「マージしていい？」と確認する。ただしユーザーがそのタスクで明示的にマージまで指示している場合は、チェック結果と URL を報告したうえでそのまま実行してよい（main への変更は取り消しにくいので、無断でスコープ外のものはマージしない）。
- `--delete-branch` でリモートブランチを削除。ローカルも掃除する:

```bash
git switch main && git pull && git branch -d <branch>
```

## 4. マージ後

- issue が自動 close されたことを確認（`gh issue view <N>`）。
- `Depends on #<N>` で待っていた issue があれば、着手可能になった旨をユーザーに報告する。
- エピック（`epic` ラベル）の親 issue があれば、対応する子項目のチェックを更新する。

# .claude/skills — 開発フロー用スキル

sprachen-lernen の「要望 → issue → 実装 → PR → merge」を回すための 3 スキル。
speaking-reader から移植し、本リポジトリ（依存ゼロ・ビルド無し・`node --test`・mp3 追跡・AI 表記なし）向けに書き換えたもの。

## 流れ

```
要望/バグ
   │
   ▼  /issue-plan   … 小さな issue に分割（1 issue = 1 PR = 1 変更）。Todo 必須。
   ▼  /work-issue   … main から分岐 → 実装 → テスト/検証 → commit（粒度はまとめる）。
   ▼  /ship-pr      … PR 作成（先頭に Closes #N）→ squash merge → ブランチ掃除。
完了
```

| スキル | 役割 | 起動の合図 |
|--------|------|-----------|
| `issue-plan` | 要望を小さな issue に分割 | 「issue にして」「計画して」 |
| `work-issue` | 着手・ブランチ・実装・commit | 「#N をやって」「着手」 |
| `ship-pr` | PR 作成 → main へ squash merge | 「PR にして」「マージして」 |

## このリポジトリ固有の約束

- **テスト**: `node --test`（root: `tests/*.test.js` / 各アプリ: `apps/<app>` 直下）。npm / lint / format は無い。
- **データ検証**: アプリ直下で `node tools/validate_data.mjs <level>`（例: `A1`）。
- **音声**: 例文の `de` を変えたら mp3 と `timing` を edge-tts で再生成（`apps/vocabulary/tools/tts_generate.py`）。mp3 は追跡対象。
- **commit**: `<type>: <説明> (#<N>)`。粒度はまとめる。`--no-verify` 等のフック回避は禁止。**AI 表記を入れない**。
- **merge**: rebase and merge を既定（`--rebase --delete-branch`）。conflict がどうしても解決できない時だけ squash 等にフォールバック。main の履歴は直線的に保つ。

> グローバルの git-workflow（`~/.claude/rules/common/git-workflow.md`）と整合。conventional commit の type は feat / fix / refactor / docs / test / chore / perf / ci。

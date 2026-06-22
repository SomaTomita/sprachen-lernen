#!/usr/bin/env bash
# 使い方:  ./serve.sh [ポート]      (既定 8000)
# 例:      ./serve.sh 8001
# リポジトリ直下で実行する前提。ホーム(ランチャー)と各メニューのリンクを表示してから http.server を起動する。
port="${1:-8000}"
printf '\n'
printf '  ホーム        →  http://localhost:%s/                （ランチャー）\n' "$port"
printf '  ├ 基礎ドキュ  →  http://localhost:%s/#/exam-guide    （資料: 試験概要・問題形式）\n' "$port"
printf '  ├ 文法        →  http://localhost:%s/#/grammar        （資料: 文法解説 01〜03）\n' "$port"
printf '  ├ スピーキング→  http://localhost:%s/#/speaking       （資料: A2 口述・アプリ化を開発中）\n' "$port"
printf '  ├ 発音アプリ  →  http://localhost:%s/apps/pronunciation/\n' "$port"
printf '  ├ 単語アプリ  →  http://localhost:%s/apps/vocabulary/\n' "$port"
printf '  └ 文法練習    →  http://localhost:%s/apps/grammar-exercises/   （01・02 の問題・即時採点）\n' "$port"
printf '  （停止: Ctrl+C）\n\n'
exec python3 -m http.server "$port"

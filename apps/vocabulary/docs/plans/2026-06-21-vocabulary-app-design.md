# ドイツ語単語アプリ 設計書

- 日付: 2026-06-21
- 目的: ゲーテ A2 合格を最速で支援する、ローカルで動く単語学習アプリ
- 配置: `/Users/soma/Documents/deutsch/vocabulary`
- バージョン管理: 当面 git なし（ファイル保存のみ）

## 1. 目的とスコープ

- スケジュール管理ではなく**学習サポート**に集中する単語アプリ。
- 忘却曲線（spaced repetition）に沿って復習提示する。
- 例文は**ドイツ語ネイティブ品質の音声**で再生でき、再生中の単語を**カラオケ式にハイライト追従**できる。
- 語彙はゲーテ A1 / A2 の公式範囲。1語につき例文2文（多義語は3文以上）。
- 例文は各レベルの**文法・語彙の天井を超えない**。

### MVP スコープ
- **フェーズ1（MVP）: A1 のみ**（約650語）をエンドツーエンドで完成。
- フェーズ2: A2（A1差分 約650語）を同パイプラインで追加。
- やらない: アカウント／同期／サーバー、文法レッスン、作文・スピーキング採点、機械採点クイズ。語彙特化を維持。

## 2. 全体方針・アーキテクチャ

- **素の HTML + CSS + JavaScript（ES Modules）。フレームワーク・ビルド工程なし。** `index.html` をブラウザで開くか `python -m http.server` で起動。
- 実行時は**完全ローカル・オフライン**（音声も同梱 MP3 を再生）。サーバー・DB・API キー不要。
- 進捗は **localStorage**。
- 「**事前生成 → 静的配信**」方式。LLM 生成・TTS 生成はビルド時の一度だけで、アプリ実行時には一切走らない（軽量・無料・オフライン・edge-tts の非公式サービス不安定リスクを回避）。
- 代替案「実行時に TTS/LLM を叩く」はオフライン性・無料・最小構成に反するため不採用。

## 3. ディレクトリ構成

```
vocabulary/
  index.html
  css/styles.css
  js/
    main.js        # 画面遷移・初期化
    srs.js         # Leitner スケジューリング（純関数、テスト対象）
    storage.js     # localStorage ラッパ
    audio.js       # カラオケ再生・単語ハイライト・Web Speech フォールバック
    reader.js      # 読むだけモード
    flashcard.js   # フラッシュカードモード
    data.js        # words.json ロード・整形
  A1/
    words.json     # 単語＋意味(JA/EN)＋例文(JA/EN)＋単語タイミング
    audio/*.mp3    # 例文ごとの音声
  A2/              # フェーズ2
    words.json
    audio/*.mp3
  tools/           # ビルド時のみ。実行時には不要
    tts_generate.py        # edge-tts で MP3＋単語タイミング生成
    sentence_pipeline.md   # 例文生成・検証の手順とプロンプト・文法制約
  tests/
    srs.test.js    # node:test（npm install 不要）
  docs/plans/
    2026-06-21-vocabulary-app-design.md
```

## 4. データモデル（`words.json`、レベル別）

```jsonc
{
  "id": "a1-haus",
  "lemma": "Haus",
  "pos": "noun",
  "article": "das",          // 名詞は性を必ず保持
  "plural": "Häuser",
  "level": "A1",
  "meanings": [ { "ja": "家", "en": "house" } ],   // 多義語は複数
  "examples": [
    {
      "de": "Das Haus ist groß.",
      "ja": "その家は大きい。",
      "en": "The house is big.",
      "audio": "audio/a1-haus-1.mp3",
      "timing": [ {"w":"Das","s":0.00,"e":0.32}, {"w":"Haus","s":0.32,"e":0.78} ]  // カラオケ用
    }
  ]
}
```

- 名詞は **性(article)＋複数形** を必ず持つ。動詞の不規則形はメモ欄に保持（任意）。
- `timing` は edge-tts の WordBoundary（`offset`/`duration`）を秒に変換して格納。

## 5. コンテンツ生成パイプライン（作業量の大半）

ビルド時の多段パイプライン。各レベルの「文法・語彙の天井」を**生成と検証の両方**に焼き込むのが品質の肝。

1. **語リスト抽出**: 公式 Wortliste PDF から A1(約650) の lemma・品詞・性・複数形を抽出。
2. **意味(JA/EN)**: Claude が各語の日本語＋英語の語義を付与（多義語は複数）。
3. **例文生成**: Claude が各語 **2文（多義語は3文以上）** を、そのレベルの文法・語彙の範囲内のみで生成。JA/EN 訳付き。
4. **検証パス**: 別エージェントが各例文を検査 — ①文法がレベル超過していないか ②使用語が当該レベル語彙（＋ごく基本的な機能語）の範囲内か ③ドイツ語として正しいか ④対象語が実際に使われているか。NG は再生成。
5. **音声＋タイミング**: `tts_generate.py`（edge-tts, 例: `de-DE-KatjaNeural`）が例文ごとに MP3＋単語タイミングを生成し `words.json` にマージ。

- バッチで生成→検証を回し、A1 を完成させてから A2 へ。
- 公式の例文はそのまま転載しない（著作権リスク回避）。語リスト＝事実情報として範囲制約にのみ使用。

### 文法・語彙の天井（公式 Prüfungsziele より確定）

**A1**: 現在形中心。過去は haben/sein の Präteritum（war/hatte）＋一部動詞の Perfekt のみ。格は Nom/Akk＋限定的 Dativ。形容詞は述語・副詞用法のみ（**付加語の格変化なし**）。比較級なし。文は主文＋等位接続（und/oder/aber/denn/dann）まで。**従属節（weil/dass/wenn）禁止**。語彙は約650語内。

**A2**: 全動詞の Perfekt 可、Präteritum は haben/sein/kommen/sagen＋話法助動詞のみ。**付加語形容詞の格変化・比較級/最上級・従属節(dass/weil/wenn)・間接疑問・再帰動詞が解禁**。Wechselpräposition の Dat/Akk 使い分け可。**関係文・受動態・本格的 Präteritum 叙述・一般 Genitiv は禁止（B1へ）**。語彙は約1300語内。

### 出典
- A1 Prüfungsziele/Testbeschreibung: https://www.goethe.de/pro/relaunch/prf/de/Pruefungsziele_Testbeschreibung_A1_SD1.pdf
- A1 Wortliste（約650語）: https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf
- A2 Prüfungsziele/Testbeschreibung: https://www.goethe.de/resources/files/pdf62/Pruefungsziele_Testbeschreibung_A2_Fit231.pdf
- A2 Wortliste（約1300語）: https://www.goethe.de/pro/relaunch/prf/sr/Goethe-Zertifikat_A2_Wortliste.pdf

## 6. 学習モード（2本立て）

### A. 読むだけモード（ブラウズ）
- 単語一覧（レベル / 箱 / due などで絞り込み）→ 語をタップで詳細（性・複数形・意味 JA/EN・例文＋カラオケ音声）。
- 自己評価もスケジューリングも無し。自由に読む・聴く・流し見る用。**忘却曲線には影響しない**。

### B. フラッシュカードモード（忘却曲線を動かす）
- 表: 独語＋音声 → 自分で思い出す → めくると 意味・例文・カラオケ音声を表示。
- **1タップ自己評価3段階**: 「覚えてた / あやふや / 忘れた」。
- 既定の表→裏方向は **独語→意味**（A2 試験の読解・聴解に効く）。方向トグルは後回し。
- 機械採点・タイピング・4択は採用しない。

## 7. 忘却曲線（Leitner 5箱）

- フラッシュカードの自己評価が Leitner を動かす:
  - **覚えてた** → 箱 +1（間隔を伸ばす）
  - **あやふや** → 同じ箱に留置（間隔据え置き）
  - **忘れた** → 箱1へ戻す
- 間隔 既定 **1 / 2 / 4 / 8 / 16 日**（調整可）。
- 日次セッション: `dueDate ≤ 今日` を優先出題＋新規 1日15語（調整可）。
- 各語: `box`, `lastReviewed`, `dueDate`, `timesSeen`, `timesGood` を localStorage に保持。
- 読むだけモードは box/due を変更しない。

## 8. 音声・カラオケ（edge-tts 事前生成）

- 例文ごとに再生ボタン。再生中、`audio.currentTime` と `timing` 配列を `requestAnimationFrame` で突き合わせ、**今読んでいる単語をハイライト追従**。
- 低速再生（0.75x）トグルとリピート。
- 音声 or timing 欠落時は **Web Speech API へ実行時フォールバック**（カラオケなしで発話）。
- 声は一貫性重視で既定1音声（`de-DE-KatjaNeural`）。
- 規約メモ: edge-tts は個人/ローカル学習なら実用上問題なし。将来サービス化する場合は公式 Azure か Piper+forced alignment（WhisperX）に差し替え可能な設計にしておく。

### edge-tts による生成（概念）
```python
import asyncio, edge_tts
async def gen(text, voice="de-DE-KatjaNeural"):
    c = edge_tts.Communicate(text, voice, boundary="WordBoundary")  # 単語タイミング必須
    words = []
    with open("out.mp3", "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"],
                              "s": ch["offset"]/1e7,
                              "e": (ch["offset"]+ch["duration"])/1e7})
    return words  # → timing 配列
```

## 9. UI

- モバイル対応のシンプルな単一ページ。
- **ホーム**: レベル選択（A1）、本日の due 件数・新規件数、「読むだけ」「フラッシュカード」へ。
- **読むだけ**: 一覧→詳細（カラオケ）。
- **フラッシュカード**: カード→めくる→自己評価→次へ。
- **統計**: 習得語数・due・箱分布・連続日数（軽量に）。

## 10. エラー処理・フォールバック

- 音声/タイミング欠落 → Web Speech API で発話（カラオケなし）。
- localStorage 破損/未設定 → 安全に初期化。
- due 0件 → 新規語提示か「本日完了」。

## 11. テスト

- ロジック（`srs.js` のスケジューリング）は純関数化し、**Node 標準の `node:test`**（npm install 不要）で単体テスト。
- UI/カラオケ同期は手動確認＋ Playwright で軽くスモーク。

## 12. フェーズ計画

- **フェーズ1（MVP）**: A1 のみ完成 — 語リスト＋意味＋検証済例文＋edge-tts 音声/カラオケ＋Leitner＋読むだけ/フラッシュカード2モード＋localStorage。
- **フェーズ2**: A2（差分≈650語）を同パイプラインで追加。

## 13. 確定した意思決定

- 意味表示: 日本語＋英語 併記
- 音声: edge-tts 事前生成（無料・ニューラル品質・単語タイミング）＋カラオケ、欠落時 Web Speech フォールバック
- 学習: 読むだけモード ＋ フラッシュカードモード（自己評価3段階が Leitner を駆動）
- 例文: Claude 生成＋レベル検証（公式例文は転載しない）
- スタック: 素の HTML/CSS/JS（ES Modules）＋ localStorage、ビルドなし
- MVP: A1 のみ先行
- git: 当面なし

#!/usr/bin/env python3
"""見出し語（単体）の発音音声を edge-tts で生成し words.json に lemmaAudio を付与。

Usage: tools/.venv/bin/python tools/tts_lemma.py A1

- 生成済み（mp3 が存在し lemmaAudio もある）語はスキップ＝再実行で途中再開可。
- 一時障害はリトライ、恒久失敗はスキップして継続（Web Speech フォールバックがあるため）。
- カラオケ不要の単体発音なので timing は付けない（音声のみ）。
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

VOICE = "de-DE-KatjaNeural"
RETRIES = 4
SAVE_EVERY = 50


def speakable(lemma: str) -> str:
    """語幹末尾のハイフン（all- / ander- 等）を除いた発音用文字列。"""
    s = lemma.strip()
    if s.endswith("-"):
        s = s[:-1]
    return s


async def synth(text: str, out_path: Path) -> None:
    last_err: Exception | None = None
    for attempt in range(1, RETRIES + 1):
        try:
            c = edge_tts.Communicate(text, VOICE)
            audio = bytearray()
            async for ch in c.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
            if not audio:
                raise RuntimeError("empty audio")
            out_path.write_bytes(bytes(audio))
            return
        except Exception as err:  # noqa: BLE001
            last_err = err
            await asyncio.sleep(min(2 ** attempt, 15))
    raise RuntimeError(f"failed after {RETRIES} tries: {last_err}")


async def main(level: str) -> int:
    base = Path("data") / level
    lemma_dir = base / "audio" / "lemma"
    lemma_dir.mkdir(parents=True, exist_ok=True)
    words_path = base / "words.json"
    data = json.loads(words_path.read_text(encoding="utf-8"))

    def save() -> None:
        words_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    made = 0
    done = 0
    failures: list[str] = []
    for w in data:
        fname = f"{w['id']}.mp3"
        rel = f"audio/lemma/{fname}"
        if w.get("lemmaAudio") and (lemma_dir / fname).exists():
            done += 1
            continue
        try:
            await synth(speakable(w["lemma"]), lemma_dir / fname)
        except Exception as err:  # noqa: BLE001
            failures.append(f"{fname}: {err}")
            print(f"FAIL {fname}: {err}", flush=True)
            continue
        w["lemmaAudio"] = rel
        made += 1
        print(f"ok {fname}", flush=True)
        if made % SAVE_EVERY == 0:
            save()
            print(f"-- saved (made={made}, skipped={done}) --", flush=True)

    save()
    print(f"done: made={made}, already={done}, failed={len(failures)}", flush=True)
    if failures:
        print("FAILURES (re-run to retry):", flush=True)
        for f in failures:
            print("  " + f, flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    level_arg = sys.argv[1] if len(sys.argv) > 1 else "A1"
    sys.exit(asyncio.run(main(level_arg)))

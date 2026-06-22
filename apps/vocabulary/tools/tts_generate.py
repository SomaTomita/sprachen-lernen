#!/usr/bin/env python3
"""edge-tts で例文の MP3 + 単語タイミングを生成し words.json にマージ。

Usage: tools/.venv/bin/python tools/tts_generate.py A1

- 生成済み（mp3 が存在し timing もある）例文はスキップ＝再実行で途中再開可。
- 一時的なネットワーク障害ではリトライし、恒久的に失敗した例文はスキップして続行
  （全体を止めない）。失敗一覧は最後に表示。
- 進捗は一定間隔で words.json に保存するため、中断しても再開できる。
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

VOICE = "de-DE-KatjaNeural"
RETRIES = 4
SAVE_EVERY = 40  # この件数ごとに words.json を保存


async def synth(text: str, out_path: Path) -> list[dict]:
    """1 文を合成して mp3 を書き出し、単語タイミング配列を返す。失敗時は例外送出。"""
    last_err: Exception | None = None
    for attempt in range(1, RETRIES + 1):
        try:
            c = edge_tts.Communicate(text, VOICE, boundary="WordBoundary")
            words: list[dict] = []
            audio = bytearray()
            async for ch in c.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
                elif ch["type"] == "WordBoundary":
                    words.append({
                        "w": ch["text"],
                        "s": round(ch["offset"] / 1e7, 3),
                        "e": round((ch["offset"] + ch["duration"]) / 1e7, 3),
                    })
            if not audio or not words:
                raise RuntimeError("empty audio or timing")
            out_path.write_bytes(bytes(audio))
            return words
        except Exception as err:  # noqa: BLE001 - ネットワーク等の一時障害を集約して扱う
            last_err = err
            await asyncio.sleep(min(2 ** attempt, 15))
    raise RuntimeError(f"failed after {RETRIES} tries: {last_err}")


async def main(level: str) -> int:
    base = Path("data") / level
    audio_dir = base / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    words_path = base / "words.json"
    data = json.loads(words_path.read_text(encoding="utf-8"))

    def save() -> None:
        words_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    done = 0
    made = 0
    failures: list[str] = []
    for w in data:
        for i, e in enumerate(w["examples"], 1):
            fname = f"{w['id']}-{i}.mp3"
            if e.get("audio") and (audio_dir / fname).exists() and e.get("timing"):
                done += 1
                continue
            try:
                timing = await synth(e["de"], audio_dir / fname)
            except Exception as err:  # noqa: BLE001
                failures.append(f"{fname}: {err}")
                print(f"FAIL {fname}: {err}", flush=True)
                continue
            e["audio"] = f"audio/{fname}"
            e["timing"] = timing
            made += 1
            print(f"ok {fname} ({len(timing)} words)", flush=True)
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

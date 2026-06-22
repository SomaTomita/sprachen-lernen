#!/usr/bin/env python3
"""edge-tts で文ごとの MP3+タイミングと、単語ごとの MP3 を生成して text.json を更新。

Usage: tools/.venv/bin/python tools/tts_generate.py
- 生成済み（mp3 があり timing もある）文/語はスキップ＝再実行で途中再開可。
- 一時的なネットワーク障害はリトライ、恒久失敗はスキップして続行。
"""
import asyncio
import json
import re
import sys
from pathlib import Path

import edge_tts

RETRIES = 4

PUNCT_ONLY = re.compile(r"^[\W_]+$")

UMLAUT = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
                         "Ä": "ae", "Ö": "oe", "Ü": "ue"})


def slugify(word: str) -> str:
    w = word.translate(UMLAUT).lower()
    w = re.sub(r"[^a-z0-9]+", "-", w)
    return w.strip("-")


async def synth_sentence(text: str, voice: str, out_path: Path) -> list[dict]:
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            c = edge_tts.Communicate(text, voice, boundary="WordBoundary")
            words: list[dict] = []
            audio = bytearray()
            async for ch in c.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
                elif ch["type"] == "WordBoundary":
                    if PUNCT_ONLY.match(ch["text"]):
                        continue
                    words.append({
                        "w": ch["text"],
                        "s": round(ch["offset"] / 1e7, 3),
                        "e": round((ch["offset"] + ch["duration"]) / 1e7, 3),
                    })
            if not audio or not words:
                raise RuntimeError("empty audio or timing")
            out_path.write_bytes(bytes(audio))
            return words
        except Exception as err:  # noqa: BLE001
            last_err = err
            await asyncio.sleep(min(2 ** attempt, 15))
    raise RuntimeError(f"failed after {RETRIES} tries: {last_err}")


async def synth_word(word: str, voice: str, out_path: Path) -> None:
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            c = edge_tts.Communicate(word, voice)
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


async def main() -> int:
    data_path = Path("data") / "text.json"
    data = json.loads(data_path.read_text(encoding="utf-8"))
    voice = data.get("voice", "de-DE-KatjaNeural")
    audio_dir = Path("data") / "audio"
    words_dir = audio_dir / "words"
    audio_dir.mkdir(parents=True, exist_ok=True)
    words_dir.mkdir(parents=True, exist_ok=True)

    def save() -> None:
        data_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    failures: list[str] = []
    seen_words: set[str] = set()

    for p in data["paragraphs"]:
        for s in p["sentences"]:
            mp3 = audio_dir / Path(s["audio"]).name
            if not (mp3.exists() and s.get("timing")):
                try:
                    s["timing"] = await synth_sentence(s["de"], voice, mp3)
                    print(f"ok sentence {s['id']} ({len(s['timing'])} words)", flush=True)
                    save()
                except Exception as err:  # noqa: BLE001
                    failures.append(f"{s['id']}: {err}")
                    print(f"FAIL sentence {s['id']}: {err}", flush=True)
            # 単語音声
            for tok in s["tokens"]:
                word = tok.get("word") or re.sub(r"[\W_]+$", "", tok["t"])
                word = re.sub(r"^[\W_]+", "", word)
                slug = slugify(word)
                if not slug or slug in seen_words:
                    continue
                seen_words.add(slug)
                wp = words_dir / f"{slug}.mp3"
                if wp.exists():
                    continue
                try:
                    await synth_word(word, voice, wp)
                    print(f"ok word {slug}", flush=True)
                except Exception as err:  # noqa: BLE001
                    failures.append(f"word {slug}: {err}")
                    print(f"FAIL word {slug}: {err}", flush=True)

    save()
    print(f"done. words={len(seen_words)}, failed={len(failures)}", flush=True)
    if failures:
        print("FAILURES (re-run to retry):", flush=True)
        for f in failures:
            print("  " + f, flush=True)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

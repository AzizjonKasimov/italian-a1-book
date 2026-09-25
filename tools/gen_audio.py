"""Step 2 of the audio pipeline: generate one MP3 per clip with Microsoft Edge's neural
Italian voices (via the edge-tts package) into tools/cache/<id>.mp3.
Already generated clips are skipped, so re-running only produces new or changed texts.

Usage:  .venv/Scripts/python tools/gen_audio.py
"""
import asyncio
import json
import os
import sys

import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "cache")
CONCURRENCY = 4


async def gen(sem, item, stats):
    out = os.path.join(CACHE, item["id"] + ".mp3")
    if os.path.exists(out) and os.path.getsize(out) > 0:
        stats["cached"] += 1
        return
    async with sem:
        for attempt in range(5):
            try:
                comm = edge_tts.Communicate(item["text"], item["voice"], rate=item["rate"])
                await comm.save(out + ".part")
                os.replace(out + ".part", out)
                stats["ok"] += 1
                done = stats["ok"] + stats["cached"] + stats["fail"]
                if done % 50 == 0:
                    print(f"  {done}/{stats['total']} ...", flush=True)
                return
            except Exception as e:  # network hiccup or throttling: back off and retry
                err = e
                await asyncio.sleep(3 * (attempt + 1))
        stats["fail"] += 1
        stats["failed_ids"].append(item["id"])
        print("FAILED", item["id"], repr(err)[:120], flush=True)


async def main():
    with open(os.path.join(ROOT, "tools", "texts.json"), encoding="utf-8") as f:
        items = json.load(f)
    os.makedirs(CACHE, exist_ok=True)
    stats = {"ok": 0, "cached": 0, "fail": 0, "total": len(items), "failed_ids": []}
    sem = asyncio.Semaphore(CONCURRENCY)
    await asyncio.gather(*(gen(sem, it, stats) for it in items))
    print(f"done: {stats['ok']} generated, {stats['cached']} cached, {stats['fail']} failed of {stats['total']}")
    if stats["fail"]:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

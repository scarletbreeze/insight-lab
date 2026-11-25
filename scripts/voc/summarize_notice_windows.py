"""Publish aggregate 14-day inquiry windows around dated Kiwoom notices."""

import argparse
import json
from datetime import date, timedelta
from pathlib import Path

from collect_public_board import TOPIC_PATTERNS

ROOT = Path(__file__).resolve().parents[2]
VOC = ROOT / "data" / "voc"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def known_notices():
    notices = {}
    for notice in read_json(VOC / "general-notices.json")["notices"]:
        notices[notice["id"]] = notice
    for filename in ("notice-index.json", "notices.json", "historical-notices.json"):
        for notice in read_json(VOC / filename):
            if filename == "notices.json":
                notice["dateType"] = "published"
            notices[notice["id"]] = notice
    return notices.values()


def summarize(snapshot):
    if snapshot["stop"] != "reached-older-posts":
        raise ValueError("Notice comparisons require collection past the start boundary.")
    start = date.fromisoformat(snapshot["start"])
    end = date.fromisoformat(snapshot["end"])
    if date.fromisoformat(snapshot["oldestObserved"]) >= start or date.fromisoformat(snapshot["newestObserved"]) < end:
        raise ValueError("The snapshot does not cover both declared boundaries.")
    daily = snapshot["dailyTopics"]
    observations = []
    for notice in known_notices():
        topic = notice["topic"]
        if notice.get("dateType") != "published" or topic not in TOPIC_PATTERNS:
            continue
        published = date.fromisoformat(notice["date"])
        if published - timedelta(days=14) < start or published + timedelta(days=14) > end:
            continue
        before, after = (
            sum(daily.get((published + timedelta(days=offset)).isoformat(), {}).get(topic, 0) for offset in offsets)
            for offsets in (range(-14, 0), range(1, 15))
        )
        if before + after >= 5 and abs(before - after) >= 2:
            observations.append({"noticeId": notice["id"], "date": notice["date"], "topic": topic,
                                 "before": before, "after": after})
    observations.sort(key=lambda item: (-abs(item["after"] - item["before"]), item["date"], item["noticeId"]))
    return {"collectionStart": str(start), "collectionEnd": str(end), "observations": observations}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = summarize(read_json(args.snapshot))
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result['observations'])} publishable notice windows.")


if __name__ == "__main__":
    main()

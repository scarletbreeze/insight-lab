"""Publish aggregate 14-day inquiry windows around dated Kiwoom notices."""

import argparse
import json
from collections import Counter
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
    totals = snapshot["dailyInquiries"]
    annual = Counter()
    for day, total in totals.items():
        if not start <= date.fromisoformat(day) <= end or type(total) is not int or total <= 0:
            raise ValueError(f"Invalid daily inquiry count: {day}")
        annual[day[:4]] += total
    if annual != {str(y): row["categories"]["문의"] for y, row in snapshot["years"].items()}:
        raise ValueError("Daily inquiry denominators do not reconcile with the annual totals.")
    if any(sum(counts.values()) > totals.get(day, 0) for day, counts in daily.items()):
        raise ValueError("Daily classified counts exceed all inquiries.")
    observations = []
    exclusions = {}
    for notice in known_notices():
        topic = notice["topic"]
        if notice.get("dateType") != "published":
            exclusions[notice["id"]] = "unverified-date"
            continue
        if topic not in TOPIC_PATTERNS:
            exclusions[notice["id"]] = "unclassified-topic"
            continue
        published = date.fromisoformat(notice["date"])
        if published - timedelta(days=14) < start or published + timedelta(days=14) > end:
            exclusions[notice["id"]] = "incomplete-window"
            continue
        periods = [[(published + timedelta(days=offset)).isoformat() for offset in offsets]
                   for offsets in (range(-14, 0), range(1, 15))]
        before, after = [sum(daily.get(day, {}).get(topic, 0) for day in period) for period in periods]
        if before == after:
            exclusions[notice["id"]] = "no-change"
        elif before + after < 5 or abs(before - after) < 2:
            exclusions[notice["id"]] = "below-threshold"
        else:
            before_total, after_total = [sum(totals.get(day, 0) for day in period) for period in periods]
            observations.append({"noticeId": notice["id"], "date": notice["date"], "topic": topic,
                                 "before": before, "after": after, "beforeTotal": before_total, "afterTotal": after_total})
    observations.sort(key=lambda item: (-abs(item["after"] - item["before"]), item["date"], item["noticeId"]))
    return {"collectionStart": str(start), "collectionEnd": str(end), "observations": observations,
            "exclusions": exclusions}


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

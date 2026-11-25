"""Publish monthly VOC totals from the locally collected daily topic counts."""

import argparse
import json
from collections import Counter
from datetime import date
from pathlib import Path

from collect_public_board import TOPIC_PATTERNS


def summarize(snapshot):
    start = date.fromisoformat(snapshot["start"])
    end = date.fromisoformat(snapshot["end"])
    if (snapshot["stop"] != "reached-older-posts"
        or date.fromisoformat(snapshot["oldestObserved"]) >= start
        or date.fromisoformat(snapshot["newestObserved"]) < end):
        raise ValueError("The snapshot must cover both publication boundaries.")

    months = {}
    month = start.replace(day=1)
    while month <= end:
        months[month.isoformat()[:7]] = Counter()
        month = date(month.year + (month.month == 12), month.month % 12 + 1, 1)

    for day, counts in snapshot["dailyTopics"].items():
        if not start <= date.fromisoformat(day) <= end:
            raise ValueError(f"Daily topic counts are outside the coverage range: {day}.")
        if any(topic not in TOPIC_PATTERNS or type(count) is not int or count <= 0
               for topic, count in counts.items()):
            raise ValueError(f"Invalid daily topic counts: {day}.")
        months[day[:7]].update(counts)

    for year, counts in snapshot["topicCounts"].items():
        actual = Counter()
        for period, monthly_counts in months.items():
            if period.startswith(year + "-"):
                actual.update(monthly_counts)
        expected = {key: count for key, count in counts.items() if key in TOPIC_PATTERNS}
        if actual != expected:
            raise ValueError(f"Monthly topic totals diverge from the annual snapshot: {year}.")

    return {"start": str(start), "end": str(end), "months": months}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = summarize(json.loads(args.snapshot.read_text(encoding="utf-8")))
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result['months'])} monthly topic totals.")


if __name__ == "__main__":
    main()

"""Count explicit screen references in public inquiry titles, once per thread and screen."""
import argparse
import json
import re
from collections import Counter
from datetime import date
from html import unescape
from pathlib import Path

from collect_public_board import collect

ROOT = Path(__file__).resolve().parents[2]
SCREEN = re.compile(r"\[\s*(\d{4})\s*\]|화면\s*(?:번호)?\s*[:#]?\s*(\d{4})(?!\d)|(?<!\d)(\d{4})\s*(?:번\s*)?화면")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    catalog = json.loads((ROOT / "data/hero/screens.json").read_text())
    numbers = {screen["number"] for screen in catalog}
    counts = Counter()
    matched = 0

    def consider(posted, row):
        nonlocal matched
        title = unescape(re.sub(r"<[^>]*>", " ", row.get("ttl") or ""))
        mentioned = {next(value for value in match if value) for match in SCREEN.findall(title)} & numbers
        counts.update(mentioned)
        matched += bool(mentioned)

    result = collect(args.first, args.last, 1600, 100, on_inquiry=consider)
    if result["stop"] != "reached-older-posts" or result["newestObserved"] < str(args.last):
        parser.exit(1, f"Incomplete coverage: {result['stop']}, oldest {result['oldestObserved']}\n")
    result = {key: result[key] for key in ("sourceUrl", "start", "end", "pages", "years")}
    result.update(matchedThreads=matched, screens=dict(sorted(counts.items())))
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()

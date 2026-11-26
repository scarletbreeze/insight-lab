"""Count explicit screen references in public inquiry titles, once per thread and screen."""
import argparse
import json
from datetime import date
from pathlib import Path

from collect_public_board import collect

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--checkpoint", type=Path, help="Private resume file for a single date range and screen catalog")
    parser.add_argument("--page-size", type=int, choices=(100, 250), default=100)
    args = parser.parse_args()
    catalog = json.loads((ROOT / "data/hero/screens.json").read_text())
    numbers = {screen["number"] for screen in catalog}
    result = collect(args.first, args.last, 1600, args.page_size, checkpoint=args.checkpoint, screen_numbers=numbers)
    if result["stop"] != "reached-older-posts" or result["newestObserved"] < str(args.last):
        parser.exit(1, f"Incomplete coverage: {result['stop']}, oldest {result['oldestObserved']}\n")
    result = {key: result[key] for key in ("sourceUrl", "start", "end", "pages", "pageSize", "years", "catalogSize", "matchedThreads", "screens")}
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()

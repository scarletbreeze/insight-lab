"""Fill months without a published US index entry from FRED daily observations.

The output keeps the shape of data/market/us-index-closes.json: one entry per
"YYYY-MM" with the first and last trading day of the month, the S&P 500 and
Nasdaq Composite closes on those days as [sp500, nasdaq], and one FRED
observation URL per boundary date. Only months where both series have a value on
both boundary days are written. Existing months are kept unless --overwrite is
given; months whose sources are not FRED URLs are replaced only with
--overwrite all, so months cited to AP, broker or exchange reports stay intact.

FRED publishes SP500 for a rolling ten-year window and NASDAQCOM since 1971, and
labels both series "copyrighted: pre-approval required". The project owner chose
on 2026-11-26 to include FRED-sourced months for the presentation; they are
identifiable by the fred.stlouisfed.org hostname of both source URLs.
"""

import argparse
import json
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlencode, urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_us_index_closes import SERIES, fred_boundaries, load_csv, parse_observations

FRED_HOST = "fred.stlouisfed.org"


def observation_url(day):
    return "https://fred.stlouisfed.org/graph/?" + urlencode({"id": ",".join(SERIES), "cosd": day, "coed": day})


def is_fred_month(entry):
    return all(urlparse(entry.get(key, "")).hostname == FRED_HOST for key in ("firstSource", "lastSource"))


def monthly_closes(observations, through, start=None):
    """Return {period: entry} for finished months whose boundary days carry both index values."""
    months = {}
    for period, (first, last) in sorted(fred_boundaries(observations, through).items()):
        if start and first < start:
            continue
        months[period] = {
            "firstDate": first.isoformat(),
            "lastDate": last.isoformat(),
            "first": [float(observations[first][symbol]) for symbol in SERIES],
            "last": [float(observations[last][symbol]) for symbol in SERIES],
            "firstSource": observation_url(first.isoformat()),
            "lastSource": observation_url(last.isoformat()),
        }
    return months


def merge(existing, collected, overwrite=None):
    """Merge collected months into existing data; returns (merged, added, replaced, kept)."""
    merged = dict(existing)
    added, replaced, kept = [], [], []
    for period, entry in collected.items():
        current = existing.get(period)
        if current is None:
            merged[period] = entry
            added.append(period)
        elif overwrite == "all" or (overwrite == "fred" and is_fred_month(current)):
            merged[period] = entry
            replaced.append(period)
        else:
            kept.append(period)
    return dict(sorted(merged.items())), added, replaced, kept


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--through", required=True, type=date.fromisoformat, help="Inclusive cutoff date (YYYY-MM-DD)")
    parser.add_argument("--start", type=date.fromisoformat, help="Ignore months whose first trading day is before this date")
    parser.add_argument("--csv", type=Path, help="Use a previously downloaded public FRED CSV (SP500,NASDAQCOM)")
    parser.add_argument("--out", type=Path, default=Path("data/market/us-index-closes.json"))
    parser.add_argument("--overwrite", choices=["fred", "all"], help="Replace existing FRED-sourced months, or every existing month")
    args = parser.parse_args()

    observations = parse_observations(load_csv(args.csv, args.through))
    collected = monthly_closes(observations, args.through, args.start)
    existing = json.loads(args.out.read_text(encoding="utf-8")) if args.out.exists() else {}
    merged, added, replaced, kept = merge(existing, collected, args.overwrite)
    args.out.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    fred_count = sum(is_fred_month(entry) for entry in merged.values())
    print(f"{len(merged)} months in {args.out} ({fred_count} FRED-sourced): {len(added)} added, {len(replaced)} replaced, {len(kept)} kept as recorded.")
    if added:
        print("added: " + ", ".join(added))


if __name__ == "__main__":
    main()

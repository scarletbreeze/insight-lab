"""Join a dated KOSPI 200 and KOSDAQ 150 universe to adjusted closing prices."""

import argparse
import csv
import json
import re
from datetime import date
from pathlib import Path
from tempfile import NamedTemporaryFile

from calculate_returns import REQUIRED, rank_periods, write_rankings


def read_symbols(path, fields):
    records = {}
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not fields.issubset(reader.fieldnames or []):
            raise ValueError(f"Missing CSV fields in {path.name}: {', '.join(sorted(fields - set(reader.fieldnames or [])))}.")
        for row in reader:
            symbol = row["symbol"].strip()
            if not re.fullmatch(r"[0-9A-Z]{6}", symbol) or symbol in records:
                raise ValueError(f"Invalid or duplicate stock code at {path.name}:{reader.line_num}: {symbol!r}.")
            records[symbol] = row
    return records


def calculate(members_path, prices_path, first, last, annual, *, kospi_count=200, kosdaq_count=150):
    members = read_symbols(members_path, {"symbol", "name", "index", "as_of", "membership_source_url"})
    prices = read_symbols(prices_path, {
        "symbol", "first_date", "last_date", "first_adjusted_close",
        "last_adjusted_close", "source_url", "exclusion_reason",
    })
    if not members or {row["index"] for row in members.values()} != {"KOSPI 200", "KOSDAQ 150"}:
        raise ValueError("Include both index populations for the selected date.")
    for index, count in (("KOSPI 200", kospi_count), ("KOSDAQ 150", kosdaq_count)):
        actual = sum(row["index"] == index for row in members.values())
        if count < 1 or actual != count:
            raise ValueError(f"{index}: expected {count} constituents, got {actual}.")
    if any(date.fromisoformat(row["as_of"]) != first for row in members.values()):
        raise ValueError("Membership must be effective on the first trading day.")
    if members.keys() != prices.keys():
        missing = ", ".join(sorted(members.keys() - prices.keys())[:5])
        extra = ", ".join(sorted(prices.keys() - members.keys())[:5])
        raise ValueError(f"Supply a price or sourced exclusion for each constituent. Missing: {missing or 'none'}. Extra: {extra or 'none'}.")

    sources = sorted({row["membership_source_url"] for row in members.values()})
    with NamedTemporaryFile("w", encoding="utf-8", newline="", suffix=".csv") as joined:
        writer = csv.DictWriter(joined, fieldnames=sorted(REQUIRED | {"membership_source_urls"}))
        writer.writeheader()
        for symbol, member in members.items():
            price = prices[symbol]
            if price["first_date"] != first.isoformat() or price["last_date"] != last.isoformat():
                raise ValueError(f"{symbol}: price dates differ from the selected boundaries.")
            writer.writerow({
                **{key: price[key] for key in REQUIRED & price.keys()},
                "symbol": symbol, "name": member["name"], "market": "KR",
                "universe": "KOSPI 200 · KOSDAQ 150", "membership": "point-in-time",
                "membership_source_url": sources[0], "membership_source_urls": json.dumps(sources),
                "universe_count": len(members),
            })
        joined.flush()
        return rank_periods(Path(joined.name), annual=annual)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("members", type=Path)
    parser.add_argument("prices", type=Path)
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--annual", action="store_true")
    parser.add_argument("--kospi-count", type=int, default=200, help="Verified KOSPI 200 membership count on the first trading day")
    parser.add_argument("--kosdaq-count", type=int, default=150, help="Verified KOSDAQ 150 membership count on the first trading day")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    results = calculate(args.members, args.prices, args.first, args.last, args.annual,
                        kospi_count=args.kospi_count, kosdaq_count=args.kosdaq_count)
    write_rankings(args.out, results)


if __name__ == "__main__":
    main()

"""Build equity rankings from verified period-boundary prices and membership."""

import argparse
import csv
import json
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from math import isfinite
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlsplit

REQUIRED = {
    "market", "symbol", "name", "first_date", "last_date", "first_adjusted_close",
    "last_adjusted_close", "universe", "membership", "source_url",
    "membership_source_url", "universe_count", "exclusion_reason",
}

def https_url(value, label):
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError(f"Missing HTTPS {label}.")
    return value


def rank_periods(path, annual=False):
    groups = defaultdict(list)
    exclusions = defaultdict(lambda: defaultdict(int))
    excluded_symbols = defaultdict(list)
    configurations = {}
    boundaries = {}
    seen = set()
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if reader.fieldnames is None or not REQUIRED.issubset(reader.fieldnames):
            raise ValueError("Input CSV is missing required equity fields.")
        for row in reader:
            start = date.fromisoformat(row["first_date"])
            end = date.fromisoformat(row["last_date"])
            period = str(start.year) if annual else start.isoformat()[:7]
            market = row["market"].strip()
            membership = row["membership"].strip()
            symbol, name, universe = (row[field].strip() for field in ("symbol", "name", "universe"))
            if not (symbol and name and universe):
                raise ValueError(f"Missing symbol, name or universe at line {reader.line_num}.")
            within_period = (
                start.year == end.year and start.month == 1 and end.month == 12
                if annual else end.isoformat().startswith(period)
            )
            if not (1990 <= start.year <= 2026 and start < end and within_period):
                raise ValueError(f"Invalid reporting boundaries for {symbol}.")
            if market not in {"KR", "US"} or membership not in {"point-in-time", "approximate"}:
                raise ValueError(f"Invalid market or universe coverage for {row['symbol']}.")
            key = (period, market)
            identifier = (*key, symbol)
            if identifier in seen:
                raise ValueError(f"Duplicate equity record: {identifier}.")
            seen.add(identifier)
            membership_url = https_url(row["membership_source_url"].strip(), "membership source")
            extra_sources = json.loads(row.get("membership_source_urls") or "[]")
            if not isinstance(extra_sources, list) or not all(isinstance(url, str) for url in extra_sources):
                raise ValueError("Membership source URLs must be a JSON list of strings.")
            membership_urls = tuple(dict.fromkeys([membership_url, *(https_url(url, "membership source") for url in extra_sources)]))
            universe_count = int(row["universe_count"])
            if universe_count < 10:
                raise ValueError(f"Universe has fewer than ten members for {key}.")
            configuration = (universe, membership, membership_urls, universe_count)
            if configurations.setdefault(key, configuration) != configuration:
                raise ValueError(f"Mixed universe definitions for {key}.")
            if boundaries.setdefault(key, (start, end)) != (start, end):
                raise ValueError(f"Mixed first/last trading days for {key}.")
            source_url = https_url(row["source_url"].strip(), f"source for {symbol}")
            reason = row["exclusion_reason"].strip()
            if reason:
                exclusions[key][reason] += 1
                excluded_symbols[key].append(symbol)
                continue
            try:
                start_price = Decimal(row["first_adjusted_close"])
                end_price = Decimal(row["last_adjusted_close"])
            except InvalidOperation as error:
                raise ValueError(f"Non-numeric adjusted prices for {symbol}.") from error
            if not (start_price.is_finite() and end_price.is_finite() and start_price > 0 and end_price >= 0):
                raise ValueError(f"Invalid adjusted prices for {symbol}.")
            return_pct = (end_price / start_price - 1) * 100
            if not isfinite(float(return_pct)):
                raise ValueError(f"Non-finite return for {symbol}.")
            groups[key].append({
                "symbol": symbol, "name": name,
                "returnPct": return_pct,
                "firstDate": start.isoformat(), "lastDate": end.isoformat(),
                "sourceUrl": source_url,
            })
    output = defaultdict(dict)
    for key, (universe, membership, membership_urls, universe_count) in sorted(configurations.items()):
        period, market = key
        equities = groups[key]
        excluded = exclusions[key]
        if len(equities) + sum(excluded.values()) != universe_count:
            raise ValueError(f"Missing or extra constituents for {key}.")
        if len(equities) < 10:
            raise ValueError(f"Fewer than ten eligible equities for {key}.")
        ranked = sorted(equities, key=lambda item: (-item["returnPct"], item["symbol"]))
        if annual:
            selections = {
                "winner": ranked[0],
                "loser": min(ranked, key=lambda item: (item["returnPct"], item["symbol"])),
                "tenbaggers": [item for item in ranked if item["returnPct"] >= 900],
            }
            results = {
                "winner": serialize_equity(selections["winner"]),
                "loser": serialize_equity(selections["loser"]),
                "tenbaggers": [serialize_equity(item) for item in selections["tenbaggers"]],
            }
        else:
            results = {"items": [serialize_equity(item) for item in ranked[:10]]}
        output[period][market] = {
            "universe": universe,
            "membership": membership,
            "membershipSourceUrl": membership_urls[0],
            "membershipSourceUrls": membership_urls,
            "universeCount": universe_count,
            "eligibleCount": len(equities),
            "exclusions": dict(excluded),
            "excludedSymbols": sorted(excluded_symbols[key]),
            **results,
        }
    return output


def serialize_equity(item):
    return {**item, "returnPct": float(item["returnPct"])}


def write_rankings(destination, updates):
    output = json.loads(destination.read_text(encoding="utf-8")) if destination.exists() else {}
    for period, rankings in updates.items():
        output.setdefault(period, {}).update(rankings)
    with NamedTemporaryFile("w", encoding="utf-8", dir=destination.parent, delete=False) as target:
        path = Path(target.name)
        json.dump(output, target, ensure_ascii=False, sort_keys=True, indent=2)
        target.write("\n")
    try:
        path.replace(destination)
    finally:
        path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    parser.add_argument("--annual", action="store_true", help="Calculate full calendar-year results.")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    default = "data/market/annual-equity-rankings.json" if args.annual else "data/market/months/equity-rankings.json"
    destination = args.out or Path(default)
    updates = rank_periods(args.csv, annual=args.annual)
    if not updates:
        parser.error("Input CSV has no observations. Existing rankings were kept.")
    write_rankings(destination, updates)


if __name__ == "__main__":
    main()

"""Join an extracted SEC N-PORT universe to verified split-adjusted prices."""

import argparse
import csv
import json
from datetime import date
from pathlib import Path
from tempfile import NamedTemporaryFile

from calculate_returns import REQUIRED, https_url, rank_periods

PRICE_FIELDS = {
    "security_id", "symbol", "first_adjusted_close", "last_adjusted_close",
    "first_date", "last_date", "source_url", "exclusion_reason",
}


def joined_rows(universe, prices, first, last):
    as_of = date.fromisoformat(universe["asOf"])
    if as_of >= first or universe["membership"] != "approximate":
        raise ValueError("Use an SEC holdings snapshot dated before the first trading day.")

    funds = universe["funds"]
    sources = list(dict.fromkeys(https_url(fund["sourceUrl"], "fund filing") for fund in funds))
    if not sources:
        raise ValueError("No fund filings in the universe.")
    members = universe["members"]
    by_id = {}
    for index, member in enumerate(members):
        for key in ("cusip", "isin"):
            security_id = member[key].strip().upper()
            if security_id:
                if security_id in by_id and by_id[security_id] != index:
                    raise ValueError(f"Duplicate security identifier: {security_id}.")
                by_id[security_id] = index
        if not (member["cusip"] or member["isin"]):
            raise ValueError(f"Missing security identifier for {member['name']}.")

    matched = {}
    with prices.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not PRICE_FIELDS.issubset(reader.fieldnames or []):
            raise ValueError("Price input is missing required fields.")
        for row in reader:
            if row["first_date"] != first.isoformat() or row["last_date"] != last.isoformat():
                raise ValueError(f"Price row {reader.line_num} does not match the selected trading dates.")
            security_id = row["security_id"].strip().upper()
            if security_id not in by_id:
                raise ValueError(f"Price row {reader.line_num} is outside the holdings snapshot.")
            index = by_id[security_id]
            if index in matched:
                raise ValueError(f"Multiple price rows for {members[index]['name']}.")
            matched[index] = row

    missing = [member["name"] for index, member in enumerate(members) if index not in matched]
    if missing:
        raise ValueError(f"Missing price or sourced exclusion for {len(missing)} holdings, including {', '.join(missing[:3])}.")

    for index, member in enumerate(members):
        row = matched[index]
        reason = row["exclusion_reason"].strip()
        symbol = row["symbol"].strip()
        if not symbol and not reason:
            raise ValueError(f"Missing price-source symbol for {member['name']}.")
        yield {
            "first_adjusted_close": row["first_adjusted_close"],
            "last_adjusted_close": row["last_adjusted_close"],
            "source_url": row["source_url"],
            "symbol": symbol or member["cusip"] or member["isin"],
            "name": member["name"],
            "market": "US",
            "membership": "approximate",
            "universe": " · ".join(fund["fund"] for fund in funds) + f" ({as_of})",
            "first_date": first.isoformat(),
            "last_date": last.isoformat(),
            "membership_source_url": sources[0],
            "membership_source_urls": json.dumps(sources),
            "universe_count": len(members),
            "exclusion_reason": reason,
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("universe", type=Path)
    parser.add_argument("prices", type=Path)
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--annual", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    universe = json.loads(args.universe.read_text(encoding="utf-8"))
    rows = list(joined_rows(universe, args.prices, args.first, args.last))
    if not rows:
        raise ValueError("No securities to publish.")
    with NamedTemporaryFile("w", encoding="utf-8", newline="", dir=args.out.parent, delete=False) as target:
        staging = Path(target.name)
        writer = csv.DictWriter(target, fieldnames=sorted(REQUIRED | {"membership_source_urls"}))
        writer.writeheader()
        writer.writerows(rows)
    try:
        rank_periods(staging, annual=args.annual)
        staging.replace(args.out)
    finally:
        staging.unlink(missing_ok=True)


if __name__ == "__main__":
    main()

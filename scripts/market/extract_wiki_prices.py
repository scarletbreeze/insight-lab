"""Extract dividend-excluded period-boundary prices from a local WIKI/PRICES CSV."""

import argparse
import csv
import gzip
import io
import json
from collections import defaultdict
from contextlib import contextmanager
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

from calculate_returns import https_url

SOURCE = "https://data.nasdaq.com/databases/WIKIP"
CALENDAR_SYMBOLS = {"AAPL", "MSFT", "GOOG"}
FIELDS = [
    "security_id", "symbol", "first_date", "last_date",
    "first_adjusted_close", "last_adjusted_close", "source_url", "exclusion_reason",
]


def read_mappings(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if not {"security_id", "symbol", "exclusion_reason", "source_url"}.issubset(reader.fieldnames or []):
            raise ValueError("Mapping must contain security_id, symbol, exclusion_reason and source_url.")
        mappings = {}
        symbols = set()
        for row in reader:
            key = row["security_id"].strip().upper()
            symbol = row["symbol"].strip().upper()
            reason = row["exclusion_reason"].strip()
            if not key or key in mappings or not (symbol or reason) or (symbol and symbol in symbols):
                raise ValueError(f"Invalid or duplicate security mapping on line {reader.line_num}.")
            url = https_url(row["source_url"].strip(), "exclusion source" if reason else "ticker mapping source")
            mappings[key] = (symbol, reason, url)
            if symbol:
                symbols.add(symbol)
    return mappings


@contextmanager
def open_archive(path):
    if path.suffix == ".zip":
        with ZipFile(path) as archive, archive.open("WIKI_PRICES.csv") as member:
            with io.TextIOWrapper(member, encoding="utf-8-sig", newline="") as source:
                yield source
    else:
        opening = gzip.open if path.suffix == ".gz" else open
        with opening(path, "rt", encoding="utf-8-sig", newline="") as source:
            yield source


def extract_prices(path, symbols, first, last, renames=()):
    observations = defaultdict(dict)
    replacements = {old: (new, effective) for old, new, effective in renames}
    renamed = {new: (old, effective) for old, new, effective in renames}
    if len(replacements) != len(renames) or len(renamed) != len(renames) or replacements.keys() & renamed.keys():
        raise ValueError("Price aliases must be unambiguous single ticker changes.")
    if replacements.keys() - symbols or renamed.keys() & symbols:
        raise ValueError("Price aliases must replace a ticker present at the start of the period.")
    requested = symbols | CALENDAR_SYMBOLS | renamed.keys()
    with open_archive(path) as source:
        reader = csv.reader(source)
        header = next(reader, [])
        fields = ["ticker", "date", "close", "split_ratio"]
        if not set(fields).issubset(header):
            raise ValueError("WIKI CSV must contain ticker, date, close and split_ratio.")
        ticker_index, day_index, close_index, split_index = (header.index(field) for field in fields)
        for row in reader:
            symbol = row[ticker_index]
            day = row[day_index]
            if symbol not in requested:
                continue
            if not first <= day <= last:
                continue
            if symbol in renamed:
                old, effective = renamed[symbol]
                if day < effective:
                    continue
                symbol = old
            elif symbol in replacements and day >= replacements[symbol][1]:
                continue
            try:
                close = Decimal(row[close_index])
                split = Decimal(row[split_index])
            except InvalidOperation as error:
                raise ValueError(f"Invalid WIKI price or split ratio for {symbol} on {day}.") from error
            if day in observations[symbol] or not (close.is_finite() and close > 0 and split.is_finite() and split > 0):
                raise ValueError(f"Invalid or duplicate WIKI row for {symbol} on {day}.")
            observations[symbol][day] = (close, split)
    expected_days = set().union(*(observations[symbol] for symbol in CALENDAR_SYMBOLS))
    if not {first, last}.issubset(expected_days):
        raise ValueError("Selected boundary dates are missing from the WIKI calendar proxy.")

    prices = {}
    incomplete = []
    for symbol in sorted(symbols):
        rows = observations[symbol]
        if set(rows) != expected_days:
            incomplete.append(symbol)
            continue
        factor = Decimal(1)
        for day in sorted(rows):
            if day > first:
                factor *= rows[day][1]
        prices[symbol] = (rows[first][0] / factor, rows[last][0])
    return prices, incomplete


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wiki_csv", type=Path)
    parser.add_argument("universe", type=Path, help="Holdings JSON with CUSIP or ISIN per member")
    parser.add_argument("mapping", type=Path, help="Reviewed security-to-WIKI-ticker mapping CSV")
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    first = args.first.isoformat()
    last = args.last.isoformat()
    if first >= last or last > "2018-03-27":
        parser.error("Use ordered dates within the historical WIKI archive through 2018-03-27.")
    universe = json.loads(args.universe.read_text(encoding="utf-8"))
    members = universe["members"]
    securities = [(member.get("cusip") or member.get("isin") or "").strip().upper() for member in members]
    if not securities or not all(securities) or len(securities) != len(set(securities)):
        parser.error("Holdings must have unique security identifiers.")
    mappings = read_mappings(args.mapping)
    if set(securities) != mappings.keys():
        parser.error("Provide one reviewed ticker mapping or sourced exclusion per holding.")
    prices, incomplete = extract_prices(args.wiki_csv, {symbol for symbol, reason, _ in mappings.values() if not reason}, first, last)
    if incomplete:
        parser.error("Incomplete WIKI price or split coverage for " + ", ".join(incomplete) + ".")

    with NamedTemporaryFile("w", encoding="utf-8", newline="", dir=args.out.parent, delete=False) as target:
        path = Path(target.name)
    try:
        with path.open("w", encoding="utf-8", newline="") as target:
            writer = csv.DictWriter(target, fieldnames=FIELDS)
            writer.writeheader()
            for key in securities:
                symbol, reason, source = mappings[key]
                first_price, last_price = ("", "") if reason else prices[symbol]
                writer.writerow(dict(zip(FIELDS, [key, symbol, first, last, first_price, last_price, source if reason else SOURCE, reason])))
        path.replace(args.out)
    finally:
        path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()

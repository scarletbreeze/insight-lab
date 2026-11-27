"""Rank a dated, reviewed ETF portfolio with a locally supplied daily price archive (Stooq ASCII layout).

The archive is never downloaded here. Drop a manually downloaded Stooq bulk file (``d_us_txt.zip`` from
https://stooq.com/db/h/) or a folder of per-symbol CSV files (``Date,Open,High,Low,Close,Volume`` from
``https://stooq.com/q/d/l/?s=aapl.us&i=d``) next to this repository and pass its path. Before any ranking the
archive must reproduce known split-adjusted closes, which rejects unadjusted or dividend-adjusted series.
"""

import argparse
import csv
import io
import json
import re
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile

from calculate_returns import REQUIRED, https_url, rank_periods, write_rankings
from rank_wiki_portfolio import portfolio_at_start

CALENDAR_SYMBOLS = {"AAPL", "MSFT", "GOOG"}
DEFAULT_SOURCE = "https://stooq.com/db/h/"
DEFAULT_METHOD = "Stooq 일별 종가(분할 조정)로 계산 · 배당 제외"
EXCLUSION = "가격 아카이브의 거래일 범위 미충족"
ACTION_EXCLUSION = "분할 비율만으로 조정할 수 없는 기업행동"
# Closes on the last trading day before a split, divided by every later split ratio (AAPL 499.23/4,
# TSLA 2,213.40/15, NVDA 1,208.88/10). A dividend-adjusted or unadjusted archive misses these by far more than 0.5%.
SPLIT_CHECKS = (("AAPL", "2020-08-28", "124.8075"), ("TSLA", "2020-08-28", "147.56"), ("NVDA", "2024-06-07", "120.888"))
CHECK_TOLERANCE = Decimal("0.005")
STOOQ_FIELDS = ("<TICKER>", "<DATE>", "<CLOSE>")
SIMPLE_FIELDS = ("Date", "Close")


def archive_symbol(file_name):
    """Map ``nasdaq stocks/1/aapl.us.txt`` or ``aapl_us_d.csv`` to ``AAPL``."""
    stem = Path(file_name).name
    stem = re.sub(r"\.(txt|csv)$", "", stem, flags=re.IGNORECASE)
    stem = re.sub(r"(\.us|_us)(_d)?$", "", stem, flags=re.IGNORECASE)
    return stem.upper()


def normalize_day(value):
    value = value.strip()
    if re.fullmatch(r"\d{8}", value):
        return f"{value[:4]}-{value[4:6]}-{value[6:]}"
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return value
    raise ValueError(f"Unrecognized date {value!r} in the price archive.")


def parse_series(text, file_name):
    """Yield ``(symbol, iso_date, close)`` rows from one Stooq bulk file or one per-symbol CSV."""
    reader = csv.reader(io.StringIO(text))
    header = [cell.strip() for cell in next(reader, [])]
    if set(STOOQ_FIELDS).issubset(header):
        symbol_index, day_index, close_index = (header.index(field) for field in STOOQ_FIELDS)
        for row in reader:
            if len(row) <= close_index or not row[close_index].strip():
                continue
            yield archive_symbol(row[symbol_index].strip()), normalize_day(row[day_index]), row[close_index].strip()
    elif set(SIMPLE_FIELDS).issubset(header):
        day_index, close_index = (header.index(field) for field in SIMPLE_FIELDS)
        symbol = archive_symbol(file_name)
        for row in reader:
            if len(row) <= close_index or not row[close_index].strip():
                continue
            yield symbol, normalize_day(row[day_index]), row[close_index].strip()
    else:
        raise ValueError(f"{file_name} is neither a Stooq ASCII file nor a Date/Close CSV.")


def iter_archive(path):
    """Yield ``(file_name, text)`` for every price file in a Stooq zip, a folder of files, or one file."""
    if path.is_dir():
        for file in sorted(path.rglob("*")):
            if file.suffix.lower() in {".txt", ".csv"}:
                yield str(file.relative_to(path)), file.read_text(encoding="utf-8-sig")
    elif path.suffix.lower() == ".zip":
        with ZipFile(path) as archive:
            for name in sorted(archive.namelist()):
                if name.lower().endswith((".txt", ".csv")) and not name.endswith("/"):
                    yield name, archive.read(name).decode("utf-8-sig")
    else:
        yield path.name, path.read_text(encoding="utf-8-sig")


def load_closes(path, symbols, days):
    """Return ``{symbol: {iso_date: Decimal}}`` for the requested symbols on the requested days."""
    closes = defaultdict(dict)
    wanted_days = set(days)
    for file_name, text in iter_archive(path):
        if text.startswith("<TICKER>") or archive_symbol(file_name) in symbols:
            for symbol, day, close in parse_series(text, file_name):
                if symbol not in symbols or day not in wanted_days:
                    continue
                try:
                    value = Decimal(close)
                except InvalidOperation as error:
                    raise ValueError(f"Non-numeric close for {symbol} on {day}.") from error
                if value <= 0:
                    raise ValueError(f"Non-positive close for {symbol} on {day}.")
                if closes[symbol].setdefault(day, value) != value:
                    raise ValueError(f"Conflicting closes for {symbol} on {day}.")
    return closes


def verify_split_adjustment(closes, checks=SPLIT_CHECKS):
    """Raise unless every reference close in the archive matches the known split-adjusted value."""
    failures = []
    for symbol, day, expected in checks:
        observed = closes.get(symbol, {}).get(day)
        target = Decimal(expected)
        if observed is None:
            failures.append(f"{symbol} {day} missing")
        elif abs(observed - target) / target > CHECK_TOLERANCE:
            failures.append(f"{symbol} {day} {observed} != {target}")
    if failures:
        raise ValueError("Archive is not split-adjusted (dividend-excluded) as required: " + "; ".join(failures))


def boundary_prices(closes, members, first, last, renames=()):
    """Return ``({symbol: (first_close, last_close)}, [incomplete symbols])`` honoring same-share ticker changes."""
    replacements = {old: new for old, new, _ in renames}
    prices = {}
    incomplete = []
    for symbol in members:
        start = closes.get(symbol, {}).get(first)
        end_symbol = replacements.get(symbol, symbol)
        end = closes.get(end_symbol, {}).get(last)
        if start is None or end is None:
            incomplete.append(symbol)
        else:
            prices[symbol] = (start, end)
    return prices, incomplete


def trading_days(closes, first, last):
    days = set()
    for symbol in CALENDAR_SYMBOLS:
        days.update(closes.get(symbol, {}))
    return {day for day in days if first <= day <= last}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Stooq d_us_txt.zip, an extracted folder, or a folder of per-symbol CSVs")
    parser.add_argument("portfolio", type=Path)
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--changes", type=Path, help="Dated membership changes after the holdings date")
    parser.add_argument("--renames", type=Path, help="Dated same-share ticker changes with official sources")
    parser.add_argument("--actions", type=Path, help="Sourced complex corporate actions not handled by split ratios")
    parser.add_argument("--accept-missing", nargs="*", default=[], help="Reviewed symbols absent from the archive on a boundary day")
    parser.add_argument("--source-url", default=DEFAULT_SOURCE, help="HTTPS page that documents the archive")
    parser.add_argument("--price-method", default=DEFAULT_METHOD)
    parser.add_argument("--disclosure", help="Sentence shown with the ranking about the archive's terms and the owner's decision")
    parser.add_argument("--annual", action="store_true")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()

    portfolio = json.loads(args.portfolio.read_text(encoding="utf-8"))
    as_of = date.fromisoformat(portfolio["asOf"])
    first, last = args.first.isoformat(), args.last.isoformat()
    if not as_of < args.first < args.last <= date.today():
        parser.error("Use a holdings date before the first trading day and a last trading day that has passed.")
    source_url = https_url(args.source_url, "price archive source")
    changes = json.loads(args.changes.read_text(encoding="utf-8")) if args.changes else []
    members, sources, universe_label = portfolio_at_start(portfolio, changes, args.first)
    if len(members) < 10:
        parser.error("Provide at least ten uniquely identified holdings.")
    actions = json.loads(args.actions.read_text(encoding="utf-8")) if args.actions else []
    affected = {
        symbol: https_url(action["sourceUrl"], "corporate action source")
        for action in actions if first < action["date"] <= last
        for symbol in action["symbols"] if symbol in members
    }
    renames = json.loads(args.renames.read_text(encoding="utf-8")) if args.renames else []
    price_aliases = [
        (change["from"], change["to"], change["date"])
        for change in renames if first < change["date"] <= last and change["from"] in members.keys() - affected.keys()
    ]
    if len({old for old, _, _ in price_aliases}) != len(price_aliases) or {new for _, new, _ in price_aliases} & members.keys():
        parser.error("Ticker changes must be unambiguous and must not collide with another holding.")

    original_by_archive = {}
    archive_sources = {}
    for symbol, holding in members.items():
        if symbol in affected:
            continue
        key = holding.get("archiveSymbol", symbol)
        if key in original_by_archive:
            parser.error(f"Multiple holdings point to archive series {key}.")
        original_by_archive[key] = symbol
        if key != symbol:
            archive_sources[symbol] = https_url(holding["archiveSymbolSource"], "ticker history source")
    requested = set(original_by_archive) | CALENDAR_SYMBOLS | {new for _, new, _ in price_aliases} | {symbol for symbol, _, _ in SPLIT_CHECKS}
    days = {first, last} | {day for _, day, _ in SPLIT_CHECKS}
    closes = load_closes(args.archive, requested, days)
    verify_split_adjustment(closes)
    calendar = trading_days(closes, first, last)
    if first not in calendar or last not in calendar:
        parser.error(f"{first} and {last} must both be trading days observed for {', '.join(sorted(CALENDAR_SYMBOLS))}.")
    archive_prices, archive_missing = boundary_prices(closes, set(original_by_archive), first, last, price_aliases)
    prices = {original_by_archive[key]: value for key, value in archive_prices.items()}
    incomplete = sorted(original_by_archive[key] for key in archive_missing)
    if set(incomplete) != set(args.accept_missing):
        parser.error("Review holdings without archive closes on both boundary days: " + (", ".join(incomplete) or "none"))

    with TemporaryDirectory() as folder:
        staging = Path(folder) / "prices.csv"
        with staging.open("w", encoding="utf-8", newline="") as target:
            writer = csv.DictWriter(target, fieldnames=sorted(REQUIRED | {"membership_source_urls"}))
            writer.writeheader()
            for symbol, member in members.items():
                first_price, last_price = prices.get(symbol, ("", ""))
                writer.writerow({
                    "market": "US", "name": member["name"], "symbol": symbol,
                    "first_date": first, "last_date": last,
                    "first_adjusted_close": first_price, "last_adjusted_close": last_price,
                    "source_url": affected.get(symbol, source_url), "membership": "approximate",
                    "universe": universe_label,
                    "membership_source_url": portfolio["sourceUrl"], "universe_count": len(members),
                    "membership_source_urls": json.dumps(sources),
                    "exclusion_reason": (ACTION_EXCLUSION if symbol in affected else EXCLUSION if symbol in incomplete else ""),
                })
        rankings = rank_periods(staging, annual=args.annual)

    for markets in rankings.values():
        result = markets["US"]
        result["excludedSymbols"] = sorted(set(incomplete) | affected.keys())
        if affected:
            result["corporateActionSources"] = sorted(set(affected.values()))
        if price_aliases:
            result["tickerChangeSources"] = [
                https_url(change["sourceUrl"], "ticker change source") for change in renames
                if (change["from"], change["to"], change["date"]) in price_aliases
            ]
        if archive_sources:
            result["archiveTickers"] = [
                {"symbol": symbol, "archiveSymbol": members[symbol]["archiveSymbol"], "sourceUrl": url}
                for symbol, url in sorted(archive_sources.items())
            ]
        result["priceMethod"] = args.price_method
        if args.disclosure:
            result["priceDisclosure"] = args.disclosure
    default = "data/market/annual-equity-rankings.json" if args.annual else "data/market/months/equity-rankings.json"
    write_rankings(args.out or Path(default), rankings)
    print(f"{len(prices)}/{len(members)} holdings priced for {first}–{last}.")


if __name__ == "__main__":
    main()

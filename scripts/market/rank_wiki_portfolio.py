"""Rank a dated, reviewed ETF portfolio using the public-domain WIKI price archive."""

import argparse
import csv
import json
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory

from calculate_returns import REQUIRED, https_url, rank_periods, write_rankings
from extract_wiki_prices import SOURCE, extract_prices

EXCLUSION = "WIKI 가격·분할 자료의 거래일 범위 미충족"


def portfolio_at_start(portfolio, changes, start):
    as_of = date.fromisoformat(portfolio["asOf"])
    members = {item["symbol"]: item for item in portfolio["members"]}
    if len(members) != len(portfolio["members"]):
        raise ValueError("Duplicate securities in the original portfolio.")
    sources = []
    for change in sorted(changes, key=lambda item: item["date"]):
        effective = date.fromisoformat(change["date"])
        if not as_of < effective <= start:
            continue
        for symbol in change["remove"]:
            if symbol not in members:
                raise ValueError(f"Cannot remove {symbol}: absent from portfolio on {effective}.")
            del members[symbol]
        for symbol, name in change["add"].items():
            if symbol in members:
                raise ValueError(f"Cannot add {symbol}: already present on {effective}.")
            members[symbol] = {"symbol": symbol, "name": name}
        sources.append(change["sourceUrl"])
    label = f"{portfolio['fund']} 보유 주식 ({as_of})"
    if sources:
        label += " · 편입·종목코드 변경 반영"
    return members, sources, label


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("wiki_archive", type=Path)
    parser.add_argument("portfolio", type=Path)
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--changes", type=Path, help="Dated membership changes after the holdings date")
    parser.add_argument("--renames", type=Path, help="Dated same-share ticker changes with official sources")
    parser.add_argument("--actions", type=Path, help="Sourced complex corporate actions not handled by split ratios")
    parser.add_argument("--accept-missing", nargs="*", default=[], help="Reviewed symbols with incomplete WIKI observations")
    parser.add_argument("--annual", action="store_true")
    parser.add_argument("--out", type=Path)
    args = parser.parse_args()
    portfolio = json.loads(args.portfolio.read_text(encoding="utf-8"))
    as_of = date.fromisoformat(portfolio["asOf"])
    first, last = args.first.isoformat(), args.last.isoformat()
    if not as_of < args.first < args.last <= date(2018, 3, 27):
        parser.error("Use a holdings date before the first trading day and WIKI dates through 2018-03-27.")
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
    # WIKI sometimes assigns an issuer's later ticker to its entire history.
    # Reverse this mapping for display; the same letters can identify another company in the portfolio.
    original_by_archive = {}
    archive_sources = {}
    for symbol, holding in members.items():
        if symbol in affected:
            continue
        archive_symbol = holding.get("archiveSymbol", symbol)
        if archive_symbol in original_by_archive:
            parser.error(f"Multiple holdings point to WIKI series {archive_symbol}.")
        original_by_archive[archive_symbol] = symbol
        if archive_symbol != symbol:
            archive_sources[symbol] = https_url(holding["archiveSymbolSource"], "ticker history source")
    archive_prices, archive_missing = extract_prices(args.wiki_archive, set(original_by_archive), first, last, price_aliases)
    prices = {original_by_archive[key]: value for key, value in archive_prices.items()}
    incomplete = [original_by_archive[key] for key in archive_missing]
    if set(incomplete) != set(args.accept_missing):
        parser.error("Review incomplete WIKI observations for: " + (", ".join(incomplete) or "none"))

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
                    "source_url": affected.get(symbol, SOURCE), "membership": "approximate",
                    "universe": universe_label,
                    "membership_source_url": portfolio["sourceUrl"], "universe_count": len(members),
                    "membership_source_urls": json.dumps(sources),
                    "exclusion_reason": ("분할 비율만으로 조정할 수 없는 기업행동" if symbol in affected
                                         else EXCLUSION if symbol in incomplete else ""),
                })
        rankings = rank_periods(staging, annual=args.annual)

    for markets in rankings.values():
        markets["US"]["excludedSymbols"] = sorted(set(incomplete) | affected.keys())
        if affected:
            markets["US"]["corporateActionSources"] = sorted(set(affected.values()))
        if price_aliases:
            markets["US"]["tickerChangeSources"] = [
                https_url(change["sourceUrl"], "ticker change source") for change in renames
                if (change["from"], change["to"], change["date"]) in price_aliases
            ]
        if archive_sources:
            markets["US"]["archiveTickers"] = [
                {"symbol": symbol, "archiveSymbol": members[symbol]["archiveSymbol"], "sourceUrl": url}
                for symbol, url in sorted(archive_sources.items())
            ]
        markets["US"]["priceMethod"] = "WIKI 종가와 분할 비율로 계산 · 배당 제외"
    default = "data/market/annual-equity-rankings.json" if args.annual else "data/market/months/equity-rankings.json"
    write_rankings(args.out or Path(default), rankings)
    print(f"{len(prices)}/{len(members)} holdings priced for {first}–{last}.")


if __name__ == "__main__":
    main()

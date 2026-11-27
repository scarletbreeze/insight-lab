"""Write a dated fund holdings snapshot (``qqq-holdings-YYYY-MM.json``) from a locally saved SEC N-PORT XML filing.

The snapshot keeps the common-equity rows of one filing with the ticker the fund reported, so that
``rank_archive_portfolio.py`` can price them. A row without a reported ticker must be mapped explicitly with
``--ticker CUSIP=SYMBOL``; nothing is guessed.
"""

import argparse
import json
from datetime import date
from pathlib import Path

from extract_nport_universe import extract_report


def holdings_from_report(path, source_url, as_of, ticker_overrides=None, minimum=10):
    overrides = {key.upper(): value.upper() for key, value in (ticker_overrides or {}).items()}
    fund, rows = extract_report(path, source_url, as_of)
    members = []
    seen = {}
    for row in rows:
        symbol = overrides.get(row["cusip"]) or overrides.get(row["isin"]) or row["reportedTicker"].strip().upper()
        if not symbol:
            raise ValueError(f"Missing ticker for {row['name']} ({row['cusip'] or row['isin']}); pass --ticker CUSIP=SYMBOL.")
        if symbol in seen:
            raise ValueError(f"Ticker {symbol} appears twice ({seen[symbol]} and {row['name']}).")
        seen[symbol] = row["name"]
        members.append({"symbol": symbol, "name": row["name"], "cusip": row["cusip"], "isin": row["isin"]})
    if len(members) < minimum:
        raise ValueError(f"Only {len(members)} common-equity holdings in {path.name}.")
    members.sort(key=lambda item: item["symbol"])
    return {
        "asOf": as_of.isoformat(),
        "fund": fund["fund"],
        "sourceUrl": fund["sourceUrl"],
        "membership": "approximate",
        "members": members,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xml", type=Path, help="Locally saved N-PORT primary_doc.xml")
    parser.add_argument("source_url", help="SEC EDGAR URL of that filing")
    parser.add_argument("--as-of", type=date.fromisoformat, required=True, help="Holdings date reported in the filing")
    parser.add_argument("--ticker", action="append", default=[], metavar="CUSIP=SYMBOL", help="Ticker for a row the filing left blank")
    parser.add_argument("--min-count", type=int, default=90)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    overrides = dict(item.split("=", 1) for item in args.ticker)
    snapshot = holdings_from_report(args.xml, args.source_url, args.as_of, overrides, args.min_count)
    args.out.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(snapshot['members'])} holdings of {snapshot['fund']} as of {snapshot['asOf']} written to {args.out}.")


if __name__ == "__main__":
    main()

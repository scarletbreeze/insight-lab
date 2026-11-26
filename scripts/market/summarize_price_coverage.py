"""Count price continuity checks for each month's opening Korean market listings."""
import argparse
import json
from collections import Counter
from datetime import date
from pathlib import Path

from rank_kodex_price_research import check_prices


def main():
    import duckdb

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parquet", type=Path)
    parser.add_argument("year", type=int)
    args = parser.parse_args()
    calendars = json.loads(Path("data/market/korea-index-closes.json").read_text())["monthly"]
    result = {}
    for month in range(1, 13):
        period = f"{args.year}-{month:02}"
        first, last = (date.fromisoformat(calendars[period][key]) for key in ("firstDate", "lastDate"))
        with duckdb.connect() as db:
            symbols = [row[0] for row in db.execute("""
                SELECT DISTINCT Code FROM read_parquet(?) WHERE CAST(Date AS DATE) = ?
                AND Market IN ('KOSPI', 'KOSDAQ', 'KOSDAQ GLOBAL')
            """, [str(args.parquet), first]).fetchall()]
            prices = check_prices(db, args.parquet, symbols, first, last)
        reasons = Counter(prices[symbol][2] for symbol in symbols)
        result[period] = dict(first=str(first), last=str(last), opening=len(symbols),
                              passed=reasons.pop("", 0), excluded=dict(sorted(reasons.items())))
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

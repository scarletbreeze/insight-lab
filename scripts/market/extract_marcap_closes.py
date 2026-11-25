"""Extract local research snapshots of unadjusted Korean closes from annual marcap Parquet files."""

import argparse
import csv
from datetime import date
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parquet", type=Path, nargs="+", help="Locally downloaded annual marcap files")
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.first >= args.last:
        parser.error("The first date must precede the last date.")

    try:
        import duckdb
    except ImportError:
        parser.error("Install the duckdb Python package to read Parquet files.")

    with duckdb.connect() as connection:
        rows = connection.execute("""
            SELECT CAST(Date AS DATE), Code, Name, Market, CAST(Close AS BIGINT), Stocks
            FROM read_parquet(?, union_by_name=true)
            WHERE Date IN (?, ?) AND Market IN ('KOSPI', 'KOSDAQ', 'KOSDAQ GLOBAL')
                AND Close > 0 AND Close = trunc(Close)
            ORDER BY 1, 2
        """, [[str(path) for path in args.parquet], args.first, args.last]).fetchall()

    keys = {(day, symbol) for day, symbol, *_ in rows}
    if len(keys) != len(rows):
        parser.error("Duplicate symbol/date pairs in the selected files.")
    if {day for day, *_ in rows} != {args.first, args.last}:
        parser.error("Both dates must be available in the supplied files.")

    with args.out.open("w", newline="", encoding="utf-8") as destination:
        writer = csv.writer(destination)
        writer.writerow(["date", "symbol", "name", "market", "raw_close_krw", "listed_shares"])
        writer.writerows(rows)
    print(f"Extracted {len(rows)} unadjusted close rows.")


if __name__ == "__main__":
    main()

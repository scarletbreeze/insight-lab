"""Build a local ETF-holdings price ranking after checking daily price continuity."""

import argparse
import csv
import json
import re
from datetime import date
from pathlib import Path
from tempfile import NamedTemporaryFile

from calculate_returns import REQUIRED, rank_periods, write_rankings

PRICE_SOURCE = "https://github.com/FinanceData/marcap/tree/master/data"
ETF_SOURCE = "https://www.samsungfund.com/api/v1/kodex/product-pdf"
FUNDS = {"2ETF01": "KODEX 200", "2ETF54": "KODEX 코스닥150"}


def read_holdings(paths, first):
    holdings = {}
    for fund, path in zip(FUNDS, paths, strict=True):
        snapshot = json.loads(path.read_text(encoding="utf-8"))["pdf"]
        if snapshot["gijunYMD"] != first.strftime("%Y%m%d"):
            raise ValueError(f"{FUNDS[fund]} holdings do not match the first trading day.")
        if int(snapshot["totalCnt"]) != len(snapshot["list"]):
            raise ValueError(f"Incomplete holdings for {FUNDS[fund]}.")
        for row in snapshot["list"]:
            symbol = row["itmNo"]
            if re.fullmatch(r"[0-9A-Z]{6}", symbol):
                if symbol in holdings:
                    raise ValueError(f"Duplicate holding {symbol}.")
                holdings[symbol] = row["secNm"]
    return holdings


def check_prices(connection, path, symbols, first, last):
    connection.execute("""
        CREATE TEMP TABLE snapshots AS
        SELECT CAST(Date AS DATE) AS day, Code, Close, Changes, Stocks
        FROM read_parquet(?)
        WHERE CAST(Date AS DATE) BETWEEN ? AND ?
          AND Market IN ('KOSPI', 'KOSDAQ', 'KOSDAQ GLOBAL')
    """, [str(path), first, last])
    dates = [row[0] for row in connection.execute("SELECT DISTINCT day FROM snapshots ORDER BY day").fetchall()]
    if len(dates) < 2 or dates[0] != first or dates[-1] != last:
        raise ValueError("The price file lacks both requested boundaries.")
    rows = connection.execute("""
        WITH history AS (
            SELECT *, lag(Close) OVER series AS previous_close, lag(Stocks) OVER series AS previous_shares
            FROM snapshots WHERE Code IN (SELECT unnest(?))
            WINDOW series AS (PARTITION BY Code ORDER BY day)
        )
        SELECT Code, count(*) AS observations, count(DISTINCT day) AS distinct_days,
               count(*) FILTER (WHERE Close <= 0 OR Close IS NULL OR Stocks IS NULL
                   OR (day > ? AND Changes IS NULL)) AS invalid_rows,
               count(*) FILTER (WHERE day > ? AND Close - Changes <> previous_close) AS price_breaks,
               count(*) FILTER (WHERE Stocks <> previous_shares) AS share_changes,
               max(Close) FILTER (WHERE day = ?), max(Close) FILTER (WHERE day = ?)
        FROM history GROUP BY Code
    """, [list(symbols), first, first, first, last]).fetchall()
    results = {}
    for symbol, observed, distinct, invalid, breaks, share_changes, start, end in rows:
        if observed != len(dates) or distinct != observed or invalid:
            reason = "관측 누락·중복 또는 가격 확인 필요"
        elif breaks:
            reason = "전일 종가와 기준가격 차이 확인"
        elif share_changes:
            reason = "상장주식수 변경 확인"
        else:
            reason = ""
        results[symbol] = (start, end, reason)
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parquet", type=Path)
    parser.add_argument("kodex200", type=Path)
    parser.add_argument("kodex150", type=Path)
    parser.add_argument("--first", required=True, type=date.fromisoformat)
    parser.add_argument("--last", required=True, type=date.fromisoformat)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    try:
        import duckdb
    except ImportError:
        parser.error("Install duckdb to read the local Parquet file.")

    holdings = read_holdings((args.kodex200, args.kodex150), args.first)
    with duckdb.connect() as db:
        prices = check_prices(db, args.parquet, holdings, args.first, args.last)
    membership_urls = [
        f"{ETF_SOURCE}/{fund}.do?gijunYMD={args.first.strftime('%Y.%m.%d')}" for fund in FUNDS
    ]
    with NamedTemporaryFile("w", encoding="utf-8", newline="", suffix=".csv") as temporary:
        writer = csv.DictWriter(temporary, fieldnames=sorted(REQUIRED | {"membership_source_urls"}))
        writer.writeheader()
        for symbol, name in holdings.items():
            start, end, reason = prices.get(symbol, (None, None, "거래일 가격 자료 없음"))
            writer.writerow({
                "symbol": symbol, "name": name, "market": "KR",
                "first_date": args.first, "last_date": args.last,
                "first_adjusted_close": start, "last_adjusted_close": end,
                "universe": "KODEX 200 · KODEX 코스닥150 보유 주식",
                "membership": "approximate", "universe_count": len(holdings),
                "source_url": PRICE_SOURCE, "membership_source_url": membership_urls[0],
                "membership_source_urls": json.dumps(membership_urls), "exclusion_reason": reason,
            })
        temporary.flush()
        rankings = rank_periods(Path(temporary.name))
    for markets in rankings.values():
        markets["KR"]["priceMethod"] = (
            "전일 종가와 당일 기준가격이 매 거래일 일치하고 상장주식수가 일정한 종목의 첫·마지막 종가를 비교했습니다."
        )
    write_rankings(args.out, rankings)


if __name__ == "__main__":
    main()

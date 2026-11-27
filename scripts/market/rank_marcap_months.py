"""Rank Korean monthly and annual stock returns from local marcap Parquet files with a size-based approximate universe.

The universe of each period is the 200 largest KOSPI stocks and the 150 largest KOSDAQ stocks by
market capitalisation (close × listed shares) on the first trading day. Returns compare unadjusted
closes; stocks whose listed share count changed, whose base price differed from the previous close,
or that had no volume on a boundary day are excluded instead of adjusted.
"""

import argparse
import json
import re
from collections import Counter
from datetime import date
from pathlib import Path
from tempfile import NamedTemporaryFile

PRICE_SOURCE = "https://github.com/FinanceData/marcap/tree/master/data"
DECISION_DATE = "2026-11-27"
MARKETS = ("KOSPI", "KOSDAQ", "KOSDAQ GLOBAL")
KOSDAQ_MARKETS = {"KOSDAQ", "KOSDAQ GLOBAL"}
UNIVERSE_RULE = (
    "기준일(첫 거래일) 종가×상장주식수로 계산한 시가총액 상위 KOSPI 200개와 KOSDAQ(KOSDAQ GLOBAL 포함) 150개 보통주. "
    "우선주 등 종목코드 끝자리가 0이 아닌 종목, 스팩, 리츠, 코넥스는 제외."
)
UNIVERSE_RULE_KOSPI_ONLY = (
    "기준일(첫 거래일) 종가×상장주식수로 계산한 시가총액 상위 KOSPI 200개 보통주. 이 달의 시세 파일에는 코스닥 종목이 없다. "
    "우선주 등 종목코드 끝자리가 0이 아닌 종목, 스팩, 리츠, 코넥스는 제외."
)
PRICE_METHOD = (
    "첫 거래일과 마지막 거래일의 원종가(수정주가 미반영, 배당 제외)를 비교했습니다. "
    "기간 중 상장주식수가 바뀐 종목, 전일 종가와 당일 기준가격이 다른 날이 있는 종목, "
    "첫날 또는 마지막 날 거래량이 0이거나 관측이 빠진 종목은 조정하지 않고 제외했습니다."
)
REASON_OBSERVATION = "관측 누락·중복 또는 가격 확인 필요"
REASON_VOLUME = "첫날·마지막 날 거래량 미확인 또는 0"
REASON_BREAK = "전일 종가와 기준가격 차이 확인"
REASON_SHARES = "상장주식수 변경 확인"


def normalize_code(code):
    """Pad numeric codes that lost their leading zeros in the 1995–2000 files."""
    code = str(code).strip()
    return code.zfill(6) if code.isdigit() else code


def normalize_name(name):
    return re.sub(r"\s+", " ", str(name or "")).strip()


def is_common_stock(code, name):
    """Keep common shares only: preferred shares and subscription rights end in a non-zero character."""
    if not re.fullmatch(r"[0-9A-Z]{6}", code) or code[-1] != "0":
        return False
    if not name or "스팩" in name or name.endswith("리츠"):
        return False
    return True


def select_universe(rows, kospi=200, kosdaq=150):
    """Return {code: {name, market}} for the largest common stocks on the first trading day.

    `rows` yields (code, name, market, close, stocks). Market cap uses close × listed shares so the
    rule does not depend on the file's rounded Marcap column.
    """
    groups = {"KOSPI": [], "KOSDAQ": []}
    seen = set()
    for code, name, market, close, stocks in rows:
        code, name = normalize_code(code), normalize_name(name)
        if market not in MARKETS or not is_common_stock(code, name):
            continue
        if close is None or stocks is None or close <= 0 or stocks <= 0:
            continue
        if code in seen:
            raise ValueError(f"Duplicate code on the first trading day: {code}")
        seen.add(code)
        group = "KOSDAQ" if market in KOSDAQ_MARKETS else "KOSPI"
        groups[group].append((-(float(close) * int(stocks)), code, name, market))
    universe = {}
    for group, limit in (("KOSPI", kospi), ("KOSDAQ", kosdaq)):
        for _, code, name, market in sorted(groups[group])[:limit]:
            universe[code] = {"name": name, "market": market}
    return universe


def classify_history(observations, trading_days, first, last):
    """Return an exclusion reason or '' for one stock's (day, close, changes, stocks, volume) rows."""
    days = [row[0] for row in observations]
    if days != list(trading_days) or len(set(days)) != len(days):
        return REASON_OBSERVATION
    previous_close = previous_shares = None
    inactive = breaks = share_changes = False
    for day, close, changes, stocks, volume in observations:
        if close is None or close <= 0 or stocks is None or (day > first and changes is None):
            return REASON_OBSERVATION
        if day in (first, last) and (volume is None or volume <= 0):
            inactive = True
        if previous_close is not None and close - changes != previous_close:
            breaks = True
        if previous_shares is not None and stocks != previous_shares:
            share_changes = True
        previous_close, previous_shares = close, stocks
    if inactive:
        return REASON_VOLUME
    if breaks:
        return REASON_BREAK
    if share_changes:
        return REASON_SHARES
    return ""


def compute_returns(universe, histories, trading_days, first, last):
    """Split a universe into return records and exclusion counts."""
    items, exclusions, excluded = [], Counter(), []
    for code, member in sorted(universe.items()):
        observations = sorted(histories.get(code, []))
        reason = classify_history(observations, trading_days, first, last)
        if reason:
            exclusions[reason] += 1
            excluded.append(code)
            continue
        start, end = observations[0][1], observations[-1][1]
        items.append({
            "symbol": code, "name": member["name"], "market": member["market"],
            "returnPct": (end / start - 1) * 100,
            "firstDate": first.isoformat(), "lastDate": last.isoformat(),
            "sourceUrl": PRICE_SOURCE,
        })
    return items, exclusions, excluded


def rank_items(items, top=10):
    return [public_item(item) for item in sorted(items, key=lambda item: (-item["returnPct"], item["symbol"]))[:top]]


def public_item(item):
    return {key: value for key, value in item.items() if key != "market"}


def eligible_by_market(items):
    counts = {"KOSPI": 0, "KOSDAQ": 0}
    for item in items:
        counts["KOSDAQ" if item.get("market") in KOSDAQ_MARKETS else "KOSPI"] += 1
    return counts


def annual_selection(items):
    ranked = rank_items(items, top=len(items))
    return {
        "winner": ranked[0],
        "loser": min(ranked, key=lambda item: (item["returnPct"], item["symbol"])),
        "tenbaggers": [item for item in ranked if item["returnPct"] >= 900],
    }


def build_ranking(universe, items, exclusions, excluded, *, kosdaq_available, trading_day_sources, annual=False):
    if len(items) < 10:
        return None
    universe_label = (
        "KOSPI 시가총액 상위 200 · KOSDAQ 시가총액 상위 150" if kosdaq_available
        else "KOSPI 시가총액 상위 200 (코스닥 시세 없음)"
    )
    result = {
        "universe": universe_label,
        "universeRule": UNIVERSE_RULE if kosdaq_available else UNIVERSE_RULE_KOSPI_ONLY,
        "membership": "approximate",
        "membershipSourceUrl": PRICE_SOURCE,
        "membershipSourceUrls": [PRICE_SOURCE],
        "universeCount": len(universe),
        "eligibleCount": len(items),
        "eligibleByMarket": eligible_by_market(items),
        "exclusions": dict(sorted(exclusions.items())),
        "excludedSymbols": sorted(excluded),
        "priceMethod": PRICE_METHOD,
        "tradingDaySources": list(dict.fromkeys(trading_day_sources)),
        "decisionDate": DECISION_DATE,
    }
    if annual:
        result.update(annual_selection(items))
    else:
        result["items"] = rank_items(items)
    return result


class MarcapReader:
    def __init__(self, connection, path):
        self.connection = connection
        self.connection.execute("DROP TABLE IF EXISTS year_rows")
        self.connection.execute("""
            CREATE TEMP TABLE year_rows AS
            SELECT CAST(Date AS DATE) AS day, lpad(Code, 6, '0') AS code, Name, Market,
                   Close, Changes, Stocks, Volume
            FROM read_parquet(?) WHERE Market IN ('KOSPI', 'KOSDAQ', 'KOSDAQ GLOBAL')
        """, [str(path)])

    def trading_days(self, first, last):
        rows = self.connection.execute(
            "SELECT DISTINCT day FROM year_rows WHERE day BETWEEN ? AND ? ORDER BY day", [first, last]).fetchall()
        return [row[0] for row in rows]

    def first_day_rows(self, day):
        return self.connection.execute(
            "SELECT code, Name, Market, Close, Stocks FROM year_rows WHERE day = ?", [day]).fetchall()

    def histories(self, codes, first, last):
        rows = self.connection.execute("""
            SELECT code, day, Close, Changes, Stocks, Volume FROM year_rows
            WHERE day BETWEEN ? AND ? AND code IN (SELECT unnest(?)) ORDER BY code, day
        """, [first, last, list(codes)]).fetchall()
        histories = {}
        for code, day, close, changes, stocks, volume in rows:
            histories.setdefault(code, []).append((day, close, changes, stocks, volume))
        return histories


def rank_period(reader, first, last, sources, annual=False):
    """Return (ranking or None, skip reason)."""
    days = reader.trading_days(first, last)
    if not days or days[0] != first or days[-1] != last:
        return None, "시세 파일에 경계 거래일 없음"
    first_rows = reader.first_day_rows(first)
    kosdaq_available = any(row[2] in KOSDAQ_MARKETS for row in first_rows)
    universe = select_universe(first_rows)
    if len(universe) < 10:
        return None, "모집단 10개 미만"
    histories = reader.histories(universe, first, last)
    items, exclusions, excluded = compute_returns(universe, histories, days, first, last)
    ranking = build_ranking(universe, items, exclusions, excluded, kosdaq_available=kosdaq_available,
                            trading_day_sources=sources, annual=annual)
    return ranking, "" if ranking else "계산 가능 종목 10개 미만"


def write_json(destination, payload):
    destination.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile("w", encoding="utf-8", dir=destination.parent, delete=False) as target:
        path = Path(target.name)
        json.dump(payload, target, ensure_ascii=False, sort_keys=True, indent=2)
        target.write("\n")
    try:
        path.replace(destination)
    finally:
        path.unlink(missing_ok=True)


def load_verified(path):
    return json.loads(path.read_text(encoding="utf-8")) if path else {}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parquet", type=Path, nargs="+", help="Locally downloaded annual marcap Parquet files")
    parser.add_argument("--calendar", type=Path, default=Path("data/market/korea-index-closes.json"))
    parser.add_argument("--out", type=Path, default=Path("data/market/months/kr-equity-rankings.json"))
    parser.add_argument("--annual-out", type=Path, default=Path("data/market/kr-annual-equity-rankings.json"))
    parser.add_argument("--verified", type=Path, help="Verified monthly rankings kept verbatim (e.g. 2024 ETF-holdings months)")
    parser.add_argument("--verified-annual", type=Path, help="Verified annual rankings kept verbatim")
    parser.add_argument("--report", type=Path, help="Write the coverage summary JSON here as well as printing it")
    args = parser.parse_args()
    try:
        import duckdb
    except ImportError:
        parser.error("Install the duckdb Python package to read Parquet files.")

    calendar = json.loads(args.calendar.read_text(encoding="utf-8"))["monthly"]
    files = {}
    for path in args.parquet:
        match = re.search(r"(19|20)\d\d", path.name)
        if not match:
            parser.error(f"Cannot infer the year from {path.name}")
        files[int(match.group())] = path
    monthly = {period: rankings for period, rankings in load_verified(args.verified).items() if "KR" in rankings}
    annual = {year: rankings for year, rankings in load_verified(args.verified_annual).items() if "KR" in rankings}
    skipped = {}
    with duckdb.connect() as connection:
        for year, path in sorted(files.items()):
            reader = MarcapReader(connection, path)
            for month in range(1, 13):
                period = f"{year}-{month:02}"
                entry = calendar.get(period)
                if period in monthly:
                    continue
                if not entry:
                    skipped[period] = "검증된 거래일 달력 없음"
                    continue
                first, last = date.fromisoformat(entry["firstDate"]), date.fromisoformat(entry["lastDate"])
                sources = [entry.get("firstSource"), entry.get("lastSource")]
                ranking, reason = rank_period(reader, first, last, [url for url in sources if url])
                if ranking:
                    monthly[period] = {"KR": ranking}
                else:
                    skipped[period] = reason
            key = str(year)
            opening, closing = calendar.get(f"{year}-01"), calendar.get(f"{year}-12")
            if key in annual or not (opening and closing):
                continue
            first, last = date.fromisoformat(opening["firstDate"]), date.fromisoformat(closing["lastDate"])
            sources = [opening.get("firstSource"), closing.get("lastSource")]
            ranking, reason = rank_period(reader, first, last, [url for url in sources if url], annual=True)
            if ranking:
                annual[key] = {"KR": ranking}
            else:
                skipped[key] = reason
    write_json(args.out, dict(sorted(monthly.items())))
    write_json(args.annual_out, dict(sorted(annual.items())))
    by_year = Counter(period[:4] for period in monthly)
    summary = {
        "months": len(monthly), "monthsByYear": dict(sorted(by_year.items())),
        "years": sorted(annual), "skipped": dict(sorted(skipped.items())),
        "eligibleRange": [min(r["KR"]["eligibleCount"] for r in monthly.values()), max(r["KR"]["eligibleCount"] for r in monthly.values())] if monthly else None,
    }
    text = json.dumps(summary, ensure_ascii=False, indent=2)
    if args.report:
        args.report.write_text(text + "\n", encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()

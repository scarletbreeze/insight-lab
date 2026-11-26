"""Explain why ETF holdings were excluded from a local Korean price ranking.

The ranking script excludes a stock when its listed share count changed, when a
boundary day had no volume, or when a day's reference price broke from the
previous close. This script matches each share-count change in the local price
file against the KRX KIND "주식발행내역" (listed share issue history) table,
which records the listing date, the number of shares and the stated reason
(유상증자, 주식소각, 주식매수선택권행사, 전환사채 전환, 합병 ...). The KIND
pages must be saved locally first; see `parse_kind_pages`. Disclosure documents
(DART URLs) and company-name aliases are supplied as JSON. The output is a
research file with per-stock facts and no return figures; `--publish` writes the
publishable per-reason summary into the site data file.
"""

import argparse
import json
import re
from datetime import date, timedelta
from html import unescape
from html.parser import HTMLParser
from itertools import combinations
from pathlib import Path

from rank_kodex_price_research import FUNDS, TIGER_FUNDS, check_prices, read_holdings, read_tiger_holdings

KIND_ISSUE_LIST = "https://kind.krx.co.kr/corpgeneral/stockissuelist.do?method=loadInitPage"
DART_SEARCH = "https://dart.fss.or.kr/dsab007/main.do"
# Reasons KIND prints for listed share changes, mapped to the published category.
ACTION_CATEGORIES = (
    ("소각", "주식소각"),
    ("무상증자", "무상증자"),
    ("주식분할", "주식분할"),
    ("액면분할", "주식분할"),
    ("주식병합", "주식병합"),
    ("액면병합", "주식병합"),
    ("감자", "감자"),
    ("주식매수선택권", "주식매수선택권 행사"),
    ("전환사채", "전환사채 전환"),
    ("CB전환", "전환사채 전환"),
    ("신주인수권", "신주인수권 행사"),
    ("교환사채", "교환사채 교환"),
    ("우선주", "우선주 전환"),
    ("전환", "전환사채 전환"),
    ("합병", "합병 신주"),
    ("분할", "회사분할"),
    ("유상증자", "유상증자"),
    ("주식배당", "주식배당"),
    ("주식교환", "주식교환"),
)
# Categories that re-base the per-share price (a 권리락 or 기준가격 변경 follows).
# 유상증자 re-bases only for 구주주배정, which is read from the KIND reason text.
PRICE_REBASING = {"무상증자", "주식분할", "주식병합", "감자", "주식배당", "회사분할"}
REBASING_REASON_TEXT = ("구주주배정",)
DATE_TOLERANCE_DAYS = 3  # calendar days between the price-file change and the KIND listing date
MAX_SUBSET_ROWS = 3  # same-day KIND rows that may be combined to explain one change
REBASE_WINDOW_DAYS = 80  # a 권리락 price gap precedes the new-share listing by up to this many days

REASON_SHARES = "상장주식수 변경 확인"
REASON_VOLUME = "첫날·마지막 날 거래량 미확인 또는 0"
REASON_BREAK = "전일 종가와 기준가격 차이 확인"
STATUS_UNRESOLVED = "자료 확인 중"
STATUS_PARTIAL = "주식수 변동은 확인, 기준가격 차이 원인은 자료 확인 중"
UNEXPLAINED = {STATUS_UNRESOLVED, STATUS_PARTIAL}


class IssueTable(HTMLParser):
    """Collect the rows of a saved KIND 주식발행내역 result page."""

    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag == "td" and self.row is not None:
            self.cell = []

    def handle_data(self, text):
        if self.cell is not None:
            self.cell.append(text)

    def handle_endtag(self, tag):
        if tag == "td" and self.cell is not None:
            self.row.append(re.sub(r"\s+", " ", unescape("".join(self.cell))).strip())
            self.cell = None
        elif tag == "tr" and self.row is not None:
            if len(self.row) == 6:
                self.rows.append(self.row)
            self.row = None


def parse_kind_pages(directory):
    """Parse saved result pages of the KIND listed share issue history.

    Save each page of https://kind.krx.co.kr/corpgeneral/stockissuelist.do
    (method=searchStockIssueList, 100 rows per page) as HTML in `directory`.
    Rows have 법인명, 일자, 상장구분, 변동주식수, 액면가, 사유. Duplicate rows from
    repeated pages are dropped.
    """
    seen, rows = set(), []
    for path in sorted(Path(directory).glob("*.html")):
        table = IssueTable()
        table.feed(path.read_text(encoding="utf-8", errors="replace"))
        table.close()
        for name, day, listing_type, shares, par, reason in table.rows:
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
                continue
            row = (name, day, listing_type, int(shares.replace(",", "")), par, reason)
            if row not in seen:
                seen.add(row)
                rows.append({"name": name, "date": day, "listingType": listing_type,
                             "shares": row[3], "par": par, "reason": reason})
    if not rows:
        raise ValueError("No KIND issue rows were found.")
    return rows


def categorize(reason):
    for keyword, category in ACTION_CATEGORIES:
        if keyword in reason:
            return category
    return "기타"


def rebases_price(reasons):
    return any(categorize(reason) in PRICE_REBASING or any(text in reason for text in REBASING_REASON_TEXT)
               for reason in reasons)


def share_events(connection, path, symbols, first, last):
    """Return share-count changes, boundary zero-volume days and price breaks per symbol."""
    rows = connection.execute("""
        WITH history AS (
            SELECT CAST("Date" AS DATE) AS trade_day, Code, Name, Close, Changes, Stocks, Volume,
                   lag(Stocks) OVER series AS previous_shares, lag(Close) OVER series AS previous_close
            FROM read_parquet(?)
            WHERE CAST("Date" AS DATE) BETWEEN ? AND ? AND Code IN (SELECT unnest(?))
              AND Market IN ('KOSPI', 'KOSDAQ', 'KOSDAQ GLOBAL')
            WINDOW series AS (PARTITION BY Code ORDER BY CAST("Date" AS DATE))
        )
        SELECT Code, Name, trade_day, Stocks, previous_shares, Volume,
               trade_day > ? AND Close - Changes <> previous_close AS price_break
        FROM history
        WHERE Stocks <> previous_shares OR (trade_day IN (?, ?) AND coalesce(Volume, 0) <= 0)
           OR (trade_day > ? AND Close - Changes <> previous_close)
        ORDER BY Code, trade_day
    """, [str(path), first, last, list(symbols), first, first, last, first]).fetchall()
    events = {}
    for code, name, day, shares, previous, volume, price_break in rows:
        entry = events.setdefault(code, {"name": name, "shareChanges": [], "zeroVolumeDays": [], "priceBreakDays": []})
        if previous is not None and shares != previous:
            entry["shareChanges"].append({"date": day.isoformat(), "before": int(previous), "after": int(shares)})
        if day in (first, last) and (volume or 0) <= 0:
            entry["zeroVolumeDays"].append(day.isoformat())
        if price_break:
            entry["priceBreakDays"].append(day.isoformat())
    return events


def price_file_names(connection, path, symbols, first, last):
    """Names the price file used for each code during the period (renames become aliases)."""
    rows = connection.execute("""
        SELECT Code, list(DISTINCT Name) FROM read_parquet(?)
        WHERE CAST("Date" AS DATE) BETWEEN ? AND ? AND Code IN (SELECT unnest(?)) GROUP BY Code
    """, [str(path), first, last, list(symbols)]).fetchall()
    return {code: sorted(names) for code, names in rows}


def explaining_rows(rows, delta):
    """Rows of one company and day whose shares sum to the delta: all, one, or a small subset."""
    if sum(row["shares"] for row in rows) == delta:
        return list(rows)
    for size in range(1, min(MAX_SUBSET_ROWS, len(rows)) + 1):
        for subset in combinations(rows, size):
            if sum(row["shares"] for row in subset) == delta:
                return list(subset)
    return []


def match_actions(events, kind_rows, aliases=None):
    """Attach the KIND rows whose listing date and share total explain each observed change.

    A KIND row is accepted only for the same company name or a name listed in
    `aliases` for that code (renames and 법인명/종목명 differences verified against
    DART). Same-day rows are summed or combined (up to MAX_SUBSET_ROWS). When no
    same-day match exists, a match within DATE_TOLERANCE_DAYS calendar days is
    accepted and the KIND listing date is recorded as `kindDate`.
    """
    aliases = aliases or {}
    by_day = {}
    for row in kind_rows:
        by_day.setdefault((row["name"], row["date"]), []).append(row)

    def describe(rows, change, listed):
        reasons = sorted({row["reason"] for row in rows})
        categories = sorted({categorize(reason) for reason in reasons})
        change.update(action=" · ".join(categories), kindReason=" · ".join(reasons), kindName=rows[0]["name"],
                      listingType=" · ".join(sorted({row["listingType"] for row in rows})),
                      priceRebasing=rebases_price(reasons))
        if listed != change["date"]:
            change["kindDate"] = listed

    for code, entry in events.items():
        names = {entry["name"], *aliases.get(code, [])}
        for change in entry["shareChanges"]:
            delta = change["after"] - change["before"]
            day = date.fromisoformat(change["date"])
            candidates = []
            for name in names:
                for offset in range(-DATE_TOLERANCE_DAYS, DATE_TOLERANCE_DAYS + 1):
                    listed = (day + timedelta(days=offset)).isoformat()
                    rows = explaining_rows(by_day.get((name, listed), []), delta)
                    if rows:
                        candidates.append((abs(offset), listed, rows))
            if candidates:
                _, listed, rows = min(candidates, key=lambda item: item[0])
                describe(rows, change, listed)
            else:
                change.update(action=STATUS_UNRESOLVED)
    return events


def status_for(reason, changes, documents, zero_days, break_days):
    """Decide whether the stated exclusion reason is explained by a sourced fact.

    Only statuses outside UNEXPLAINED count as documented: a matched share change
    does not by itself explain a reference-price gap or a missing observation.
    """
    matched = [change for change in changes if change.get("kindReason")]
    complete = bool(changes) and len(matched) == len(changes)
    if reason == REASON_SHARES:
        if complete:
            return "KIND 발행내역 일치 · 권리락 조정 필요" if any(c["priceRebasing"] for c in matched) else "KIND 발행내역 일치 · 기준가 조정 없음"
        return "DART 공시 확인 · KIND 일부 불일치" if documents else STATUS_UNRESOLVED
    if reason == REASON_VOLUME:
        return "거래정지 공시 확인" if documents else STATUS_UNRESOLVED
    if reason == REASON_BREAK:
        for change in matched:
            if change["priceRebasing"]:
                listed = date.fromisoformat(change.get("kindDate", change["date"]))
                if any(0 <= (listed - date.fromisoformat(day)).days <= REBASE_WINDOW_DAYS for day in break_days):
                    return "권리락 추정 · KIND 상장일 기준(권리락일 미확인)"
        if documents:
            return "DART 공시 확인"
        return STATUS_PARTIAL if matched else STATUS_UNRESOLVED
    return "DART 공시 확인" if documents else STATUS_UNRESOLVED


def classify(holdings, prices, events, documents=None):
    documents = documents or {}
    stocks = []
    for symbol, name in holdings.items():
        start, end, reason = prices.get(symbol, (None, None, "거래일 가격 자료 없음"))
        if not reason:
            continue
        entry = events.get(symbol, {"name": name, "shareChanges": [], "zeroVolumeDays": [], "priceBreakDays": []})
        papers = documents.get(symbol, [])
        status = status_for(reason, entry["shareChanges"], papers, entry["zeroVolumeDays"], entry["priceBreakDays"])
        stocks.append({"symbol": symbol, "name": name, "exclusionReason": reason, "status": status,
                       "documented": status not in UNEXPLAINED, "shareChanges": entry["shareChanges"],
                       "zeroVolumeDays": entry["zeroVolumeDays"], "priceBreakDays": entry["priceBreakDays"],
                       "documents": papers})
    return stocks


def summarize(result):
    """Reduce the research file to publishable facts: statuses per reason, actions, no price figures."""
    by_reason, action_counts, stocks = {}, {}, []
    for stock in result["stocks"]:
        reason = by_reason.setdefault(stock["exclusionReason"], {"count": 0, "documented": 0, "statuses": {}})
        reason["count"] += 1
        reason["documented"] += stock["documented"]
        reason["statuses"][stock["status"]] = reason["statuses"].get(stock["status"], 0) + 1
        groups = {}
        for change in stock["shareChanges"]:
            group = groups.setdefault(change["action"], {"action": change["action"], "dates": [], "shares": [], "priceRebasing": False})
            group["dates"].append(change.get("kindDate", change["date"]))
            group["shares"].append(change["after"] - change["before"])
            if change.get("kindReason"):
                group.update(kindReason=change["kindReason"], priceRebasing=change["priceRebasing"])
                if change["kindName"] != stock["name"]:
                    group["kindName"] = change["kindName"]
        for label in sorted({part for action in groups for part in action.split(" · ")}):
            action_counts[label] = action_counts.get(label, 0) + 1
        row = {"symbol": stock["symbol"], "name": stock["name"], "exclusionReason": stock["exclusionReason"],
               "status": stock["status"], "documented": stock["documented"], "actions": list(groups.values())}
        for key in ("zeroVolumeDays", "priceBreakDays", "documents"):
            if stock[key]:
                row[key] = stock[key]
        stocks.append(row)
    for reason in by_reason.values():
        reason["statuses"] = dict(sorted(reason["statuses"].items()))
    return {"firstDate": result["firstDate"], "lastDate": result["lastDate"], "universe": result["universe"],
            "provider": result["provider"], "holdingsSources": result["holdingsSources"],
            "universeCount": result["universeCount"], "excludedCount": result["excludedCount"],
            "documentedCount": sum(stock["documented"] for stock in result["stocks"]),
            "exclusions": {reason: data["count"] for reason, data in sorted(by_reason.items())},
            "byReason": dict(sorted(by_reason.items())), "actionCounts": dict(sorted(action_counts.items())),
            "stocks": stocks}


METHOD = {
    "kindSource": KIND_ISSUE_LIST,
    "kindSourceTitle": "KIND 주식발행내역(추가상장·변경상장)",
    "kindHint": "KIND 주식발행내역에서 조회 기간을 상장일로, 회사명에 KIND 법인명을 넣으면 해당 행이 나온다.",
    "dartSource": DART_SEARCH,
    "localBasis": "제외 사유, 거래량 0인 날, 기준가격 차이가 난 날은 KRX 일별 시세(marcap 사본) 기준의 로컬 검증 결과이며 날짜만 공개한다.",
    "description": "로컬 시세 파일에서 관측한 상장주식수 변동일·변동 주식수를 KIND 주식발행내역의 같은 회사(DART로 확인한 법인명·구명 포함)·같은 날짜(±3일, 달력 기준) 행과 대조해 사유를 옮겼다. 같은 날의 여러 행은 합산하거나 최대 3행을 조합한다. 일치하는 행이 없으면 자료 확인 중으로 둔다. 거래량 0 종목은 DART에 게시된 거래소 매매거래정지 공시로, 기준가격 차이는 차이가 난 날로부터 80일 안에 상장된 권리락 발생 행동(무상증자·주식분할·주식배당·회사분할·구주주배정 유상증자)으로 확인한다.",
    "priceRebasingActions": ["무상증자", "주식분할", "주식배당", "회사분할", "유상증자(구주주배정)"],
    "note": "주식소각·주식매수선택권 행사·전환사채 전환·우선주 전환·제3자배정 유상증자·합병 신주처럼 기준가격 변경이 없는 변동은 첫날·마지막 날 종가를 그대로 비교할 수 있다. 권리락이 생기는 행동은 권리락일이 상장일보다 앞서며 기간 시작 전에 권리락이 지난 경우도 있어 수정 종가가 필요하다.",
}


def publish(path, period, summary, collected_at):
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    data["method"] = {**METHOD, "collectedAt": collected_at}
    data.setdefault("periods", {})[period] = summary
    data["periods"] = dict(sorted(data["periods"].items()))
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parquet", type=Path)
    parser.add_argument("holdings200", type=Path)
    parser.add_argument("holdings150", type=Path)
    parser.add_argument("--first", required=True, type=date.fromisoformat)
    parser.add_argument("--last", required=True, type=date.fromisoformat)
    parser.add_argument("--provider", choices=["kodex", "tiger"], default="kodex")
    parser.add_argument("--kind-pages", required=True, type=Path, help="Directory of saved KIND 주식발행내역 pages.")
    parser.add_argument("--aliases", type=Path, help="data/market/kr-company-aliases.json (DART-verified company names per code).")
    parser.add_argument("--documents", type=Path, help="data/market/kr-exclusion-documents.json (DART documents per period and code).")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--publish", type=Path, help="Site data file to update with the publishable summary.")
    parser.add_argument("--collected-at", default=date.today().isoformat())
    args = parser.parse_args()
    try:
        import duckdb
    except ImportError:
        parser.error("Install duckdb to read the local Parquet file.")
    period = f"{args.first:%Y-%m}" if (args.first.year, args.first.month) == (args.last.year, args.last.month) else str(args.first.year)
    paths = (args.holdings200, args.holdings150)
    holdings = read_tiger_holdings(paths, args.first) if args.provider == "tiger" else read_holdings(paths, args.first)
    kind_rows = parse_kind_pages(args.kind_pages)
    aliases, documents = {}, {}
    if args.aliases:  # data/market/kr-company-aliases.json: {"companies": {symbol: {"names": [...]}}}
        companies = json.loads(args.aliases.read_text(encoding="utf-8"))
        aliases = {code: entry["names"] for code, entry in companies.get("companies", companies).items()}
    if args.documents:  # data/market/kr-exclusion-documents.json: {"periods": {period: {symbol: [{title, date, url}]}}}
        papers = json.loads(args.documents.read_text(encoding="utf-8"))
        documents = papers.get("periods", papers).get(period, {})
    with duckdb.connect() as db:
        prices = check_prices(db, args.parquet, holdings, args.first, args.last)
        events = share_events(db, args.parquet, holdings, args.first, args.last)
        for code, names in price_file_names(db, args.parquet, holdings, args.first, args.last).items():
            aliases[code] = sorted({*aliases.get(code, []), *names})
    stocks = classify(holdings, prices, match_actions(events, kind_rows, aliases), documents)
    if args.provider == "tiger":
        from collect_tiger_holdings import source_url
        funds, sources = TIGER_FUNDS, [source_url(fund, args.first, table=True) for fund in TIGER_FUNDS]
    else:
        funds = FUNDS
        sources = [f"https://www.samsungfund.com/api/v1/kodex/product-pdf/{fund}.do?gijunYMD={args.first:%Y.%m.%d}" for fund in FUNDS]
    result = {"firstDate": args.first.isoformat(), "lastDate": args.last.isoformat(), "universe": " · ".join(funds.values()) + " 보유 주식",
              "provider": "TIGER" if args.provider == "tiger" else "KODEX", "holdingsSources": sources,
              "universeCount": len(holdings), "excludedCount": len(stocks), "kindSource": KIND_ISSUE_LIST, "stocks": stocks}
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    summary = summarize(result)
    if args.publish:
        publish(args.publish, period, summary, args.collected_at)
    print(json.dumps({"period": period, "excluded": summary["excludedCount"], "documented": summary["documentedCount"],
                      "byReason": summary["byReason"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()

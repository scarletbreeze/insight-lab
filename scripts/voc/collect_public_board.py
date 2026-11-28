"""Count public Kiwoom customer threads without retaining raw board responses."""

import argparse
import hashlib
import json
import re
import time
import tempfile
from collections import Counter
from datetime import date
from html import unescape
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SOURCE = "https://bbn.kiwoom.com/bbs/VBbsBoardBWCSZView"
LIST_URL = "https://bbn.kiwoom.com/bbs/SBbsBoardBWCSZListAjax"
CATEGORIES = {"a": "문의", "b": "제안", "c": "칭찬·불만"}
TOPIC_TERMS = {
    "orders": r"주문|체결(?!량)|시장가|지정가|호가|스[탑톱]로스|자동\s*매[수도]|매도됨",
    "account": r"계좌\s*(개설|폐쇄|해지|등록)|비대면|휴면계좌|계좌번호|(?:계좌\s*)?거래\s*내역|상속|계좌\s*(?:관리|삭제)",
    "hts": r"HTS|MTS|영웅문|조건\s*(?:검색|식)|신호\s*검색|검색식|수식|시세\s*알림|\[\d{4}\]|(?<!\d)\d{4}\s*(?:화면|창)|화면\s*툴바|스토캐스틱|일목균형표|(?:분|일|주|월)봉|[차챠]트|\bDDE\b|화면번호|관심종목|시세\s*감시|공유\s*그룹|순간\s*체결량",
    "auth": r"인증서|본인인증|간편인증|고객\s*확인(?:\s*\([^)]*\))?\s*(?:재\s*)?(?:등록|수행)|로그인|OTP|생체인증|비밀번호\s*저장",
    "overseas": r"해외\s*주식|미국\s*주식|환전|해외\s*소수점",
    "hours": r"(?:거래|개장|폐장)\s*시간|정규장|애프터\s*마켓|프리\s*마켓|주식\s*선물|선물옵션|선물\s*거래|파생상품",
    "credit": r"신용\s*(거래|융자|한도|잔고)|펀드\s*(?:담보\s*)?대출|대주\s*매도|미수금|미수\s*이자|미수\s*(거래|동결)|반대매매|(?:매도\s*대금|주식)\s*담보\s*대출",
    "fees": r"수수료|제비용|거래세|양도(?:소득)?세|매도\s*시\s*세금",
    "transfer": r"입출금|입금|출금|이체|대체출고|대체입고",
    "products": r"연금\s*저축|중개형\s*ISA|외화\s*RP|ETF|ETN|ELS|채권|펀드|공모주|비과세\s*종합\s*저축|국공채|국채",
}
TOPIC_PATTERNS = {key: re.compile(value, re.IGNORECASE) for key, value in TOPIC_TERMS.items()}


def classify_topic(row):
    title = unescape(re.sub(r"<[^>]*>", " ", row.get("ttl") or ""))
    body = unescape(re.sub(r"<[^>]*>", " ", row.get("dtlCntn") or ""))
    title_topics = [key for key, pattern in TOPIC_PATTERNS.items() if pattern.search(title)]
    # A platform name alone describes the channel of a transfer request.
    if set(title_topics) == {"hts", "transfer"} and not TOPIC_PATTERNS["hts"].search(
        re.sub(r"영웅문(?:4|S\+?)?|HTS|MTS", "", title, flags=re.IGNORECASE)
    ):
        return "transfer"
    if title_topics:
        return title_topics[0] if len(title_topics) == 1 else "ambiguous"
    body_topics = [key for key, pattern in TOPIC_PATTERNS.items() if pattern.search(body)]
    if len(body_topics) > 1:
        return "ambiguous"
    return body_topics[0] if body_topics else "unclassified"


def fetch_page(page, cursor, page_size):
    params = {
        "pageNo": page, "pageSize": page_size, "custId": "", "divTp1": "", "divTp2": "",
        "f_keyField": "", "f_key": "", "searchTp": 1, "pagePerBlock": 10, **cursor,
    }
    request = Request(LIST_URL, data=urlencode(params).encode(), headers={
        "Referer": SOURCE, "X-Requested-With": "XMLHttpRequest",
    })
    with urlopen(request, timeout=20) as response:
        return json.load(response)["boardList"]


def fetch_with_retry(page, cursor, page_size):
    for attempt in range(3):
        try:
            return fetch_page(page, cursor, page_size)
        except HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
            retry_after = error.headers.get("Retry-After", "")
            if retry_after and (not retry_after.isdecimal() or int(retry_after) > 60):
                raise
            time.sleep(max(2 ** (attempt + 1), int(retry_after or 0)))
        except (URLError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 ** (attempt + 1))


def write_checkpoint(path, state):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False, encoding="utf-8") as temp:
        json.dump(state, temp, ensure_ascii=False, separators=(",", ":"))
        name = temp.name
    Path(name).replace(path)


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


SCREEN_REFERENCE = re.compile(r"\[\s*(\d{4})\s*\]|화면\s*(?:번호)?\s*[:#]?\s*(\d{4})(?!\d)|(?<!\d)(\d{4})\s*(?:번\s*)?화면")


def collect(first, last, limit, page_size, classify=False, include_daily=False, on_inquiry=None, checkpoint=None,
            screen_numbers=None):
    cursor = {"prevPageNo": "", "maxGrpStep": "", "minGrpStep": ""}
    known_pages = set()
    customers = {}
    oldest = newest = None
    pages = 0
    stop = "page-limit"
    previous_oldest = None
    settings = [str(first), str(last), page_size, classify, include_daily, digest(json.dumps([CATEGORIES, TOPIC_TERMS, "platform-transfer-v1"], sort_keys=True))]
    mentions = {}
    if screen_numbers is not None:
        settings.append(digest(json.dumps([SCREEN_REFERENCE.pattern, sorted(screen_numbers)])))
    if checkpoint and on_inquiry:
        raise ValueError("A callback must manage its own progress.")
    if checkpoint and checkpoint.exists():
        state = json.loads(checkpoint.read_text(encoding="utf-8"))
        if state["settings"] != settings:
            raise ValueError("Checkpoint dates, page size or classification rules differ.")
        cursor, pages = state["cursor"], state["pages"]
        if screen_numbers is not None:
            mentions = state["mentions"]
        oldest, newest, previous_oldest = [date.fromisoformat(v) if v else None for v in state["bounds"]]
        known_pages = set(state["seen"])
        customers = {key: (date.fromisoformat(d), category, topic) for key, (d, category, topic) in state["customers"].items()}
    for page in range(pages + 1, limit + 1):
        if page > 1:
            time.sleep(0.25)
        try:
            rows = fetch_with_retry(page, cursor, page_size)
        except (URLError, TimeoutError):
            stop = "request-failed"
            break
        if not rows:
            stop = "end-of-list"
            break
        entries = [row for row in rows if row["step"] > 0]
        signature = digest(json.dumps(sorted(row["seqid"] for row in entries)))
        if not entries or signature in known_pages:
            stop = "missing-or-repeated-page"
            break
        customer_rows = []
        for row in entries:
            if row["pareSeqid"] == 0 and row["mngrYn"] == "N":
                posted = date.fromisoformat(row["makeTime"][:10].replace(".", "-"))
                topic = classify_topic(row) if classify and first <= posted <= last and row["divTp2"] == "a" else None
                customer_rows.append((row, posted, CATEGORIES.get(row["divTp2"], "분류 확인 중"), topic))
        dates = [posted for _, posted, _, _ in customer_rows]
        if dates:
            page_newest, page_oldest = max(dates), min(dates)
            if previous_oldest and page_newest > previous_oldest:
                stop = "page-order-changed"
                break
            previous_oldest = page_oldest
            oldest = min(oldest or page_oldest, page_oldest)
            newest = max(newest or page_newest, page_newest)
        known_pages.add(signature)
        pages += 1
        for row, posted, category, topic in customer_rows:
            if first <= posted <= last:
                identifier = digest(str(row["seqid"]))
                if row["divTp2"] == "a" and identifier not in customers:
                    if on_inquiry:
                        on_inquiry(posted, row)
                    if screen_numbers is not None:
                        title = unescape(re.sub(r"<[^>]*>", " ", row.get("ttl") or ""))
                        codes = {next(code for code in match if code) for match in SCREEN_REFERENCE.findall(title)}
                        matched = sorted(codes & screen_numbers)
                        if matched:
                            mentions[identifier] = matched
                record = (posted, category, topic)
                if customers.setdefault(identifier, record) != record:
                    raise ValueError("A repeated customer thread changed date or category.")
        if page % 100 == 0:
            print(f"Public board: {page} pages, oldest {oldest}.", flush=True)
        if dates and max(dates) < first:
            stop = "reached-older-posts"
            break
        marker = next((row for row in entries if row.get("maxGrpStep") and row.get("minGrpStep")), None)
        if not marker:
            stop = "missing-cursor"
            break
        cursor = {"prevPageNo": page, "maxGrpStep": marker["maxGrpStep"], "minGrpStep": marker["minGrpStep"]}

        if checkpoint and (page % 25 == 0 or page == limit):
            write_checkpoint(checkpoint, {
                "settings": settings, "cursor": cursor, "pages": pages, "seen": list(known_pages),
                "bounds": [v.isoformat() if v else None for v in (oldest, newest, previous_oldest)],
                **({"mentions": mentions} if screen_numbers is not None else {}),
                "customers": {key: [d.isoformat(), category, topic] for key, (d, category, topic) in customers.items()},
            })

    counts = {}
    topic_counts = {}
    daily_counts = {}
    daily_inquiries = Counter()
    for posted, category, topic in customers.values():
        counts.setdefault(posted.year, Counter())[category] += 1
        if include_daily and category == "문의":
            daily_inquiries[posted.isoformat()] += 1
        if topic is not None:
            topic_counts.setdefault(posted.year, Counter())[topic] += 1
            if include_daily and topic in TOPIC_PATTERNS:
                daily_counts.setdefault(posted.isoformat(), Counter())[topic] += 1
    return {
        "sourceUrl": SOURCE, "start": str(first), "end": str(last), "pages": pages, "pageSize": page_size,
        "oldestObserved": str(oldest) if oldest else None,
        "newestObserved": str(newest) if newest else None, "stop": stop,
        "years": {year: {"total": sum(groups.values()), "categories": dict(groups)}
                  for year, groups in sorted(counts.items())},
        **({"catalogSize": len(screen_numbers), "matchedThreads": len(mentions),
            "screens": dict(sorted(Counter(code for codes in mentions.values() for code in codes).items()))}
           if screen_numbers is not None else {}),
        **({"topicCounts": {year: dict(groups) for year, groups in sorted(topic_counts.items())}} if classify else {}),
        **({"dailyTopics": dict(sorted(daily_counts.items())),
            "dailyInquiries": dict(sorted(daily_inquiries.items()))} if include_daily else {}),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--first", type=date.fromisoformat, default=date(2022, 1, 1))
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--max-pages", type=int, required=True)
    parser.add_argument("--page-size", type=int, choices=(20, 100), default=20)
    parser.add_argument("--checkpoint", type=Path, help="Local progress file for resuming an interrupted run")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--classify-topics", action="store_true")
    parser.add_argument("--daily-topics", action="store_true", help="Include daily topic counts for local notice analysis")
    args = parser.parse_args()
    if args.first > args.last or args.max_pages < 1:
        parser.error("Use ordered dates and at least one page.")
    if args.daily_topics and not args.classify_topics:
        parser.error("--daily-topics requires --classify-topics.")
    if args.checkpoint and args.checkpoint.resolve() == args.out.resolve():
        parser.error("--checkpoint and --out must use different files.")
    result = collect(args.first, args.last, args.max_pages, args.page_size, args.classify_topics, args.daily_topics, checkpoint=args.checkpoint)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Public board: {result['pages']} pages, {result['stop']}, oldest {result['oldestObserved']}.")


if __name__ == "__main__":
    main()

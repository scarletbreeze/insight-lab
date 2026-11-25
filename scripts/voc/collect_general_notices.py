"""Collect the public general-notice index with published dates, titles and source links."""

import argparse
import json
import time
from datetime import date
from html import unescape
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from collect_public_board import TOPIC_PATTERNS

LIST = "https://bbn.kiwoom.com/bbs/VBbsNoticeNWWNZView"
ENDPOINT = "https://bbn.kiwoom.com/bbs/SBbsNoticeNWWNZListAjax"
DETAIL = "https://bbn.kiwoom.com/bbs/VBbsNoticeNWWNZDetailView"


def collect(first, last, max_pages):
    records = {}
    oldest = None
    for page in range(1, max_pages + 1):
        form = urlencode({
            "pageNo": page, "divTp1": "", "f_keyField": "ttl", "f_key": "",
            "cd": 0, "sdate": "", "edate": "",
        })
        request = Request(ENDPOINT, data=form.encode(), headers={
            "Referer": LIST, "X-Requested-With": "XMLHttpRequest",
        })
        with urlopen(request, timeout=20) as response:
            rows = json.load(response)["noticeList"]
        dated_rows = [(row, date.fromisoformat(row["makeTime"].replace(".", "-"))) for row in rows]
        if [int(row["rnum"]) for row in rows] != list(range((page - 1) * 15 + 1, (page - 1) * 15 + len(rows) + 1)):
            raise ValueError(f"Unexpected row positions on page {page}.")
        dates = [posted for row, posted in dated_rows if str(row["topTp"]) != "1"]
        if not dates:
            raise ValueError(f"No dated non-pinned notices on page {page}.")
        if oldest and max(dates) > oldest:
            raise ValueError(f"Date order changed on page {page}.")
        oldest = min(dates)
        for row, posted in dated_rows:
            if not first <= posted <= last:
                continue
            seqid = int(row["seqid"])
            title = " ".join(unescape(row["ttl"]).split())
            topics = [topic for topic, pattern in TOPIC_PATTERNS.items() if pattern.search(title)]
            entry = {
                "id": f"general-{seqid}",
                "date": str(posted),
                "dateType": "published",
                "title": title,
                "topic": topics[0] if len(topics) == 1 else "other",
                "category": "일반 공지",
                "summary": "",
                "channel": "키움증권 일반 공지",
                "sourceUrl": f"{DETAIL}?seqid={seqid}",
            }
            records.setdefault(seqid, entry)
        if page % 50 == 0:
            print(f"{page} pages, oldest {oldest}.", flush=True)
        if max(dates) < first:
            return {"sourceUrl": LIST, "start": str(first), "end": str(last), "pages": page,
                    "oldestObserved": str(oldest),
                    "notices": sorted(records.values(), key=lambda row: (row["date"], row["id"]), reverse=True)}
        time.sleep(0.25)
    raise ValueError(f"Page limit reached at {oldest} before crossing the requested start boundary.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--first", type=date.fromisoformat, required=True)
    parser.add_argument("--last", type=date.fromisoformat, required=True)
    parser.add_argument("--max-pages", type=int, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    if args.first > args.last or args.max_pages < 1:
        parser.error("Use ordered dates and at least one page.")
    result = collect(args.first, args.last, args.max_pages)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result['notices'])} general notices, {result['pages']} pages.")


if __name__ == "__main__":
    main()

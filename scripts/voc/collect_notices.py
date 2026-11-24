"""Index the publicly listed HTS notices without copying article bodies."""

import argparse
import json
import re
from html import unescape
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlsplit
from urllib.request import urlopen

SOURCE = "https://www.kiwoom.com/h/hts/popup/VHtsNoticeListPopView?gubun=1&mtsgb=&tp=H4"
ROW = re.compile(
    r'<a href="([^"]*VHtsNoticePopView[^"]*)"[^>]*>([^<]+)</a>\s*</td>\s*<td>(\d{4}\.\d{2}\.\d{2})</td>'
)
CLASSIFICATIONS = [
    (("사칭", "사기"), "auth", "보안·인증"),
    (("신용융자", "신용/대출", "담보대출"), "credit", "상품"),
    (("ETF", "ETN", "ETP"), "products", "상품"),
    (("파생", "장 운영시간", "매매시간", "선물옵션"), "hours", "제도"),
    (("금융소득", "등록"), "account", "서비스"),
    (("커뮤니티", "채팅방"), "hts", "서비스"),
]


def classify(title):
    for words, topic, category in CLASSIFICATIONS:
        if any(word in title for word in words):
            return topic, category
    return "other", "기타"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--html", type=Path, help="Previously saved public listing")
    parser.add_argument("--out", type=Path, default=Path("data/voc/notice-index.json"))
    args = parser.parse_args()
    if args.html:
        html = args.html.read_text(encoding="utf-8")
    else:
        with urlopen(SOURCE, timeout=15) as response:
            html = response.read().decode("utf-8")

    entries = {}
    for href, raw_title, date in ROW.findall(html):
        source_url = urljoin(SOURCE, unescape(href))
        parts = urlsplit(source_url)
        if parts.hostname != "www.kiwoom.com":
            continue
        notice_id = parse_qs(parts.query).get("seq", [""])[0]
        if not notice_id.isdecimal():
            continue
        title = " ".join(unescape(raw_title).split())
        topic, category = classify(title)
        entries[notice_id] = {
            "id": notice_id,
            "date": date.replace(".", "-"),
            "dateType": "published",
            "title": title,
            "topic": topic,
            "category": category,
            "summary": "",
            "sourceUrl": source_url,
        }
    if not entries:
        parser.error("No public notice rows found. Check the source before replacing the index.")
    sorted_entries = sorted(entries.values(), key=lambda item: (item["date"], item["id"]), reverse=True)
    args.out.write_text(json.dumps(sorted_entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(sorted_entries)} public notice rows indexed.")


if __name__ == "__main__":
    main()

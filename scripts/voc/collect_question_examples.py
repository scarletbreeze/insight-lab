"""Find public inquiry examples using reviewed title-to-summary rules."""

import argparse
import json
import re
from datetime import date
from html import unescape
from pathlib import Path

from collect_public_board import SOURCE, collect

# Titles are matched in memory. Output contains a controlled paraphrase and a
# date, without customer text, identifiers, or user-entered values.
RULES = (
    ("order-rejection", "orders", "error", "주문 거부", ("주문", "거부"), r"주문\s*(거부|거절)",
     "주문이 거부되거나 거절되는 상황을 문의했습니다."),
    ("account-opening", "account", "how_to", "계좌 개설", ("계좌개설",), r"계좌\s*개설\s*(문의|방법|질문)",
     "계좌 개설 방법이나 절차를 문의했습니다."),
    ("conditional-search", "hts", "how_to", "조건검색", ("조건검색",), r"조건\s*검색\s*(에\s*대해|문의|질문|방법)",
     "영웅문의 조건검색 사용에 관해 문의했습니다."),
    ("certificate", "auth", "how_to", "인증서", ("인증서",), r"인증서\s*(문의|질문|발급|등록)",
     "인증서 이용에 관해 문의했습니다."),
    ("overseas-exchange", "overseas", "how_to", "환전", ("환전",), r"환전\s*(문의|질문|방법)",
     "증권계좌의 환전 이용에 관해 문의했습니다."),
    ("trading-hours", "hours", "policy", "거래 시간", ("거래시간",), r"거래\s*시간\s*(문의|질문)",
     "이용할 수 있는 거래 시간대를 문의했습니다."),
    ("margin-requirement", "credit", "policy", "신용융자", ("신용융자",), r"신용\s*융자\s*(문의|질문|한도|조건)",
     "신용융자 이용에 관해 문의했습니다."),
    ("trading-fees", "fees", "fee", "거래 수수료", ("수수료",), r"(매매|거래|주식)\s*수수료\s*(문의|질문)",
     "주식 거래에 적용되는 수수료를 문의했습니다."),
    ("transfer", "transfer", "how_to", "출금·이체", ("이체",), r"이체\s*(문의|질문|방법)",
     "증권계좌 이체에 관해 문의했습니다."),
    ("ipo-subscription", "products", "how_to", "공모주 청약", ("공모주", "청약"), r"공모주\s*청약\s*(문의|질문|방법)",
     "공모주 청약 방법이나 절차를 문의했습니다."),
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--first", required=True, type=date.fromisoformat)
    parser.add_argument("--last", required=True, type=date.fromisoformat)
    parser.add_argument("--max-pages", type=int, default=1300)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    if args.first > args.last or args.max_pages < 1:
        parser.error("Use ordered dates and at least one page.")
    selected = {}

    def consider(posted, row):
        title = unescape(re.sub(r"<[^>]*>", " ", row.get("ttl") or ""))
        for key, topic, intent, subtopic, words, pattern, summary in RULES:
            if (posted.year, key) not in selected and re.search(pattern, title):
                selected[posted.year, key] = {
                    "id": f"example-{posted.year}-{key}", "date": str(posted), "topic": topic,
                    "intent": intent, "subtopic": subtopic, "keywords": words,
                    "summary": summary, "sourceUrl": SOURCE,
                    "reviewMethod": "title-template",
                }

    collection = collect(args.first, args.last, args.max_pages, 100, on_inquiry=consider)
    if collection["stop"] != "reached-older-posts":
        parser.error(f"Collection ended at {collection['oldestObserved']}: {collection['stop']}.")
    examples = sorted(selected.values(), key=lambda row: (row["date"], row["id"]), reverse=True)
    args.out.write_text(json.dumps(examples, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(examples)} title-based examples.")


if __name__ == "__main__":
    main()

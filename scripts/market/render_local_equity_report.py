"""Render locally computed Korean monthly rankings as a standalone research table."""

import argparse
import json
from html import escape
from pathlib import Path

from calculate_returns import https_url


def render(rankings):
    periods = sorted(period for period, markets in rankings.items() if "KR" in markets)
    if not periods:
        raise ValueError("The input has no Korean monthly rankings.")
    parts = ['<!doctype html><html lang="ko"><meta charset="utf-8">',
             '<meta name="viewport" content="width=device-width,initial-scale=1">',
             '<title>국내 ETF 보유 주식 월별 수익률</title>',
             '<style>body{max-width:58rem;margin:2rem auto;padding:0 1rem;font:1rem/1.6 system-ui}'
             'table{border-collapse:collapse;width:100%}td,th{padding:.45rem;text-align:left;'
             'border-bottom:1px solid #bbb}td:last-child{text-align:right}nav{line-height:2}</style>',
             '<h1>국내 ETF 보유 주식 월별 Top 10</h1>',
             '<p>월 첫 거래일 보유 주식의 첫 종가와 마지막 종가를 비교한 로컬 연구 결과입니다. 배당은 제외합니다.</p>',
             '<nav aria-label="조회 월">' + ' · '.join(f'<a href="#m{escape(p)}">{escape(p)}</a>' for p in periods) + '</nav>']
    for period in periods:
        data = rankings[period]["KR"]
        reasons = " · ".join(f"{escape(reason)} {n}개" for reason, n in data["exclusions"].items())
        sources = [f'<a href="{escape(https_url(url, "holdings source"))}">보유 명세 {n}</a>'
                   for n, url in enumerate(data["membershipSourceUrls"], 1)]
        first = data["items"][0]
        sources.append(f'<a href="{escape(https_url(first["sourceUrl"], "price source"))}">가격 출처</a>')
        parts.extend([f'<section id="m{escape(period)}"><h2>{escape(period)}</h2>',
                      f'<p>{escape(data["universe"])} · {first["firstDate"]}~{first["lastDate"]}</p>',
                      f'<p>검사 통과 {data["eligibleCount"]}/{data["universeCount"]}개 · {reasons}</p>',
                      '<p>' + ' · '.join(sources) + '</p>',
                      '<table><thead><tr><th>순위</th><th>종목</th><th>코드</th><th>가격 수익률</th></tr></thead><tbody>'])
        for rank, item in enumerate(data["items"], 1):
            parts.append(f'<tr><td>{rank}</td><th scope="row">{escape(item["name"])}</th>'
                         f'<td>{escape(item["symbol"])}</td><td>{item["returnPct"]:+.2f}%</td></tr>')
        parts.append('</tbody></table></section>')
    parts.append('</html>')
    return '\n'.join(parts)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("rankings", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.write_text(render(json.loads(args.rankings.read_text(encoding="utf-8"))), encoding="utf-8")

"""Export an official TIGER dated holdings table for local price research."""

import argparse
import json
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

BASE = "https://investments.miraeasset.com/tigeretf/ko/product/search/detail/"
FUNDS = {"KR7102110004": "TIGER 200", "KR7232080002": "TIGER 코스닥150"}


def source_url(fund, day, table=False):
    params = {"ksdFund": fund, "fixDate": day.strftime("%Y.%m.%d")}
    if table:
        params.update(prfPrd="Week01", order="SRD", pageIndex=1, firstIndex=0, listCnt=500)
    return BASE + ("pdfListAjax.ajax" if table else "pdf.ajax") + "?" + urlencode(params)


class HoldingsTable(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.counts = set()
        self.row = None
        self.cell = None
        self.inputs = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "input":
            self.inputs[attrs.get("name")] = attrs.get("value")
        if tag == "tr" and "data-tot-cnt" in attrs:
            self.counts.add(int(attrs["data-tot-cnt"]))
            self.row = []
        if tag == "td" and self.row is not None:
            self.cell = []

    def handle_data(self, value):
        if self.cell is not None:
            self.cell.append(value)

    def handle_endtag(self, tag):
        if tag == "td" and self.cell is not None:
            self.row.append("".join(self.cell).strip())
            self.cell = None
        if tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def collect(fund, day):
    def parse(url):
        with urlopen(url, timeout=25) as response:
            page = HoldingsTable()
            page.feed(response.read().decode("utf-8"))
            page.close()
            return page

    form = parse(source_url(fund, day))
    if form.inputs.get("ksdFund") != fund or form.inputs.get("fixDate") != day.strftime("%Y.%m.%d"):
        raise ValueError("The issuer did not return the requested fund and date.")
    table = parse(source_url(fund, day, table=True))
    if not table.rows or table.counts != {len(table.rows)}:
        raise ValueError("The public holdings table is incomplete.")
    return {"fund": fund, "asOf": day.isoformat(), "rows": [
        {"code": row[0], "name": row[1]} for row in table.rows]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fund", choices=FUNDS)
    parser.add_argument("day", type=date.fromisoformat)
    parser.add_argument("out", type=Path)
    args = parser.parse_args()
    result = collect(args.fund, args.day)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

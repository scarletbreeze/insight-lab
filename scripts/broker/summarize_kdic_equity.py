"""Summarize the boundary of the top ten in a KDIC year-end broker CSV (억원)."""

import argparse
import csv
from pathlib import Path
import json


def summarize(path):
    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        text = path.read_text(encoding="cp949")
    rows = list(csv.DictReader(text.splitlines()))
    names = [row["구분"].strip() for row in rows]
    if not all(names) or len(set(names)) != len(names):
        raise ValueError("Duplicate or missing broker name.")
    ordered = sorted(((float(row["자기자본"].replace(",", "")), name)
                      for name, row in zip(names, rows)), reverse=True)
    if len(ordered) < 11:
        raise ValueError("Need at least eleven broker records.")
    values = [value for value, _ in ordered]
    return {"records": len(rows), "boundary": [
        {"rank": values.index(value) + 1, "name": name, "equity": value}
        for value, name in ordered if 9 <= values.index(value) + 1 <= 11
    ]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    print(json.dumps(summarize(parser.parse_args().csv), ensure_ascii=False, indent=2))

"""Extract published World Bank Pink Sheet monthly gold averages from its XLSX file."""

import argparse
import json
import re
from decimal import Decimal
from pathlib import Path, PurePosixPath
from xml.etree import ElementTree
from zipfile import ZipFile

SOURCE = "https://www.worldbank.org/en/research/commodity-markets"


def extract_gold(path):
    with ZipFile(path) as workbook:
        manifest = ElementTree.fromstring(workbook.read("xl/workbook.xml"))
        sheet = manifest.find(".//{*}sheet[@name='Monthly Prices']")
        if sheet is None:
            raise ValueError("Monthly Prices sheet is missing.")
        relation_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        relationships = ElementTree.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))
        target = relationships.find(f"./{{*}}Relationship[@Id='{relation_id}']")
        sheet_path = str(PurePosixPath("xl", target.attrib["Target"])).lstrip("/")
        content = ElementTree.fromstring(workbook.read(sheet_path))
        strings = [
            "".join(node.text or "" for node in item.findall(".//{*}t"))
            for item in ElementTree.fromstring(workbook.read("xl/sharedStrings.xml"))
        ]

    rows = []
    for row in content.findall("./{*}sheetData/{*}row"):
        cells = {}
        for cell in row.findall("./{*}c"):
            value = cell.findtext("./{*}v")
            if value is not None:
                column = cell.attrib["r"].rstrip("0123456789")
                cells[column] = strings[int(value)] if cell.get("t") == "s" else value
        rows.append((int(row.attrib["r"]), cells))

    labels = dict(rows)
    gold_column = next((column for column, label in labels[5].items() if label == "Gold"), None)
    if gold_column is None or labels[6].get(gold_column) != "($/troy oz)":
        raise ValueError("Could not verify the Gold column and units.")
    observations = {}
    for _, cells in rows:
        match = re.fullmatch(r"(\d{4})M(0[1-9]|1[0-2])", cells.get("A", ""))
        raw_value = cells.get(gold_column)
        if match is None or not 1990 <= int(match[1]) <= 2026 or raw_value in (None, "", ".."):
            continue
        month = f"{match[1]}-{match[2]}"
        value = Decimal(raw_value)
        if month in observations or not value.is_finite() or value <= 0:
            raise ValueError(f"Invalid or duplicate Gold observation for {month}.")
        observations[month] = float(value)
    if not observations:
        raise ValueError("No Gold observations in the supported date range.")
    return {
        "sourceName": "World Bank Commodity Price Data (The Pink Sheet)",
        "sourceUrl": SOURCE,
        "edition": labels[4]["A"],
        "months": dict(sorted(observations.items())),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--out", type=Path, default=Path("data/market/months/gold-averages.json"))
    args = parser.parse_args()
    result = extract_gold(args.workbook)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result['months'])} monthly gold averages.")


if __name__ == "__main__":
    main()

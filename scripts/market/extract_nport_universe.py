"""Extract a historical equity universe from locally saved SEC Form N-PORT XML filings."""

import argparse
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree


def child_text(element, name):
    return (element.findtext(f"./{{*}}{name}") or "").strip()


def identifier(value, pattern):
    value = value.strip().upper()
    return value if re.fullmatch(pattern, value) and set(value) != {"0"} else ""


def extract_report(path, source_url, as_of):
    parsed = urlsplit(source_url)
    if parsed.scheme != "https" or parsed.hostname != "www.sec.gov" or not parsed.path.startswith("/Archives/edgar/data/"):
        raise ValueError(f"Expected an SEC EDGAR source for {path.name}.")
    root = ElementTree.parse(path).getroot()
    form = root.find("./{*}formData")
    if form is None:
        raise ValueError(f"Missing N-PORT form data in {path.name}.")
    general = form.find("./{*}genInfo")
    if general is None or child_text(general, "repPdDate") != as_of.isoformat():
        raise ValueError(f"Holdings date does not match {as_of} in {path.name}.")
    fund_name = child_text(general, "regName")
    if not fund_name:
        raise ValueError(f"Missing fund name in {path.name}.")
    members = []
    for holding in form.findall("./{*}invstOrSecs/{*}invstOrSec"):
        if child_text(holding, "assetCat") != "EC":
            continue
        name = child_text(holding, "name")
        issue_name = child_text(holding, "title")
        cusip = identifier(child_text(holding, "cusip"), r"[A-Z0-9*@#]{9}")
        identifiers = holding.find("./{*}identifiers")
        isin = ticker = ""
        if identifiers is not None:
            isin_element = identifiers.find("./{*}isin")
            ticker_element = identifiers.find("./{*}ticker")
            if isin_element is not None:
                isin = identifier(isin_element.get("value", ""), r"[A-Z]{2}[A-Z0-9]{9}[0-9]")
            if ticker_element is not None:
                ticker = ticker_element.get("value", "").strip()
        if not (cusip or isin) or not (name and issue_name):
            raise ValueError(f"Missing security identity for {name or 'an equity'} in {path.name}.")
        members.append({
            "name": name,
            "issueName": issue_name,
            "cusip": cusip,
            "isin": isin,
            "reportedTicker": ticker,
        })
    if not members:
        raise ValueError(f"No common-equity rows in {path.name}.")
    return {"fund": fund_name, "sourceUrl": source_url}, members


def extract_universe(reports, as_of):
    funds = []
    members = {}
    by_identifier = {}
    for path, source_url in reports:
        fund, holdings = extract_report(path, source_url, as_of)
        funds.append(fund)
        for holding in holdings:
            ids = [holding[key] for key in ("cusip", "isin") if holding[key]]
            matches = {by_identifier[value] for value in ids if value in by_identifier}
            if len(matches) > 1:
                raise ValueError(f"Conflicting security identities for {holding['name']}.")
            key = next(iter(matches), ids[0])
            if key not in members:
                members[key] = {**holding, "sources": [source_url]}
            else:
                member = members[key]
                for field in ("cusip", "isin"):
                    if member[field] and holding[field] and member[field] != holding[field]:
                        raise ValueError(f"Conflicting {field.upper()} for {holding['name']}.")
                    member[field] = member[field] or holding[field]
                if source_url not in member["sources"]:
                    member["sources"].append(source_url)
                if not member["reportedTicker"]:
                    member["reportedTicker"] = holding["reportedTicker"]
            for value in ids:
                by_identifier[value] = key
    return {
        "asOf": as_of.isoformat(),
        "membership": "approximate",
        "funds": funds,
        "members": sorted(members.values(), key=lambda item: (item["name"].casefold(), item["cusip"], item["isin"])),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    parser.add_argument("--report", action="append", required=True, nargs=2, metavar=("XML", "SEC_URL"))
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    result = extract_universe([(Path(path), url) for path, url in args.report], args.as_of)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result['members'])} unique common-equity holdings from {len(result['funds'])} filings.")


if __name__ == "__main__":
    main()

"""Cross-check the published US index month boundaries against FRED daily observations.

data/market/us-index-closes.json cites public daily market reports for the first
and last trading day of each month. This script downloads (or reads) the FRED
SP500 and NASDAQCOM series, confirms that each recorded boundary date is the
first/last day of the month in FRED, compares the recorded closes with the FRED
observations, and lists finished months that still have no published entry
together with their FRED boundary dates. This script never writes to the
published file. FRED labels both series "copyrighted: pre-approval required";
the site prefers news or broker reports as the primary source, and the months
that cite FRED directly (see collect_us_index_closes.py) are identifiable by the
fred.stlouisfed.org hostname so they can be replaced or removed later.
"""

import argparse
import csv
import io
import json
from calendar import monthrange
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

SERIES = ("SP500", "NASDAQCOM")
LABELS = ("S&P 500", "Nasdaq Composite")
START = date(1971, 1, 1)


def load_csv(path, through):
    if path:
        return path.read_text(encoding="utf-8-sig")
    query = urlencode({"id": ",".join(SERIES), "cosd": START.isoformat(), "coed": through.isoformat()})
    with urlopen("https://fred.stlouisfed.org/graph/fredgraph.csv?" + query, timeout=60) as response:
        return response.read().decode("utf-8-sig")


def parse_observations(csv_text):
    """Return {date: {series: Decimal}} for every row with at least one finite positive value."""
    reader = csv.DictReader(io.StringIO(csv_text))
    fields = reader.fieldnames or []
    if not fields or fields[0] not in {"observation_date", "DATE"} or not set(SERIES).issubset(fields):
        raise ValueError("FRED CSV does not include the SP500 and NASDAQCOM columns.")
    observations = {}
    for row in reader:
        day = date.fromisoformat(row[fields[0]])
        values = {}
        for symbol in SERIES:
            try:
                value = Decimal(row[symbol])
            except (InvalidOperation, TypeError):
                continue
            if value.is_finite() and value > 0:
                values[symbol] = value
        if values:
            observations[day] = values
    return observations


def fred_boundaries(observations, through):
    """Return {period: (first_day, last_day)} for finished months with both series on both boundary days."""
    by_period = defaultdict(list)
    for day in sorted(observations):
        if day <= through:
            by_period[day.isoformat()[:7]].append(day)
    boundaries = {}
    for period, days in by_period.items():
        year, month = int(period[:4]), int(period[5:])
        if date(year, month, monthrange(year, month)[1]) > through:
            continue
        if all(symbol in observations[day] for day in (days[0], days[-1]) for symbol in SERIES):
            boundaries[period] = (days[0], days[-1])
    return boundaries


def compare(published, observations, through, tolerance=Decimal("0.005")):
    """Return a list of finding dicts for each published boundary and the missing finished months."""
    findings = []
    boundaries = fred_boundaries(observations, through)
    for period, entry in sorted(published.items()):
        for edge, key in (("first", "firstDate"), ("last", "lastDate")):
            day = date.fromisoformat(entry[key])
            boundary = boundaries.get(period)
            if boundary and day != boundary[0 if edge == "first" else 1]:
                findings.append({"period": period, "edge": edge, "kind": "date", "published": day.isoformat(),
                                 "fred": boundary[0 if edge == "first" else 1].isoformat()})
            values = observations.get(day, {})
            for index, symbol in enumerate(SERIES):
                recorded = Decimal(str(entry[edge][index]))
                observed = values.get(symbol)
                if observed is None:
                    findings.append({"period": period, "edge": edge, "kind": "unobserved", "index": LABELS[index],
                                     "published": str(recorded), "fred": None})
                elif abs(observed - recorded) > tolerance:
                    findings.append({"period": period, "edge": edge, "kind": "value", "index": LABELS[index],
                                     "published": str(recorded), "fred": str(observed),
                                     "difference": str((observed - recorded).quantize(Decimal("0.01")))})
    missing = {period: tuple(day.isoformat() for day in days) for period, days in sorted(boundaries.items())
               if period not in published}
    return findings, missing


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--through", required=True, type=date.fromisoformat, help="Inclusive cutoff date (YYYY-MM-DD)")
    parser.add_argument("--csv", type=Path, help="Use a previously downloaded public FRED CSV (SP500,NASDAQCOM)")
    parser.add_argument("--data", type=Path, default=Path("data/market/us-index-closes.json"))
    parser.add_argument("--missing-from", default="2021-01", help="First period to list among months without an entry")
    parser.add_argument("--report", type=Path, help="Write the findings and missing months as JSON to this local path")
    args = parser.parse_args()

    published = json.loads(args.data.read_text(encoding="utf-8"))
    observations = parse_observations(load_csv(args.csv, args.through))
    findings, missing = compare(published, observations, args.through)
    checked = sum(len(entry["first"]) + len(entry["last"]) for entry in published.values())
    value_findings = [finding for finding in findings if finding["kind"] != "date"]
    print(f"{len(published)} months, {checked} boundary values checked, {checked - len(value_findings)} match FRED.")
    for finding in findings:
        print("  " + json.dumps(finding, ensure_ascii=False))
    listed = {period: days for period, days in missing.items() if period >= args.missing_from}
    print(f"{len(listed)} finished months since {args.missing_from} without a published entry.")
    for period, (first, last) in listed.items():
        print(f"  {period}: FRED first {first}, last {last}")
    if args.report:
        args.report.write_text(json.dumps({"findings": findings, "missing": listed}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

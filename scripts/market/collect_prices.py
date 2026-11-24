"""Normalize FRED daily prices and rates into monthly observation ranges."""

import argparse
import csv
import io
import json
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

SERIES = {
    "DGS10": {"label": "미국 국채 10년물", "unit": "%", "changeUnit": "%p"},
    "DCOILWTICO": {"label": "WTI 현물", "unit": "USD/배럴", "changeUnit": "USD/배럴"},
    "DEXKOUS": {"label": "원/달러", "unit": "KRW/USD", "changeUnit": "KRW/USD"},
}
START = date(1990, 1, 1)


def load_csv(path, through):
    if path:
        return path.read_text(encoding="utf-8-sig")
    query = urlencode({"id": ",".join(SERIES), "cosd": START.isoformat(), "coed": through.isoformat()})
    with urlopen("https://fred.stlouisfed.org/graph/fredgraph.csv?" + query, timeout=30) as response:
        return response.read().decode("utf-8-sig")


def monthly_data(csv_text, through):
    groups = defaultdict(lambda: defaultdict(list))
    reader = csv.DictReader(io.StringIO(csv_text))
    date_column = reader.fieldnames[0] if reader.fieldnames else None
    if date_column not in {"observation_date", "DATE"} or not set(SERIES).issubset(reader.fieldnames):
        raise ValueError("FRED CSV does not include the expected series.")
    for row in reader:
        day = date.fromisoformat(row[date_column])
        if not START <= day <= through:
            continue
        period = day.isoformat()[:7]
        for symbol in SERIES:
            try:
                observation = Decimal(row[symbol])
            except InvalidOperation:
                continue
            if observation.is_finite():
                groups[period][symbol].append((day.isoformat(), observation))

    months = {}
    for period, readings in sorted(groups.items()):
        entries = {}
        for symbol, observations in readings.items():
            observations.sort()
            first_date, first = observations[0]
            last_date, last = observations[-1]
            entries[symbol] = {
                "firstDate": first_date,
                "lastDate": last_date,
                "first": float(first),
                "last": float(last),
                "change": float(last - first) if len(observations) > 1 else None,
            }
        months[period] = entries
    if not months:
        raise ValueError("FRED CSV did not contain observations for the requested period.")
    return {"through": through.isoformat(), "series": SERIES, "months": months}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--through", required=True, type=date.fromisoformat, help="Inclusive cutoff date (YYYY-MM-DD)")
    parser.add_argument("--csv", type=Path, help="Use a previously downloaded public FRED CSV")
    parser.add_argument("--out", type=Path, default=Path("data/market/months/snapshots.json"))
    args = parser.parse_args()
    dataset = monthly_data(load_csv(args.csv, args.through), args.through)
    args.out.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(dataset['months'])} monthly snapshots processed.")


if __name__ == "__main__":
    main()

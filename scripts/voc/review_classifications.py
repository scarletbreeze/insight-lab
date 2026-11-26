"""Summarize blinded title labels against a private, year-stratified board sample."""

import argparse
import json
from collections import Counter
from pathlib import Path

from collect_public_board import TOPIC_TERMS


def summarize(sample, labels):
    reviewed = Counter()
    agreement = Counter()
    differences = Counter()
    years = []
    seen = set()
    for year, rows in sorted(sample.items()):
        judged = agreed = 0
        for digest, _, prediction in rows:
            key = digest[:8]
            if key in seen or key not in labels:
                raise ValueError("Every selected title needs a unique review key and a label.")
            seen.add(key)
            expected = labels[key]
            if prediction not in {*TOPIC_TERMS, "unclassified", "ambiguous"}:
                raise ValueError(f"Unknown automatic label: {prediction}")
            if expected == "?":
                continue
            if expected not in {*TOPIC_TERMS, "other"}:
                raise ValueError(f"Unknown review label: {expected}")
            judged += 1
            reviewed[expected] += 1
            if prediction == expected:
                agreement[expected] += 1
                agreed += 1
            else:
                differences[prediction if prediction in {"unclassified", "ambiguous"} else "differentTopic"] += 1
        years.append(dict(year=int(year), sample=len(rows), reviewed=judged, agreement=agreed))
    if seen != set(labels) or not years:
        raise ValueError("Review labels and selected rows do not match.")
    return dict(years=years, topics=[dict(topic=t, reviewed=n, agreement=agreement[t])
                                     for t, n in reviewed.most_common()],
                differences={k: differences[k] for k in ("unclassified", "ambiguous", "differentTopic")})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("sample", type=Path, help="Private JSON by year: digest, title, rule output")
    parser.add_argument("labels", type=Path, help="One digest prefix and blind topic label (or ?) per line")
    args = parser.parse_args()
    pairs = [line.split() for line in args.labels.read_text().splitlines() if line.strip()]
    labels = dict(pairs)
    if len(labels) != len(pairs):
        parser.error("Duplicate labels.")
    print(json.dumps(summarize(json.loads(args.sample.read_text()), labels), ensure_ascii=False, indent=2))

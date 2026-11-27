"""Derive one-line, non-causal observations per topic and year from the published monthly aggregates."""

import argparse
import json
import statistics
from calendar import monthrange
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAX_LENGTH = 70
# Words that would turn an observation into an explanation. Templates must not use them.
CAUSAL_WORDS = ("때문", "탓", "덕분", "영향", "원인", "인해", "따라", "효과", "반응")


def _number(value):
    return f"{value:g}"


def describe(year, topic, months, end, windows):
    """Return the observation and basis for one topic-year from its monthly counts."""
    counts = [count for _, count in months]
    peak_period, peak = max(months, key=lambda row: (row[1], row[0]))
    low_period, low = min(months, key=lambda row: (row[1], -int(row[0][5:])))
    median = statistics.median(counts)
    peak_month, low_month = int(peak_period[5:]), int(low_period[5:])
    last_period = months[-1][0]
    last_day = monthrange(year, int(last_period[5:]))[1]
    partial = end.startswith(last_period) and int(end[8:]) < last_day
    full_year = len(months) == 12 and not partial
    basis = [f"{year}년 월별 집계 {len(months)}개월"]
    if partial:
        prefix = f"{int(end[5:7])}월 {int(end[8:])}일까지 "
        basis.append("연중 집계")
    else:
        prefix = ""

    if median > 0 and peak >= 20 and peak >= 2 * median:
        text = f"{prefix}{peak_month}월 {peak}건으로 월 중앙값 {_number(median)}건의 {peak / median:.1f}배"
        basis.append(f"{peak_month}월 최다")
    elif full_year and (sum(counts[6:]) >= 1.3 * sum(counts[:6]) or sum(counts[:6]) >= 1.3 * sum(counts[6:])):
        first, second = sum(counts[:6]), sum(counts[6:])
        larger = "하반기" if second > first else "상반기"
        share = max(first, second) / (first + second) * 100
        text = f"상반기 {first}건·하반기 {second}건, {larger} 비중 {share:.0f}%"
        basis.append("상·하반기 합계")
    else:
        text = f"{prefix}월 {low}~{peak}건, 중앙값 {_number(median)}건, 최다 {peak_month}월·최소 {low_month}월"
        basis.append("월별 범위")

    observed = sum(1 for row in windows if row["date"].startswith(str(year)) and row["topic"] == topic)
    if observed:
        basis.append(f"공지 전후 14일 관찰 {observed}건")
    if len(text) > MAX_LENGTH:
        raise ValueError(f"{year} {topic}: observation exceeds {MAX_LENGTH} characters: {text}")
    if any(word in text for word in CAUSAL_WORDS):
        raise ValueError(f"{year} {topic}: observation contains causal wording: {text}")
    return text, " · ".join(basis)


def build(monthly, windows):
    by_year = {}
    for period, counts in sorted(monthly["months"].items()):
        by_year.setdefault(int(period[:4]), {})[period] = counts
    observations = []
    for year in sorted(by_year, reverse=True):
        periods = by_year[year]
        # A topic missing from a month was counted zero times in that month.
        topics = {topic: [(period, counts.get(topic, 0)) for period, counts in periods.items()]
                  for topic in sorted({topic for counts in periods.values() for topic in counts})}
        for topic in sorted(topics, key=lambda key: -sum(count for _, count in topics[key])):
            months = topics[topic]
            if not any(count for _, count in months):
                continue
            observation, basis = describe(year, topic, months, monthly["end"], windows["observations"])
            observations.append({"year": year, "topic": topic, "observation": observation, "basis": basis})
    return {
        "source": {"monthly": "data/voc/monthly-topics.json", "noticeWindows": "data/voc/notice-windows.json"},
        "method": "월별 단일 주제 집계의 최다·최소·중앙값과 상·하반기 합계를 정해진 문장 틀로 서술한다. 원인은 서술하지 않는다.",
        "maxLength": MAX_LENGTH,
        "observations": observations,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--monthly", type=Path, default=ROOT / "data/voc/monthly-topics.json")
    parser.add_argument("--windows", type=Path, default=ROOT / "data/voc/notice-windows.json")
    parser.add_argument("--out", type=Path, default=ROOT / "data/voc/topic-observations.json")
    args = parser.parse_args()
    result = build(json.loads(args.monthly.read_text(encoding="utf-8")), json.loads(args.windows.read_text(encoding="utf-8")))
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(result['observations'])} observations written to {args.out}.")


if __name__ == "__main__":
    main()

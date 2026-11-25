import snapshot from '../../data/voc/public-board-sample.json';
import topics from '../../data/voc/topics.json';
import generalNotices from '../../data/voc/general-notices.json';
import monthlyTopics from '../../data/voc/monthly-topics.json';

export const publicBoardSnapshot = snapshot;
const generalNoticeCounts: Record<string, number> = generalNotices.yearCounts;
const months: Record<string, Record<string, number>> = monthlyTopics.months;

export function publicBoardMonths(year: number, topic?: string) {
  return Object.entries(months).filter(([period]) => period.startsWith(`${year}-`)).map(([period, counts]) => {
    const month = Number(period.slice(5));
    const through = monthlyTopics.end.startsWith(period) ? monthlyTopics.end : undefined;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      period,
      count: topic ? counts[topic] ?? 0 : Object.values(counts).reduce((sum, count) => sum + count, 0),
      partialThrough: through && Number(through.slice(8)) < lastDay ? through : undefined,
    };
  });
}

export function generalNoticeYear(year: number) {
  return generalNoticeCounts[String(year)];
}

const yearCounts: Record<string, { total: number; categories: Record<string, number> }> = snapshot.years;
const topicCounts: Record<string, Record<string, number>> = 'topicCounts' in snapshot
  ? snapshot.topicCounts as Record<string, Record<string, number>>
  : {};

export function publicBoardTopics(year: number) {
  const counts = topicCounts[String(year)];
  if (!counts) return undefined;
  const ranked = topics
    .map(({ id, label }) => ({ id, label, count: counts[id] ?? 0 }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count);
  return {
    ranked,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    ambiguous: counts.ambiguous ?? 0,
    unclassified: counts.unclassified ?? 0,
  };
}

export function publicBoardYear(year: number) {
  const count = yearCounts[String(year)];
  if (!count) return undefined;

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const through = snapshot.end < end ? snapshot.end : end;
  const hasStart = snapshot.start <= start && snapshot.oldestObserved < start;
  const label = hasStart ? (through === end ? '공개 목록 연간' : `${through}까지`) : '일부 기간 수집분';

  return { ...count, label, through, isFullYear: hasStart && through === end };
}

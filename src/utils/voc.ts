import years from '../../data/voc/years.json';
import reviewed from '../../data/voc/notices.json';
import history from '../../data/voc/historical-notices.json';
import index from '../../data/voc/notice-index.json';
import posts from '../../data/voc/posts.json';
import topics from '../../data/voc/topics.json';
import contextData from '../../data/voc/context.json';
import noticeWindows from '../../data/voc/notice-windows.json';
import generalNotices from '../../data/voc/general-notices.json';
import { signals } from './ceo';

const relatedSignals: Record<string, string[]> = contextData.relatedSignals;
export const vocContext = [
  ...contextData.events,
  ...signals.flatMap(({ id, date, title, summary, sourceName, sourceUrl }) => relatedSignals[id]
    ? [{ date, title, summary, sourceName, sourceUrl, topics: relatedSignals[id] }]
    : []),
].sort((a, b) => b.date.localeCompare(a.date));

interface VocYear {
  year: number;
  questionCoverage: 'unverified' | 'sample' | 'verified';
  noticeCoverage: string;
  period: string;
  collectionId?: string;
  collectionStart?: string;
  collectionEnd?: string;
}

interface VocPost {
  id: string;
  date: string;
  topic: string;
  intent: string;
  summary: string;
  sourceUrl: string;
  subtopic?: string;
  keywords?: string[];
  reviewMethod?: string;
}

const vocYears: VocYear[] = years as VocYear[];
const vocPosts: VocPost[] = posts;
type VocNotice = (typeof index)[number] & { channel?: string };
const indexed = new Map<string, VocNotice>(index.map((notice) => [notice.id, notice]));
for (const notice of generalNotices.notices) indexed.set(notice.id, notice);
for (const notice of reviewed) indexed.set(notice.id, { ...notice, dateType: 'published' });
for (const notice of history) indexed.set(notice.id, notice);
const notices = [...indexed.values()].map((notice) => ({
  ...notice,
  channel: notice.channel ?? (new URL(notice.sourceUrl).searchParams.get('tp') === 'HG' ? '해외투자 공지' : '영웅문4'),
})).sort((a, b) => b.date.localeCompare(a.date));
const noticesById = new Map(notices.map((notice) => [notice.id, notice]));
const observedIds = new Set(noticeWindows.observations.map(({ noticeId }) => noticeId));
const exclusions: Record<string, string> = noticeWindows.exclusions;
export const windowLabels: Record<string, string> = {
  observed: '전후 변화 관찰', 'no-change': '전후 건수 동일', 'below-threshold': '표시 기준 미달',
  'unverified-date': '게시일 미확인', 'unclassified-topic': '비교할 주제 미확인',
  'incomplete-window': '전후 14일 수집 미완료', 'not-screened': '대조 전',
};
export function noticeWindowStatus(id: string) {
  return observedIds.has(id) ? 'observed' : (exclusions[id] ?? 'not-screened');
}

export { vocYears, notices as vocNotices, vocPosts, topics as vocTopics };

export const vocIntents: Record<string, string> = {
  how_to: '사용 방법',
  info: '상품 정보',
  error: '오류',
  request: '개선 요청',
  policy: '제도',
  fee: '비용',
  status: '처리 상태',
};

export function hasCompleteInquiryYear(coverage?: VocYear) {
  return Boolean(coverage?.questionCoverage === 'verified' && coverage.collectionId
    && coverage.collectionStart === `${coverage.year}-01-01`
    && coverage.collectionEnd === `${coverage.year}-12-31`);
}

export function summarizeKeywords(items: readonly VocPost[]) {
  const counts = new Map<string, number>();
  for (const { keywords } of items) {
    for (const keyword of new Set(keywords ?? [])) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }
  return [...counts].sort(([a, aCount], [b, bCount]) => bCount - aCount || a.localeCompare(b, 'ko')).slice(0, 15);
}

function publicationDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp : undefined;
}

function noticeDateWindows(timestamp: number) {
  const offset = (days: number) => new Date(timestamp + days * 86_400_000).toISOString().slice(0, 10);
  return { beforeStart: offset(-14), beforeEnd: offset(-1), afterStart: offset(1), afterEnd: offset(14) };
}

export function publicNoticeObservations(year: number) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const covered = Boolean(noticeWindows.collectionStart && noticeWindows.collectionEnd)
    && noticeWindows.collectionStart <= to && noticeWindows.collectionEnd >= from;
  const items = noticeWindows.observations.flatMap(({ noticeId, date, topic, before, after, beforeTotal, afterTotal }) => {
    if (date < from || date > to) return [];
    const notice = noticesById.get(noticeId);
    const timestamp = publicationDate(date);
    if (!notice || timestamp === undefined || notice.date !== date || notice.topic !== topic) return [];
    return [{ notice, before, after, beforeTotal, afterTotal, ...noticeDateWindows(timestamp) }];
  });
  return { covered, items };
}

export function noticeInquiryObservations(
  coverage: VocYear | undefined,
  entries: readonly (typeof notices)[number][],
  inquiries: readonly VocPost[],
) {
  const start = coverage?.collectionStart;
  const end = coverage?.collectionEnd;
  if (coverage?.questionCoverage !== 'verified' || !coverage.collectionId || !start || !end
    || publicationDate(start) === undefined || publicationDate(end) === undefined || start > end) return [];
  const datedInquiries = inquiries.filter(({ date }) => publicationDate(date) !== undefined);

  return entries.flatMap((notice) => {
    if (notice.dateType !== 'published' || notice.topic === 'other') return [];
    const timestamp = publicationDate(notice.date);
    if (timestamp === undefined) return [];
    const { beforeStart, beforeEnd, afterStart, afterEnd } = noticeDateWindows(timestamp);
    if (beforeStart < start || afterEnd > end) return [];
    const sameTopic = datedInquiries.filter(({ topic }) => topic === notice.topic);
    const before = sameTopic.filter(({ date }) => date >= beforeStart && date <= beforeEnd).length;
    const after = sameTopic.filter(({ date }) => date >= afterStart && date <= afterEnd).length;
    if (before + after < 5 || Math.abs(after - before) < 2) return [];
    return [{ notice, before, after, beforeStart, beforeEnd, afterStart, afterEnd }];
  }).sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before));
}

export function summarizeVocYear(year: number) {
  const coverage = vocYears.find((entry) => entry.year === year);
  const selectedPosts = vocPosts.filter(({ date }) => date.startsWith(String(year)));
  const selectedNotices = notices.filter(({ date }) => date.startsWith(String(year)));
  const topicCounts = topics
    .map(({ id, label }) => ({ id, label, count: selectedPosts.filter(({ topic }) => topic === id).length }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count);
  return { coverage, selectedPosts, selectedNotices, topicCounts, keywords: summarizeKeywords(selectedPosts) };
}

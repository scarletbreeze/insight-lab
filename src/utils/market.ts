import events from '../../data/market/events.json';
import goldSource from '../../data/market/months/gold-averages.json';
import koreaIndexData from '../../data/market/korea-index-closes.json';
import usIndexData from '../../data/market/us-index-closes.json';

interface IndexMonthCloses {
  firstDate: string;
  lastDate: string;
  first: number[];
  last: number[];
  secondIndexSource?: string;
  calendarSource?: string;
  sourceNote?: { text: string; url: string };
  firstSource: string;
  lastSource: string;
}

export const years = Array.from({ length: 37 }, (_, index) => 1990 + index);
export const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
export const marketEvents = events as Array<(typeof events)[number] & { then?: string; now?: string; nowSourceUrl?: string }>;
export const gold = { ...goldSource, months: goldSource.months as Record<string, number | undefined> };
export const koreaAnnualCloses: Record<string, (number | null)[] | undefined> = koreaIndexData.annual.rows;
export const koreaMonthlyCloses: Record<string, IndexMonthCloses | undefined> = koreaIndexData.monthly;
export const usMonthlyCloses: Record<string, IndexMonthCloses | undefined> = usIndexData;

/** FRED-sourced US months carry the FRED observation URL on both boundaries; news-sourced months do not. */
export function isFredSourced(closes: IndexMonthCloses | undefined) {
  return [closes?.firstSource, closes?.lastSource].every((url) => url && new URL(url).hostname === 'fred.stlouisfed.org');
}
export const usFredMonthCount = Object.values(usMonthlyCloses).filter(isFredSourced).length;

export function koreaAnnualSource(year: number) {
  const { earlierSources, historySource, latestSource } = koreaIndexData.annual;
  return earlierSources.find(({ through }) => year <= through)?.url ?? (year === 2025 ? latestSource : historySource);
}

const eras = [
  { id: 'terminal', through: 1997, label: 'PC통신 시대', accent: '#9bddd2' },
  { id: 'portal', through: 2004, label: '초기 웹 포털 시대', accent: '#a4c3ff' },
  { id: 'blog', through: 2011, label: '블로그 시대', accent: '#fac29c' },
  { id: 'mobile', through: 2016, label: '초기 스마트폰 시대', accent: '#b0dba1' },
  { id: 'finance', through: 2020, label: '모바일 금융 시대', accent: '#c4b4ff' },
  { id: 'data', through: 2026, label: '데이터 트레이딩 시대', accent: '#94d4ec' },
];

export function marketEra(year: number) {
  return eras.find(({ through }) => year <= through) ?? eras[eras.length - 1];
}

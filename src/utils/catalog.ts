import directory from '../../data/hero/official-directory.json';
import { notes } from './archive';
import monthlyRankings from '../../data/market/months/equity-rankings.json';
import monthlySpyRankings from '../../data/market/months/spy-equity-rankings.json';
import annualRankings from '../../data/market/annual-equity-rankings.json';
import annualSpyRankings from '../../data/market/annual-spy-equity-rankings.json';
import { brokers, brokerEvents, brokerMetrics, industry2025, industryRanks, interimProfit } from './brokers';
import { signals } from './ceo';
import { legends, screenByNumber, screens, workflows } from './hero';
import { marketEvents } from './market';
import { vocNotices, vocPosts } from './voc';

interface CatalogEntry {
  service: string;
  route: string;
  anchor?: string;
  query?: string;
  title: string;
  summary?: string;
  keywords?: string[];
  date: string;
  sourceUrls: string[];
}

type RankedEquity = { symbol: string; name: string; lastDate: string; sourceUrl: string };
type MonthlyRank = { eligibleCount: number; membershipSourceUrl?: string; items: RankedEquity[] };
type AnnualRank = { membershipSourceUrl?: string; winner: RankedEquity; loser: RankedEquity; tenbaggers: RankedEquity[] };
const marketLabels = { US: '미국', KR: '한국' };
const markets = Object.entries(marketLabels) as Array<[keyof typeof marketLabels, string]>;
const equitySeries = [
  { usFund: 'QQQ', monthly: monthlyRankings, annual: annualRankings },
  { usFund: 'SPY', monthly: monthlySpyRankings, annual: annualSpyRankings },
] as const;

const analyzedScreens = new Set(screens.map(({ number }) => number));
const menuKeywords = new Map(directory.screens.map(screen => [
  screen.number, [screen.title, screen.group, ...(screen.menuTitles ?? []), ...(screen.otherGroups ?? [])],
]));

export const catalog: CatalogEntry[] = [
  ...screens.map((screen) => ({
    service: 'hero-lab', route: 'hero-lab/screens/' + screen.number, title: screen.number + ' ' + screen.title,
    summary: [screen.summary, screen.observation, ...screen.menuPath, ...screen.tags].join(' '), date: screen.sources[0].retrievedAt,
    keywords: menuKeywords.get(screen.number),
    sourceUrls: screen.sources.map(({ sourceUrl }) => sourceUrl),
  })),
  ...directory.screens.filter(({ number }) => !analyzedScreens.has(number)).map(screen => ({
    service: 'hero-lab', route: 'hero-lab/directory', query: 'q=' + screen.number,
    title: screen.number + ' ' + screen.title, summary: screen.group + ' · 공식 도움말',
    keywords: [...(screen.menuTitles ?? []), ...(screen.otherGroups ?? [])], date: directory.retrievedAt,
    sourceUrls: ['https://download.kiwoom.com/hero4_help_new/' + screen.number + '.htm'],
  })),
  ...legends.profiles.map((profile) => ({
    service: 'hero-lab', route: 'hero-lab/hall-of-fame', anchor: 'legend-' + profile.chapter,
    title: profile.name + ' · ' + profile.style, date: legends.book.printDate,
    summary: profile.summary, keywords: [legends.book.title, ...profile.screens],
    sourceUrls: [legends.book.contentsUrl],
  })),
  ...workflows.map(({ slug, title, summary, steps, sourceUrl }) => {
    const relatedScreens = steps.map(({ number }) => screenByNumber(number));
    return {
      service: 'hero-lab', route: 'hero-lab/recipes', anchor: slug, title, summary,
      date: relatedScreens.map(({ sources }) => sources[0].retrievedAt).sort().at(-1)!,
      keywords: relatedScreens.flatMap(({ number, title, tags }) => [number, title, ...tags]),
      sourceUrls: sourceUrl ? [sourceUrl] : relatedScreens.map(({ sources }) => sources[0].sourceUrl),
    };
  }),
  ...vocNotices.map((notice) => ({
    service: 'voc-studio', route: 'voc-studio/timeline', anchor: notice.id, title: notice.title,
    summary: notice.summary, date: notice.date, sourceUrls: [notice.sourceUrl],
  })),
  ...vocPosts.map((post) => ({
    service: 'voc-studio', route: 'voc-studio/topics/' + post.topic, anchor: 'example-' + post.id, title: post.summary,
    keywords: [post.date, ...(post.subtopic ? [post.subtopic] : []), ...(post.keywords ?? [])],
    date: post.date, sourceUrls: [post.sourceUrl],
  })),
  ...brokers.map((broker) => ({
    service: 'broker-atlas', route: 'broker-atlas/brokers/' + broker.id, title: broker.name,
    date: String(Math.max(...brokerMetrics.filter(({ id }) => id === broker.id).map(({ year }) => year))),
    summary: broker.character, sourceUrls: [broker.sourceUrl, ...brokerMetrics.filter(({ id }) => id === broker.id).map(({ sourceUrl }) => sourceUrl)],
  })),
  ...brokerEvents.map(event => ({
    service: 'broker-atlas', route: 'broker-atlas/brokers/' + event.id, anchor: 'event-' + event.date,
    title: brokers.find(broker => broker.id === event.id)!.name + ' · ' + event.title,
    summary: event.summary, date: event.date, keywords: [event.date, '전환점'], sourceUrls: [event.sourceUrl],
  })),
  ...industryRanks.filter(({ id }) => !brokers.some((broker) => broker.id === id)).map(({ id, name }) => ({
    service: 'broker-atlas', route: 'broker-atlas/brokers/' + id, title: name,
    summary: '2025년 말 별도 재무현황', date: industry2025.date, sourceUrls: [industry2025.sourceUrl],
  })),
  {
    service: 'broker-atlas', route: 'broker-atlas', anchor: 'broker-profit-title',
    title: '증권사 당기순이익·영업이익 순위', date: interimProfit.end,
    summary: '2026년 3분기 누적 10개사와 2025년 같은 기간 비교',
    keywords: ['순이익', '실적', '이익', '수익성'],
    sourceUrls: interimProfit.companies.map(({ sourceUrl }) => sourceUrl),
  },
  ...marketEvents.map((event) => ({
    service: 'market-time-capsule', route: 'market-time-capsule/' + event.date.slice(0, 7).replace('-', '/'),
    title: event.date + ' ' + event.title, summary: event.summary, date: event.date, sourceUrls: [event.sourceUrl],
  })),
  ...equitySeries.flatMap(({ usFund, monthly }) => Object.entries(monthly as Record<string, Partial<Record<keyof typeof marketLabels, MonthlyRank>>>).flatMap(([period, rankings]) => {
    const [year, month] = period.split('-');
    return markets.flatMap(([market, label]) => {
      const ranking = rankings[market];
      const first = ranking?.items[0];
      if (!ranking || !first) return [];
      return [{
        service: 'market-time-capsule', route: 'market-time-capsule/' + year + '/' + month,
        anchor: 'equity-rankings', title: `${year}년 ${Number(month)}월 ${label}${market === 'US' ? ' ' + usFund : ''} 종목 수익률 Top 10`,
        summary: ranking.eligibleCount + '개 종목 계산',
        date: first.lastDate, sourceUrls: [first.sourceUrl, ...(ranking.membershipSourceUrl ? [ranking.membershipSourceUrl] : [])],
        keywords: [period, '순위', ...ranking.items.flatMap(({ symbol, name }) => [symbol, name])],
      }];
    });
  })),
  ...equitySeries.flatMap(({ usFund, annual }) => Object.entries(annual as Record<string, Partial<Record<keyof typeof marketLabels, AnnualRank>>>).flatMap(([year, rankings]) =>
    markets.flatMap(([market, label]) => {
      const ranking = rankings[market];
      if (!ranking) return [];
      const { winner, loser, tenbaggers, membershipSourceUrl } = ranking;
      return [{
        service: 'market-time-capsule', route: 'market-time-capsule/' + year, anchor: 'annual-equity',
        title: `${year}년 ${label}${market === 'US' ? ' ' + usFund : ''} 종목 연간 수익률`, date: winner.lastDate,
        summary: `최고 ${winner.name} (${winner.symbol}) · 최저 ${loser.name} (${loser.symbol})`,
        keywords: ['순위 Winner Loser Tenbagger', ...tenbaggers.flatMap(({ name, symbol }) => [name, symbol])],
        sourceUrls: [winner.sourceUrl, ...(membershipSourceUrl ? [membershipSourceUrl] : [])],
      }];
    }))),
  ...signals.map((signal) => ({
    service: 'ceo-lens', route: 'ceo-lens/signals', anchor: signal.id, title: signal.title,
    summary: signal.summary, date: signal.date, sourceUrls: [signal.sourceUrl],
  })),
  ...notes.map((note) => ({
    service: 'normalman-archive', route: 'normalman-archive/notes/' + encodeURIComponent(note.slug),
    title: note.title, summary: note.tags.join(' · '), date: note.date, sourceUrls: [note.sourceUrl],
  })),
];

export type SearchRecord = Pick<CatalogEntry, 'service' | 'route' | 'query' | 'anchor' | 'title' | 'summary' | 'keywords'>;

import { notes } from './archive';
import { brokers, brokerMetrics } from './brokers';
import { signals } from './ceo';
import { screens } from './hero';
import { marketEvents } from './market';
import { vocNotices, vocPosts } from './voc';

interface CatalogEntry {
  service: string;
  route: string;
  anchor?: string;
  title: string;
  summary?: string;
  date: string;
  sourceUrls: string[];
}

export const catalog: CatalogEntry[] = [
  ...screens.map((screen) => ({
    service: 'hero-lab', route: 'hero-lab/screens/' + screen.number, title: screen.number + ' ' + screen.title,
    summary: [screen.summary, ...screen.tags].join(' '), date: screen.sources[0].retrievedAt,
    sourceUrls: screen.sources.map(({ sourceUrl }) => sourceUrl),
  })),
  ...vocNotices.map((notice) => ({
    service: 'voc-studio', route: 'voc-studio/timeline', anchor: notice.id, title: notice.title,
    summary: notice.summary, date: notice.date, sourceUrls: [notice.sourceUrl],
  })),
  ...vocPosts.map((post) => ({
    service: 'voc-studio', route: 'voc-studio/topics/' + post.topic, title: post.summary,
    date: post.date, sourceUrls: [post.sourceUrl],
  })),
  ...brokers.map((broker) => ({
    service: 'broker-atlas', route: 'broker-atlas/brokers/' + broker.id, title: broker.name,
    date: String(Math.max(...brokerMetrics.filter(({ id }) => id === broker.id).map(({ year }) => year))),
    summary: broker.character, sourceUrls: [broker.sourceUrl, ...brokerMetrics.filter(({ id }) => id === broker.id).map(({ sourceUrl }) => sourceUrl)],
  })),
  ...marketEvents.map((event) => ({
    service: 'market-time-capsule', route: 'market-time-capsule/' + event.date.slice(0, 7).replace('-', '/'),
    title: event.date + ' ' + event.title, summary: event.summary, date: event.date, sourceUrls: [event.sourceUrl],
  })),
  ...signals.map((signal) => ({
    service: 'ceo-lens', route: 'ceo-lens/signals', anchor: signal.id, title: signal.title,
    summary: signal.summary, date: signal.date, sourceUrls: [signal.sourceUrl],
  })),
  ...notes.map((note) => ({
    service: 'normalman-archive', route: 'normalman-archive/notes/' + encodeURIComponent(note.slug),
    title: note.title, summary: note.tags.join(' · '), date: note.date, sourceUrls: [note.sourceUrl],
  })),
];

export function searchCatalog(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return catalog.filter(({ title, summary }) => {
    const text = [title, summary].join(' ').toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

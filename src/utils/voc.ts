import years from '../../data/voc/years.json';
import reviewed from '../../data/voc/notices.json';
import history from '../../data/voc/historical-notices.json';
import index from '../../data/voc/notice-index.json';
import posts from '../../data/voc/posts.json';
import topics from '../../data/voc/topics.json';

const indexed = new Map(index.map((notice) => [notice.id, notice]));
for (const notice of reviewed) indexed.set(notice.id, { ...notice, dateType: 'published' });
for (const notice of history) indexed.set(notice.id, notice);
const notices = [...indexed.values()].sort((a, b) => b.date.localeCompare(a.date));

export { years as vocYears, notices as vocNotices, posts as vocPosts, topics as vocTopics };

export function summarizeVocYear(year: number) {
  const coverage = years.find((entry) => entry.year === year);
  const selectedPosts = posts.filter(({ date }) => date.startsWith(String(year)));
  const selectedNotices = notices.filter(({ date }) => date.startsWith(String(year)));
  const topicCounts = topics
    .map(({ id, label }) => ({ id, label, count: selectedPosts.filter(({ topic }) => topic === id).length }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count);
  return { coverage, selectedPosts, selectedNotices, topicCounts };
}

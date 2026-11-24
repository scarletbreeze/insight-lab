import brokerData from '../../data/brokers/brokers.json';
import metricData from '../../data/brokers/metrics.json';
import events from '../../data/brokers/turning-points.json';

export const brokers = brokerData;
export const brokerYears = [...new Set(metricData.map(({ year }) => year))].sort((a, b) => b - a);
export const brokerEvents = events;
export const brokerMetrics = metricData.map((entry) => {
  const previous = metricData.find(({ id, year }) => id === entry.id && year === entry.year - 1);
  const averageEquity = previous ? (entry.equity + previous.equity) / 2 : 0;
  return {
    ...entry,
    roe: averageEquity > 0 ? entry.netIncome / averageEquity * 100 : null,
    growth: previous && previous.netIncome > 0 ? (entry.netIncome / previous.netIncome - 1) * 100 : null,
  };
});
export const fields = [
  { key: 'equity', title: '자본총계', percent: false },
  { key: 'netIncome', title: '당기순이익', percent: false },
  { key: 'assets', title: '자산총계', percent: false },
  { key: 'roe', title: 'ROE (계산)', percent: true },
  { key: 'growth', title: '당기순이익 YoY', percent: true },
] as const;

export function formatBrokerMetric(value: number | null | undefined, percent: boolean) {
  if (value === null || value === undefined) return '자료 확인 중';
  return percent ? value.toFixed(2) + '%' : (value / 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '억 원';
}

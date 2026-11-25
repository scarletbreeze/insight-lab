import brokerData from '../../data/brokers/brokers.json';
import metricData from '../../data/brokers/metrics.json';
import events from '../../data/brokers/turning-points.json';
import interimProfitData from '../../data/brokers/profit-2026-q3.json';
import priorInterimProfitData from '../../data/brokers/profit-2025-q3.json';

import industry from '../../data/brokers/industry-2025.json';
import industryPriorThirdQuarter from '../../data/brokers/industry-2025-q3.json';
import firstQuarter from '../../data/brokers/industry-2026-q1.json';
import historical from '../../data/brokers/industry-2023.json';
import industry2020 from '../../data/brokers/industry-2020.json';
import industry2020HalfYear from '../../data/brokers/industry-2020-h1.json';
import industry2021 from '../../data/brokers/industry-2021.json';
import industry2022 from '../../data/brokers/industry-2022.json';
import industry2024 from '../../data/brokers/industry-2024.json';
import industryHalfYear from '../../data/brokers/industry-2026-h1.json';
import industryThirdQuarter from '../../data/brokers/industry-2026-q3.json';
import opening2020 from '../../data/brokers/opening-2020.json';
import annual2019 from '../../data/brokers/annual-2019.json';

interface IndustryCompany {
  id: string;
  name: string;
  assets: number;
  liabilities: number;
  equity: number;
  capital: number;
  sourceUrl?: string;
  sourceName?: string;
}

interface IndustryPeriod {
  date: string;
  label: string;
  basis: string;
  scope: string;
  confirmedTopCount?: number;
  rankSourceUrl?: string;
  rankSourceName?: string;
  sourceUrl?: string;
  sourceName?: string;
  companies: IndustryCompany[];
}

const publishedIndustryPeriods: IndustryPeriod[] = [
  { ...industryThirdQuarter, label: '2026년 3분기 말' },
  { ...industryHalfYear, confirmedTopCount: 10, label: '2026년 반기 말' },
  { ...firstQuarter, confirmedTopCount: 10, label: '2026년 1분기 말', scope: '자본총계 상위 10개사' },
  { ...industry, confirmedTopCount: 10, label: '2025년 말', scope: '자본총계 상위 10개사' },
  { ...industryPriorThirdQuarter, confirmedTopCount: 10, label: '2025년 3분기 말' },
  { ...industry2024, label: '2024년 말' },
  { ...historical, label: '2023년 말' },
  { ...industry2022, label: '2022년 말' },
  { ...industry2021, label: '2021년 말' },
  { ...industry2020, label: '2020년 말' },
  { ...industry2020HalfYear, confirmedTopCount: 10, label: '2020년 반기 말' },
];
export const industryPeriods = publishedIndustryPeriods.map(({ companies, ...period }) => ({
  ...period,
  companies: [...companies].sort((a, b) => b.equity - a.equity)
    .map((company: IndustryCompany, index) => ({
      ...company, rank: index + 1,
      sourceUrl: company.sourceUrl ?? period.sourceUrl,
      sourceName: company.sourceName ?? period.sourceName,
    })),
}));

export function formatIndustryRank(rank: number, confirmedTopCount: number = 0) {
  return (rank <= confirmedTopCount ? '업계 ' : '수록 회사 중 ') + rank + '위';
}

export const industry2025 = industry;
export const industryRanks = industryPeriods.find(({ date }) => date === industry2025.date)!.companies;
export const defaultIndustryPeriod = industryPeriods.findIndex(({ companies }) => companies.length >= industryRanks.length);

export const brokers = brokerData;
const annualMetrics = [
  ...annual2019.map((entry) => ({ ...entry, year: 2019, operatingIncomeSourceUrl: undefined, operatingIncomeRounded: false })),
  ...opening2020.map((entry) => ({ ...entry, year: 2020, operatingIncomeSourceUrl: undefined, operatingIncomeRounded: false })),
  ...metricData,
];
export const brokerYears = [...new Set(annualMetrics.map(({ year }) => year))].sort((a, b) => b - a);
export const brokerEvents = [...events].sort((a, b) => b.date.localeCompare(a.date));
export const interimProfit = interimProfitData;
export const priorInterimProfit = priorInterimProfitData;

export function profitSourceLabel(status: string) {
  if (status === 'corrected-preliminary') return '정정 잠정 공시';
  return status === 'preliminary' ? '잠정 공시' : '공시';
}
export const brokerMetrics = annualMetrics.map((entry) => {
  const previous = annualMetrics.find(({ id, year }) => id === entry.id && year === entry.year - 1);
  const averageEquity = previous ? (entry.equity + previous.equity) / 2 : 0;
  return {
    ...entry,
    previousSourceUrl: previous?.sourceUrl,
    roe: averageEquity > 0 ? entry.netIncome / averageEquity * 100 : null,
    equityGrowth: previous && previous.equity > 0 ? (entry.equity / previous.equity - 1) * 100 : null,
    growth: previous && previous.netIncome > 0 ? (entry.netIncome / previous.netIncome - 1) * 100 : null,
  };
});
export const fields = [
  { key: 'equity', title: '자본총계', percent: false },
  { key: 'netIncome', title: '당기순이익', percent: false },
  { key: 'operatingIncome', title: '영업이익', percent: false },
  { key: 'assets', title: '자산총계', percent: false },
  { key: 'roe', title: 'ROE (계산)', percent: true },
  { key: 'growth', title: '당기순이익 YoY', percent: true },
  { key: 'equityGrowth', title: '자본총계 YoY', percent: true },
] as const;

export function formatBrokerMetric(value: number | null | undefined, percent: boolean) {
  if (value === null || value === undefined) return '자료 확인 중';
  return percent ? value.toFixed(2) + '%' : (value / 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '억 원';
}

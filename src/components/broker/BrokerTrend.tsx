import { useState, type CSSProperties } from 'react';
import '../../styles/charts.css';
import { brokerMetrics, brokerYears, fields, formatBrokerMetric } from '../../utils/brokers';

type Metric = (typeof fields)[number]['key'];

// Annual trend drawn with the shared HorizontalBars classes (charts.css): one ~2rem row per year and company,
// bars share a baseline, negatives extend left of the zero line.
export default function BrokerTrend({ companies }: { companies: { id: string; name: string }[] }) {
  const [metric, setMetric] = useState<Metric>('netIncome');
  const field = fields.find(({ key }) => key === metric) ?? fields[0];
  const years = [...brokerYears].reverse();
  const rows = years.flatMap((year) => companies.map((company) => ({
    key: year + company.id,
    label: companies.length > 1 ? year + ' ' + company.name : String(year),
    value: brokerMetrics.find((record) => record.id === company.id && record.year === year)?.[field.key],
  })));
  const values = rows.map(({ value }) => value).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const pct = (value: number) => (value - min) / range * 100;
  const zero = pct(0);
  const listStyle = { '--hbars-label': companies.length > 1 ? '10rem' : '3.6rem', '--hbars-value': '8.5rem' } as CSSProperties;

  return <div>
    <div className="lab-controls">
      <label>추이 지표
        <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
          {fields.map(({ key, title }) => <option key={key} value={key}>{title}</option>)}
        </select>
      </label>
    </div>
    <figure className="chart">
      <figcaption>{field.title} · {years[0]}~{years.at(-1)}년 연결 결산{companies.length > 1 && ' · 연도별로 두 회사를 나란히'}</figcaption>
      <ol className="hbars" style={listStyle}>
        {rows.map(({ key, label, value }) => {
          const ok = typeof value === 'number' && Number.isFinite(value);
          const x = ok ? Math.min(zero, pct(value)) : zero;
          const w = ok ? Math.abs(pct(value) - zero) : 0;
          return <li className="hbars-row" key={key}>
            <span className="hbars-label">{label}</span>
            <span className="hbars-track" aria-hidden="true">
              {min < 0 && <i className="hbars-zero" style={{ '--x': zero + '%' } as CSSProperties} />}
              {ok && <i className="hbars-bar" data-negative={value < 0 ? '' : undefined} style={{ '--x': x + '%', '--w': w + '%' } as CSSProperties} />}
            </span>
            <span className="hbars-value" data-empty={ok ? undefined : ''}>{formatBrokerMetric(value, field.percent)}</span>
          </li>;
        })}
      </ol>
    </figure>
  </div>;
}

import { useState } from 'react';
import { brokerMetrics, brokerYears, fields, formatBrokerMetric } from '../../utils/brokers';

type Metric = (typeof fields)[number]['key'];

export default function BrokerTrend({ companies }: { companies: { id: string; name: string }[] }) {
  const [metric, setMetric] = useState<Metric>('netIncome');
  const field = fields.find(({ key }) => key === metric) ?? fields[0];
  const years = [...brokerYears].reverse();
  const series = years.map((year) => ({
    year,
    values: companies.map((company) => ({
      ...company,
      value: brokerMetrics.find((record) => record.id === company.id && record.year === year)?.[field.key],
    })),
  }));
  const maximum = Math.max(1, ...series.flatMap(({ values }) => values.map(({ value }) => Math.abs(value ?? 0))));

  return <div>
    <div className="lab-controls">
      <label>추이 지표
        <select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>
          {fields.map(({ key, title }) => <option key={key} value={key}>{title}</option>)}
        </select>
      </label>
    </div>
    <figure>
      <figcaption>{field.title} · {years[0]}~{years.at(-1)}년 연결 결산</figcaption>
      <ol className="lab-list">
        {series.map(({ year, values }) => <li className="trend-year" key={year}>
          <strong>{year}</strong>
          <ul>{values.map(({ id, name, value }) => <li key={id} className="trend-row">
            {companies.length > 1 && <span>{name}</span>}
            <span className="trend-track" aria-hidden="true">
              {value !== null && value !== undefined && <span data-negative={value < 0} style={{ width: Math.abs(value) / maximum * 100 + '%' }} />}
            </span>
            <span>{formatBrokerMetric(value, field.percent)}</span>
          </li>)}</ul>
        </li>)}
      </ol>
    </figure>
  </div>;
}

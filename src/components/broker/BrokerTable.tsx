import { useState } from 'react';
import { brokerMetrics, brokerYears, brokers, fields, formatBrokerMetric } from '../../utils/brokers';

export default function BrokerTable({ mode, brokerBase }: { mode: 'compare' | 'rank', brokerBase: string }) {
  const [year, setYear] = useState(brokerYears[0]);
  const [left, setLeft] = useState(brokers[0].id);
  const [right, setRight] = useState(brokers[1].id);
  const [fieldKey, setFieldKey] = useState<(typeof fields)[number]['key']>('equity');
  const field = fields.find(({ key }) => key === fieldKey) ?? fields[0];
  const data = brokerMetrics.filter((entry) => entry.year === year);
  const ranked = data.flatMap((entry) => {
    const value = entry[field.key];
    return value === null ? [] : [{ ...entry, value }];
  }).sort((a, b) => b.value - a.value);
  const leftRow = data.find(({ id }) => id === left);
  const rightRow = data.find(({ id }) => id === right);
  const label = (id: string) => brokers.find((broker) => broker.id === id)?.name ?? id;

  return <section className="lab-block">
    <div className="lab-controls">
      <label>결산 연도 <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
        {brokerYears.map((year) => <option key={year}>{year}</option>)}
      </select></label>
      {mode === 'rank' ? <label>순위 지표 <select value={fieldKey} onChange={(event) => setFieldKey(event.target.value as typeof fieldKey)}>
        {fields.map(({ key, title }) => <option key={key} value={key}>{title}</option>)}
      </select></label> : <>
        <label>첫 번째 증권사 <select value={left} onChange={(event) => setLeft(event.target.value)}>
          {brokers.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label>두 번째 증권사 <select value={right} onChange={(event) => setRight(event.target.value)}>
          {brokers.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select></label>
      </>}
    </div>
    {mode === 'rank' ? (ranked.length ? <ol className="lab-list">
      {ranked.map(({ id, value }, index) => <li className="lab-card" key={id}>
        <strong>{index + 1}. <a href={brokerBase + id + '/'}>{label(id)}</a></strong>
        <span>{formatBrokerMetric(value, field.percent)}</span>
      </li>)}
    </ol> : <p role="status">해당 지표 자료 확인 중</p>) : left === right ? <p role="status">서로 다른 증권사를 선택하세요.</p> :
      <div className="lab-table-wrap"><table className="lab-table">
        <thead><tr><th scope="col">연결 지표</th><th scope="col">{label(left)}</th><th scope="col">{label(right)}</th></tr></thead>
        <tbody>{fields.map(({ key, title, percent }) => <tr key={key}>
          <th scope="row">{title}</th><td>{formatBrokerMetric(leftRow?.[key], percent)}</td><td>{formatBrokerMetric(rightRow?.[key], percent)}</td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}

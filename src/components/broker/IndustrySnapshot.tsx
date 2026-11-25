import { useState } from 'react';
import { defaultIndustryPeriod, formatBrokerMetric, industryPeriods } from '../../utils/brokers';

export default function IndustrySnapshot({ view, brokerBase }: { view: 'cards' | 'table'; brokerBase: string }) {
  const [periodIndex, setPeriod] = useState(defaultIndustryPeriod);
  const period = industryPeriods[periodIndex];
  const rows = view === 'cards' ? [...period.companies].sort((a, b) => (
    Number(b.id === 'kiwoom') - Number(a.id === 'kiwoom')
  )) : period.companies;
  const href = (id: string) => brokerBase + id + '/';
  const additionalSources = period.companies.filter(({ sourceUrl }) => sourceUrl !== period.sourceUrl);
  const previousDate = String(Number(period.date.slice(0, 4)) - 1) + period.date.slice(4);
  const previous = industryPeriods.find(({ date }) => date === previousDate);
  const previousEquity = new Map(previous?.companies.map(({ id, equity }) => [id, equity]));
  const changes = new Map(rows.flatMap(({ id, equity }) => {
    const prior = previousEquity.get(id);
    return prior && prior > 0 ? [[id, (equity / prior - 1) * 100] as const] : [];
  }));

  return <>
    <div className="lab-controls">
      <label>업계 비교 기준일
        <select value={periodIndex} onChange={(event) => setPeriod(Number(event.target.value))}>
          {industryPeriods.map(({ date, label }, index) => <option key={date} value={index}>{label}</option>)}
        </select>
      </label>
    </div>
    <p role="status">{period.date} · {period.basis} · {period.scope}</p>
    {view === 'cards' ? <div className="lab-grid">
      {rows.map(({ id, name, rank, equity }) => (
        <a key={id} className="lab-card" href={href(id)}>
          <strong>{name}</strong><span>{rank}위 · {formatBrokerMetric(equity, false)}</span>
          {changes.has(id) && <span>전년 동기 대비 {formatBrokerMetric(changes.get(id), true)}</span>}
        </a>
      ))}
    </div> : <div className="lab-table-wrap"><table className="lab-table">
      <thead><tr><th scope="col">순위</th><th scope="col">증권사</th><th scope="col">자본총계</th><th scope="col">자산총계</th>{changes.size > 0 && <th scope="col">자본총계 전년 동기 대비</th>}</tr></thead>
      <tbody>{rows.map(({ id, name, rank, equity, assets }) => (
        <tr key={id}><td>{rank}</td><th scope="row"><a href={href(id)}>{name}</a></th>
          <td>{formatBrokerMetric(equity, false)}</td><td>{formatBrokerMetric(assets, false)}</td>
          {changes.size > 0 && <td>{formatBrokerMetric(changes.get(id), true)}</td>}</tr>
      ))}</tbody>
    </table></div>}
    {period.sourceUrl && <p><a href={period.sourceUrl}>{period.sourceName}</a></p>}
    {changes.size > 0 && previous?.sourceUrl && <p><a href={previous.sourceUrl}>{previous.label} 자료</a></p>}
    {additionalSources.length > 0 && <details>
      <summary>회사별 근거 자료 {additionalSources.length}건</summary>
      <ul className="lab-list">{additionalSources.map(({ id, sourceUrl, sourceName }) => (
        <li key={id}><a href={sourceUrl}>{sourceName}</a></li>
      ))}</ul>
    </details>}
  </>;
}

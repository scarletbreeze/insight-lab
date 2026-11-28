import KdicRankCheck from './KdicRankCheck';
import { useState } from 'react';
import { defaultIndustryPeriod, formatBrokerMetric, formatIndustryRank, industryPeriods } from '../../utils/brokers';
import { sitePath } from '../../utils/paths';

// view: 'cards' | 'table' render the selected basis date in full; 'summary' (service home) states the latest basis date
// as one facts line and folds the selector, table and sources behind it.
export default function IndustrySnapshot({ view, brokerBase }: { view: 'cards' | 'table' | 'summary'; brokerBase: string }) {
  const [periodIndex, setPeriod] = useState(defaultIndustryPeriod);
  const period = industryPeriods[periodIndex];
  const latest = industryPeriods[defaultIndustryPeriod];
  const leader = [...latest.companies].sort((a, b) => a.rank - b.rank)[0];
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

  const sourceCount = Number(Boolean(period.rankSourceUrl)) + Number(Boolean(period.sourceUrl)) + additionalSources.length
    + Number(changes.size > 0 && Boolean(previous?.sourceUrl));

  const body = <>
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
          <strong>{name}</strong><span>{formatIndustryRank(rank, period.confirmedTopCount, period.date)} · {formatBrokerMetric(equity, false)}</span>
          {changes.has(id) && <span>전년 동기 대비 {formatBrokerMetric(changes.get(id), true)}</span>}
        </a>
      ))}
    </div> : <div className="lab-table-wrap" role="region" aria-label={period.label + ' 별도 자본총계 표'} tabIndex={0}><table className="lab-table lab-table--sticky-first">
      <thead><tr><th scope="col">증권사</th><th scope="col">순위</th><th scope="col">자본총계</th><th scope="col">자산총계</th>{changes.size > 0 && <th scope="col">자본총계 전년 동기 대비</th>}</tr></thead>
      <tbody>{rows.map(({ id, name, rank, equity, assets }) => (
        <tr key={id}><th scope="row"><a href={href(id)}>{name}</a></th><td>{formatIndustryRank(rank, period.confirmedTopCount, period.date)}</td>
          <td>{formatBrokerMetric(equity, false)}</td><td>{formatBrokerMetric(assets, false)}</td>
          {changes.size > 0 && <td>{formatBrokerMetric(changes.get(id), true)}</td>}</tr>
      ))}</tbody>
    </table></div>}
    <details className="lab-fold">
      <summary>순위 확인 방법과 출처 <span className="lab-fold__count">{sourceCount}건</span></summary>
      {period.confirmedTopCount && period.confirmedTopCount < period.companies.length && <p>기준일 자료로 업계 상위 {period.confirmedTopCount}개사의 순위를 확인했습니다. {period.date === '2021-12-31' ? '다음 두 회사는 예보 명단 58개사에 대해 확인한 순위 범위를 표시합니다.' : '이후 순위는 수록한 회사끼리 비교한 결과입니다.'}</p>}
      <ul className="lab-list lab-list--rows" aria-label="기준일 출처">
        {period.rankSourceUrl && <li><a className="row-title" href={period.rankSourceUrl}>{period.rankSourceName}</a></li>}
        {period.sourceUrl && <li><a className="row-title" href={period.sourceUrl}>{period.sourceName}</a></li>}
        {changes.size > 0 && previous?.sourceUrl && <li><a className="row-title" href={previous.sourceUrl}>{previous.label} 자료</a></li>}
        {additionalSources.map(({ id, sourceUrl, sourceName }) => (
          <li key={id}><a className="row-title" href={sourceUrl}>{sourceName}</a></li>
        ))}
      </ul>
      <KdicRankCheck date={period.date} />
    </details>
  </>;
  if (view !== 'summary') return body;
  return <>
    <dl className="lab-facts lab-facts--inline" aria-label={latest.label + ' 별도 자본총계 요약'}>
      <div><dt>최신 기준일</dt><dd>{latest.label} <span><time dateTime={latest.date}>{latest.date}</time></span></dd></div>
      {leader && <div><dt>별도 자본총계 1위</dt><dd><a href={href(leader.id)}>{leader.name}</a> <span>{formatBrokerMetric(leader.equity, false)}</span></dd></div>}
      <div><dt>비교 범위</dt><dd>{latest.companies.length}개사 <a href={sitePath('broker-atlas/rankings') + '#separate-equity'}>순위표</a></dd></div>
    </dl>
    <details className="lab-fold">
      <summary><h3>기준일별 별도 자본총계 표</h3> <span className="lab-fold__count">기준일 {industryPeriods.length}개</span></summary>
      {body}
    </details>
  </>;
}

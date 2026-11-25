import { useState } from 'react';
import { brokerMetrics, brokerYears, brokers, formatBrokerMetric } from '../../utils/brokers';

export default function BrokerYearOverview({ brokerBase }: { brokerBase: string }) {
  const [year, setYear] = useState(brokerYears[0]);
  const rows = brokerMetrics.filter((entry) => entry.year === year)
    .sort((a, b) => b.equity - a.equity)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      name: brokers.find((company) => company.id === entry.id)?.name ?? entry.id,
    }));
  const pinned = [...rows].sort((a, b) => Number(b.id === 'kiwoom') - Number(a.id === 'kiwoom'));
  const profitLeader = [...rows].sort((a, b) => b.netIncome - a.netIncome)[0];
  const totalProfit = rows.reduce((sum, { netIncome }) => sum + netIncome, 0);
  const currentIds = new Set(rows.map(({ id }) => id));
  const priorRows = brokerMetrics.filter((entry) => entry.year === year - 1 && currentIds.has(entry.id));
  const priorProfit = priorRows.reduce((sum, { netIncome }) => sum + netIncome, 0);
  const totalGrowth = priorRows.length === rows.length && priorProfit > 0
    ? (totalProfit / priorProfit - 1) * 100
    : null;

  return <>
    <div className="lab-controls">
      <label>연결 결산 연도
        <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
          {brokerYears.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
    </div>
    <h3>{year}년 증권사별 지표</h3>
    {profitLeader && <p role="status">
      수록 {rows.length}개사 중 당기순이익 1위{' '}
      <a href={brokerBase + profitLeader.id + '/'}>{profitLeader.name}</a> · {formatBrokerMetric(profitLeader.netIncome, false)}
    </p>}
    <div className="lab-grid">
      {pinned.map(({ id, name, rank, assets, equity, netIncome, operatingIncome, roe }) => <a className="lab-card" key={id} href={brokerBase + id + '/'}>
        <strong>{name}</strong>
        <span>수록사 자본총계 {rank}위</span>
        <dl className="broker-overview-facts">
          <div><dt>자본총계</dt><dd>{formatBrokerMetric(equity, false)}</dd></div>
          <div><dt>자산총계</dt><dd>{formatBrokerMetric(assets, false)}</dd></div>
          <div><dt>당기순이익</dt><dd>{formatBrokerMetric(netIncome, false)}</dd></div>
          <div><dt>영업이익</dt><dd>{formatBrokerMetric(operatingIncome, false)}</dd></div>
          <div><dt>ROE (계산)</dt><dd>{formatBrokerMetric(roe, true)}</dd></div>
        </dl>
      </a>)}
    </div>
    <section className="lab-block" aria-label={year + '년 10개사 수익성 요약'}>
      <h3>{year}년 수익성 요약</h3>
      <dl className="lab-grid">
        <div className="lab-card"><dt>수록 {rows.length}개사 연결 순이익 합계</dt><dd>{formatBrokerMetric(totalProfit, false)}</dd></div>
        {totalGrowth !== null && <div className="lab-card"><dt>같은 회사의 전년 합계 대비</dt><dd>{formatBrokerMetric(totalGrowth, true)}</dd></div>}
        {profitLeader && profitLeader.netIncome > 0 && rows.every(({ netIncome }) => netIncome >= 0) && <div className="lab-card">
          <dt>수록사 순이익 합계 중 1위 비중</dt><dd>{profitLeader.name} · {formatBrokerMetric(profitLeader.netIncome / totalProfit * 100, true)}</dd>
        </div>}
      </dl>
    </section>
  </>;
}

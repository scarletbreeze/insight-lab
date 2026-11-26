import { useState } from 'react';
import { sitePath } from '../../utils/paths';
import { brokerMetrics, brokerYears, brokers, formatBrokerMetric, interimProfit as interim, priorInterimProfit, profitSourceLabel } from '../../utils/brokers';

const formatGrowth = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });

export default function BrokerProfitRanking({ brokerBase }: { brokerBase: string }) {
  const [period, setPeriod] = useState(interim.end);
  const isInterim = period === interim.end;
  const periodLabel = isInterim ? interim.label : period + '년 결산';
  const rows = isInterim ? interim.companies.map((row) => ({ ...row, operatingIncomeSourceUrl: undefined, operatingIncomeRounded: false })) : brokerMetrics
    .filter(({ year }) => String(year) === period)
    .map((row) => ({ ...row, status: 'annual' }));
  const [profitMetric, setProfitMetric] = useState<'netIncome' | 'operatingIncome'>('netIncome');
  const profitLabel = profitMetric === 'netIncome' ? '당기순이익' : '영업이익';
  const priorRows = isInterim ? priorInterimProfit.companies : brokerMetrics.filter(({ year }) => year === Number(period) - 1);
  const priorByCompany = new Map(priorRows.map((company) => [company.id, company]));
  const priorLabel = isInterim ? '2025년 1~9월' : (Number(period) - 1) + '년 결산';
  const profits = rows.flatMap((row) => {
    const value = row[profitMetric];
    const source = profitMetric === 'operatingIncome' ? row.operatingIncomeSourceUrl ?? row.sourceUrl : row.sourceUrl;
    return value == null ? [] : [{
      ...row, value, source,
      previous: priorByCompany.get(row.id),
      name: brokers.find(({ id }) => id === row.id)?.name ?? row.id,
    }];
  }).sort((a, b) => b.value - a.value);
  const maxProfit = Math.max(1, ...profits.map(({ value }) => Math.abs(value)));
  const priorTotal = profits.reduce((sum, { previous }) => sum + (previous?.[profitMetric] ?? 0), 0);
  const comparable = profits.length === rows.length && priorRows.length === rows.length
    && profits.every(({ previous }) => previous?.[profitMetric] != null);
  const previousValues = priorRows.flatMap((row) => row[profitMetric] ?? []);
  const rankFor = (values: number[], value: number) => 1 + values.filter((other) => other > value).length;
  const currentValues = profits.map(({ value }) => value);
  const growth = comparable && priorTotal > 0
    ? (profits.reduce((sum, { value }) => sum + value, 0) / priorTotal - 1) * 100
    : null;
  const metricLeaders = (['netIncome', 'operatingIncome'] as const).flatMap((metric) => {
    const leader = [...rows].sort((a, b) => (b[metric] ?? -Infinity) - (a[metric] ?? -Infinity))[0];
    const value = leader?.[metric];
    return value == null ? [] : [{
      metric, value, id: leader.id, status: leader.status,
      source: metric === 'operatingIncome' ? leader.operatingIncomeSourceUrl ?? leader.sourceUrl : leader.sourceUrl,
      previous: priorByCompany.get(leader.id),
      name: brokers.find(({ id }) => id === leader.id)?.name ?? leader.id,
    }];
  });
  return (
    <section className="lab-block" aria-labelledby="broker-profit-title">
      <h2 id="broker-profit-title">{periodLabel} 이익 순위</h2>
      <p>수록 증권사 {rows.length}곳의 연결 실적 · {isInterim ? interim.start + ' ~ ' + interim.end : period + '년 연간 결산'}</p>
      <div className="lab-controls">
        <label>비교 기간
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value={interim.end}>{interim.label}</option>
            {brokerYears.map((year) => <option key={year} value={year}>{year}년 연간 결산</option>)}
          </select>
        </label>
        <label>수익 지표
          <select value={profitMetric} onChange={(event) => setProfitMetric(event.target.value as typeof profitMetric)}>
            <option value="netIncome">당기순이익</option>
            <option value="operatingIncome">영업이익</option>
          </select>
        </label>
      </div>
      <div className="lab-grid broker-profit-leaders">
        {metricLeaders.map(({ metric, value, id, name, previous, source, status }) => <article className="lab-card" key={metric}>
          <h3>{metric === 'netIncome' ? '당기순이익' : '영업이익'} 1위</h3>
          <strong><a href={brokerBase + id + '/'}>{name}</a></strong>
          <span>{formatBrokerMetric(value, false)}</span>
          {previous?.[metric] != null && <small>{priorLabel} {formatBrokerMetric(previous[metric], false)}</small>}
          <a href={source} aria-label={name + ' ' + periodLabel + ' ' + (metric === 'netIncome' ? '당기순이익' : '영업이익') + ' ' + profitSourceLabel(status)}>{profitSourceLabel(status)}</a>
        </article>)}
      </div>
      <p role="status">연결 {profitLabel} · {profits.length}/{rows.length}개사
        {profits[0] && <> · 1위 {profits[0].name} {formatBrokerMetric(profits[0].value, false)}</>}
        {comparable && <> · {priorLabel}과 같은 {profits.length}개사 기준</>}
        {growth != null && <> · 수록 {profits.length}개사 합계 전년 동기 대비 {formatGrowth.format(growth)}%</>}
      </p>
      {profits.length >= 2 && <p><a href={sitePath('broker-atlas/compare') + '?' + new URLSearchParams({
        left: profits[0].id, right: profits[1].id, period,
      })}>{profits[0].name}·{profits[1].name} 연결 실적 비교</a></p>}
      {profits.length ? <ol className="lab-list">
        {profits.map(({ id, name, value, source, status, operatingIncomeRounded, previous }) => <li className="lab-card" key={id}>
          <div className="trend-row broker-profit-row">
            <strong>{rankFor(currentValues, value)}. <a href={brokerBase + id + '/'}>{name}</a></strong>
            <span className="trend-track" aria-hidden="true">
              <span data-negative={value < 0} style={{ width: Math.abs(value) / maxProfit * 100 + '%' }} />
            </span>
            <span>{formatBrokerMetric(value, false)}{profitMetric === 'operatingIncome' && operatingIncomeRounded && <small> (억 원 단위 공시)</small>}</span>
            <a href={source} aria-label={name + ' ' + profitLabel + ' ' + profitSourceLabel(status)}>{profitSourceLabel(status)}</a>
          </div>
          {previous && previous[profitMetric] != null && <p className="broker-profit-prior">
            <a href={profitMetric === 'operatingIncome' && 'operatingIncomeSourceUrl' in previous && previous.operatingIncomeSourceUrl ? String(previous.operatingIncomeSourceUrl) : previous.sourceUrl}>{priorLabel}</a>{' '}
            {formatBrokerMetric(previous[profitMetric], false)}
            {comparable && <> · 순위 {rankFor(previousValues, previous[profitMetric])}위 → {rankFor(currentValues, value)}위</>}
            {previous[profitMetric] > 0 && <> · 전년 동기 대비 {formatGrowth.format((value / previous[profitMetric] - 1) * 100)}%</>}
          </p>}
        </li>)}
      </ol> : <p>선택한 기간의 {profitLabel} 자료 확인 중</p>}
    </section>
  );
}

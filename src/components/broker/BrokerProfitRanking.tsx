import { useState, type CSSProperties } from 'react';
import '../../styles/charts.css';
import { sitePath } from '../../utils/paths';
import { brokerMetrics, brokerYears, brokers, formatBrokerMetric, interimProfit as interim, priorInterimProfit, profitSourceLabel } from '../../utils/brokers';

const formatGrowth = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const listStyle = { '--hbars-label': '10rem', '--hbars-value': '12rem' } as CSSProperties;

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
  const priorTotal = profits.reduce((sum, { previous }) => sum + (previous?.[profitMetric] ?? 0), 0);
  const comparable = profits.length === rows.length && priorRows.length === rows.length
    && profits.every(({ previous }) => previous?.[profitMetric] != null);
  const previousValues = priorRows.flatMap((row) => row[profitMetric] ?? []);
  const rankFor = (values: number[], value: number) => 1 + values.filter((other) => other > value).length;
  const currentValues = profits.map(({ value }) => value);
  const growth = comparable && priorTotal > 0
    ? (profits.reduce((sum, { value }) => sum + value, 0) / priorTotal - 1) * 100
    : null;
  // Bars share one baseline; a negative result extends left of the zero line (HorizontalBars rules).
  const min = Math.min(0, ...currentValues);
  const max = Math.max(0, ...currentValues);
  const range = max - min || 1;
  const pct = (value: number) => (value - min) / range * 100;
  const zero = pct(0);
  const previousSource = (previous: NonNullable<(typeof profits)[number]['previous']>) =>
    profitMetric === 'operatingIncome' && 'operatingIncomeSourceUrl' in previous && previous.operatingIncomeSourceUrl ? String(previous.operatingIncomeSourceUrl) : previous.sourceUrl;
  const leader = profits[0];
  const leaderPrior = leader?.previous?.[profitMetric];
  return (
    <section className="lab-block" aria-labelledby="broker-profit-title">
      <h2 id="broker-profit-title">{periodLabel} 이익 순위</h2>
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
      {leader && <dl className="lab-facts lab-facts--inline" aria-label={periodLabel + ' 연결 ' + profitLabel + ' 1위'}>
        <div><dt>수록 {rows.length}개사 중 {profitLabel} 1위</dt><dd><a href={brokerBase + leader.id + '/'}>{leader.name}</a></dd></div>
        <div><dt>{periodLabel}</dt><dd>{formatBrokerMetric(leader.value, false)} <a href={leader.source} aria-label={leader.name + ' ' + periodLabel + ' ' + profitLabel + ' ' + profitSourceLabel(leader.status)}>{profitSourceLabel(leader.status)}</a></dd></div>
        <div><dt>{priorLabel} 대비</dt><dd>{leaderPrior != null && leaderPrior > 0 ? formatGrowth.format((leader.value / leaderPrior - 1) * 100) + '%' : '자료 확인 중'} {leaderPrior != null && <span>{formatBrokerMetric(leaderPrior, false)}</span>}</dd></div>
      </dl>}
      {profits.length ? <>
        <figure className="chart">
          <figcaption>연결 {profitLabel} · {profits.length}/{rows.length}개사{growth != null && <> · 합계 {isInterim ? '전년 동기' : '전년'} 대비 {formatGrowth.format(growth)}%</>} · 괄호는 회사별 {isInterim ? '전년 동기' : '전년'} 대비</figcaption>
          <ol className="hbars" style={listStyle}>
            {profits.map(({ id, name, value, operatingIncomeRounded, previous }) => {
              const prior = previous?.[profitMetric];
              return <li className="hbars-row" key={id}>
                <span className="hbars-label">{rankFor(currentValues, value)}. <a href={brokerBase + id + '/'}>{name}</a></span>
                <span className="hbars-track" aria-hidden="true">
                  {min < 0 && <i className="hbars-zero" style={{ '--x': zero + '%' } as CSSProperties} />}
                  <i className="hbars-bar" data-negative={value < 0 ? '' : undefined} style={{ '--x': Math.min(zero, pct(value)) + '%', '--w': Math.abs(pct(value) - zero) + '%' } as CSSProperties} />
                </span>
                <span className="hbars-value">{formatBrokerMetric(value, false)}
                  {prior != null && prior > 0 && <small> ({formatGrowth.format((value / prior - 1) * 100)}%)</small>}
                  {profitMetric === 'operatingIncome' && operatingIncomeRounded && <small> (억 원 단위 공시)</small>}
                </span>
              </li>;
            })}
          </ol>
        </figure>
        <details className="lab-fold">
          <summary><h3>회사별 출처와 {priorLabel} 비교</h3> <span className="lab-fold__count">{profits.length}건</span></summary>
          <p>{isInterim ? interim.start + ' ~ ' + interim.end : period + '년 연간 결산'} 연결 실적. {comparable ? priorLabel + '과 같은 ' + profits.length + '개사 기준으로 순위 변화를 매겼습니다.' : priorLabel + ' 자료가 없는 회사가 있어 순위 변화는 표시하지 않습니다.'}
            {profits.length >= 2 && <> <a href={sitePath('broker-atlas/compare') + '?' + new URLSearchParams({
              left: profits[0].id, right: profits[1].id, period,
            })}>{profits[0].name}·{profits[1].name} 연결 실적 비교</a></>}</p>
          <div className="lab-table-wrap" role="region" aria-label={periodLabel + ' ' + profitLabel + ' 출처와 전년 동기 비교 표'} tabIndex={0}>
            <table className="lab-table lab-table--sticky-first">
              <caption>연결 {profitLabel} · 순위는 수록 {profits.length}개사 안에서 매긴 값 · 1조 원 이상은 조와 억</caption>
              <thead><tr><th scope="col">증권사</th><th scope="col">{periodLabel}</th><th scope="col">출처</th><th scope="col">{priorLabel}</th><th scope="col">전년 출처</th>{comparable && <th scope="col">순위 변화</th>}</tr></thead>
              <tbody>{profits.map(({ id, name, value, source, status, previous }) => {
                const prior = previous?.[profitMetric];
                return <tr key={id}>
                  <th scope="row">{rankFor(currentValues, value)}. <a href={brokerBase + id + '/'}>{name}</a></th>
                  <td>{formatBrokerMetric(value, false)}</td>
                  <td><a href={source} aria-label={name + ' ' + profitLabel + ' ' + profitSourceLabel(status)}>{profitSourceLabel(status)}</a></td>
                  <td>{prior == null ? '자료 확인 중' : formatBrokerMetric(prior, false)}</td>
                  <td>{previous && prior != null ? <a href={previousSource(previous)}>{priorLabel} 공시</a> : '–'}</td>
                  {comparable && <td>{prior != null ? rankFor(previousValues, prior) + '위 → ' + rankFor(currentValues, value) + '위' : '–'}</td>}
                </tr>;
              })}</tbody>
            </table>
          </div>
        </details>
      </> : <p>선택한 기간의 {profitLabel} 자료 확인 중</p>}
    </section>
  );
}

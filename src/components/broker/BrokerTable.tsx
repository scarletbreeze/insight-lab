import { useState } from 'react';
import BrokerSegmentPeriod from './BrokerSegmentPeriod';
import BrokerTrend from './BrokerTrend';
import IndustryCompare from './IndustryCompare';
import { brokerEvents, brokerMetrics, brokerYears, brokers, fields, formatBrokerMetric, interimProfit } from '../../utils/brokers';

export default function BrokerTable({ mode, brokerBase }: { mode: 'compare' | 'rank', brokerBase: string }) {
  const [period, setPeriod] = useState(mode === 'compare' ? interimProfit.end : String(brokerYears[0]));
  const [left, setLeft] = useState(brokers[0].id);
  const [right, setRight] = useState(brokers[1].id);
  const [fieldKey, setFieldKey] = useState<(typeof fields)[number]['key']>('netIncome');
  const field = fields.find(({ key }) => key === fieldKey) ?? fields[0];
  const isInterim = period === interimProfit.end;
  const year = Number(period);
  const data = brokerMetrics.filter((entry) => entry.year === year);
  const ranked = data.flatMap((entry) => {
    const value = entry[field.key];
    return value == null ? [] : [{ ...entry, value }];
  }).sort((a, b) => b.value - a.value);
  const leftRow = data.find(({ id }) => id === left);
  const rightRow = data.find(({ id }) => id === right);
  const leftInterim = interimProfit.companies.find(({ id }) => id === left);
  const rightInterim = interimProfit.companies.find(({ id }) => id === right);
  const comparisonFields = isInterim ? fields.filter(({ key }) => key === 'netIncome' || key === 'operatingIncome') : fields;
  const label = (id: string) => brokers.find((broker) => broker.id === id)?.name ?? id;

  return <section className="lab-block">
    {mode === 'compare' && <h2>비교할 두 증권사</h2>}
    <div className="lab-controls">
      <label>{mode === 'compare' ? '연결 실적 기간' : '결산 연도'} <select value={period} onChange={(event) => setPeriod(event.target.value)}>
        {mode === 'compare' && <option value={interimProfit.end}>{interimProfit.label}</option>}
        {brokerYears.map((year) => <option key={year} value={year}>{mode === 'compare' ? year + '년 결산' : year}</option>)}
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
    {mode === 'rank' ? (ranked.length ? <><p role="status">{year}년 연결 {field.title} · {ranked.length}/{data.length}개사</p><ol className="lab-list">
      {ranked.map(({ id, value }, index) => <li className="lab-card" key={id}>
        <strong>{index + 1}. <a href={brokerBase + id + '/'}>{label(id)}</a></strong>
        <span>{formatBrokerMetric(value, field.percent)}</span>
      </li>)}
    </ol></> : <p role="status">해당 지표 자료 확인 중</p>) : left === right ? <p role="status">서로 다른 증권사를 선택하세요.</p> :
      <div className="lab-table-wrap"><table className="lab-table">
        <caption>{isInterim ? interimProfit.label + ' 연결 실적' : year + '년 연결 결산'} · 차이는 첫 번째 회사에서 두 번째 회사를 뺀 값</caption>
        <thead><tr><th scope="col">연결 지표</th><th scope="col">{label(left)}</th><th scope="col">{label(right)}</th><th scope="col">차이</th></tr></thead>
        <tbody>{comparisonFields.map(({ key, title, percent }) => {
          const profitKey = key === 'netIncome' || key === 'operatingIncome' ? key : undefined;
          const first = isInterim && profitKey ? leftInterim?.[profitKey] : leftRow?.[key];
          const second = isInterim && profitKey ? rightInterim?.[profitKey] : rightRow?.[key];
          const difference = first != null && second != null ? first - second : undefined;
          const formatted = formatBrokerMetric(difference, percent);
          const signed = difference != null && difference > 0 ? '+' + formatted : formatted;
          return <tr key={key}>
            <th scope="row">{title}</th><td>{formatBrokerMetric(first, percent)}</td><td>{formatBrokerMetric(second, percent)}</td>
            <td>{percent && difference != null ? signed.replace('%', '%p') : signed}</td>
          </tr>;
        })}</tbody>
      </table></div>}
    {mode === 'compare' && left !== right && <>
      {isInterim && <ul className="lab-chips" aria-label="연결 누적 실적 원문">
        {[leftInterim, rightInterim].map((row) => row && <li key={row.id}><a href={row.sourceUrl}>{label(row.id)} 분기보고서</a></li>)}
      </ul>}
      <IndustryCompare leftCompany={{ id: left, name: label(left) }} rightCompany={{ id: right, name: label(right) }} />
      <BrokerTrend companies={[{ id: left, name: label(left) }, { id: right, name: label(right) }]} />
      <div className="lab-grid">
        {[left, right].map((id) => {
          const company = brokers.find((item) => item.id === id);
          const events = brokerEvents.filter((event) => event.id === id);
          return <article className="lab-card" key={id}>
            <h3><a href={brokerBase + id + '/'}>{label(id)}</a></h3>
            <p>{company?.character}</p>
            <strong>공시 사업 분류</strong>
            <p>{company?.segments.join(' · ') || '자료 확인 중'}</p>
            <BrokerSegmentPeriod id={id} year={isInterim ? Number(interimProfit.end.slice(0, 4)) : year}
              interim={isInterim} detailUrl={brokerBase + id + '/'} />
            <strong>주요 전환점</strong>
            {events.length ? <ul>{events.map(({ date, title, sourceUrl }) => (
              <li key={date}><time dateTime={date}>{date}</time><a href={sourceUrl}>{title}</a></li>
            ))}</ul> : <p>자료 확인 중</p>}
          </article>;
        })}
      </div>
    </>}
  </section>;
}

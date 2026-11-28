import { useEffect, useState } from 'react';

type Observation = { value: number; date: string; source?: string };
type Period = {
  id: string;
  observations: (Observation | null)[];
  events: { title: string; date: string; sourceUrl: string }[];
};
type Measure = { id: string; label: string; unit: string; changeUnit: string; sourceUrl?: string };

export default function MarketPeriodCompare({ periods, measures, base }: {
  periods: Period[];
  measures: Measure[];
  base: string;
}) {
  const [first, setFirst] = useState('2025-11');
  const [second, setSecond] = useState('2025-12');
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const firstMonth = query.get('first');
    const secondMonth = query.get('second');
    if (periods.some(({ id }) => id === firstMonth) && firstMonth) setFirst(firstMonth);
    if (periods.some(({ id }) => id === secondMonth) && secondMonth) setSecond(secondMonth);
  }, [periods]);
  const earlier = periods.find(({ id }) => id === first);
  const later = periods.find(({ id }) => id === second);
  const format = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
  const link = (period: string) => base + period.replace('-', '/') + '/';
  const changePeriod = (nextFirst: string, nextSecond: string) => {
    setFirst(nextFirst);
    setSecond(nextSecond);
    const url = new URL(window.location.href);
    url.searchParams.set('first', nextFirst);
    url.searchParams.set('second', nextSecond);
    window.history.replaceState(window.history.state, '', url);
  };
  const renderObservation = (reading: Observation | null | undefined, unit: string) => {
    if (!reading) return '자료 확인 중';
    const label = format.format(reading.value) + ' ' + unit;
    return <>
      {reading.source ? <a href={reading.source}>{label}</a> : label}
      <br /><small>{reading.date}</small>
    </>;
  };

  return <>
    <div className="lab-controls">
      <label>첫 번째 월
        <select value={first} onChange={(event) => changePeriod(event.target.value, second)}>
          {periods.map(({ id }) => <option key={id}>{id}</option>)}
        </select>
      </label>
      <label>두 번째 월
        <select value={second} onChange={(event) => changePeriod(first, event.target.value)}>
          {periods.map(({ id }) => <option key={id}>{id}</option>)}
        </select>
      </label>
    </div>
    {first === second ? <p role="status">서로 다른 두 달을 선택하세요.</p> : <div className="lab-table-wrap" role="region" aria-label="선택한 두 달의 지표 비교" tabIndex={0}>
      <table className="lab-table lab-table--sticky-first">
        <caption>선택한 두 달의 지표와 차이</caption>
        <thead>
          <tr><th scope="col">지표</th><th scope="col"><a href={link(first)}>{first}</a></th>
            <th scope="col"><a href={link(second)}>{second}</a></th><th scope="col">두 번째 − 첫 번째</th></tr>
        </thead>
        <tbody>{measures.map(({ id, label, unit, changeUnit, sourceUrl }, index) => {
          const firstValue = earlier?.observations[index];
          const secondValue = later?.observations[index];
          const change = firstValue != null && secondValue != null ? secondValue.value - firstValue.value : null;
          return <tr key={id}>
            <th scope="row">{sourceUrl ? <a href={sourceUrl}>{label}</a> : label}</th>
            <td>{renderObservation(firstValue, unit)}</td>
            <td>{renderObservation(secondValue, unit)}</td>
            <td>{change === null ? '자료 확인 중' : format.format(change) + ' ' + changeUnit}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
    {first !== second && <section className="lab-block">
      <h2>두 달의 수록 사건</h2>
      <div className="lab-grid">{[earlier, later].map((period) => period && (
        <article className="lab-card" key={period.id}>
          <h3><a href={link(period.id)}>{period.id} 시장 기록</a></h3>
          {period.events.length ? <ul className="lab-list">
            {period.events.map(({ title, date, sourceUrl }) => <li key={date + title}>
              <time dateTime={date}>{date}</time> · <a href={sourceUrl}>{title}</a>
            </li>)}
          </ul> : <p>수록 사건 자료 확인 중</p>}
        </article>
      ))}</div>
    </section>}
  </>;
}

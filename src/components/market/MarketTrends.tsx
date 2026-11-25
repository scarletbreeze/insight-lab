import { useState } from 'react';

interface Series {
  id: string;
  label: string;
  unit: string;
  observationLabel: string;
  sourceName?: string;
  sourceUrl?: string;
  points: { period: string; date: string; value: number; sourceUrl?: string }[];
}

export default function MarketTrends({ series, years, base }: { series: Series[]; years: number[]; base: string }) {
  const [seriesIndex, setSeries] = useState(0);
  const [year, setYear] = useState(years.at(-2) ?? years[0]);
  const [span, setSpan] = useState(1);
  const active = series[seriesIndex];
  const points = active.points.filter(({ period }) => {
    const pointYear = Number(period.slice(0, 4));
    return pointYear >= year - span + 1 && pointYear <= year;
  });
  const max = Math.max(0, ...points.map(({ value }) => value));
  const min = Math.min(0, ...points.map(({ value }) => value));
  const domain = max - min || 1;
  const zero = -min / domain * 100;
  const format = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });

  return <>
    <div className="lab-controls">
      <label>시장 지표<select value={seriesIndex} onChange={(event) => setSeries(Number(event.target.value))}>
        {series.map(({ id, label }, index) => <option key={id} value={index}>{label}</option>)}
      </select></label>
      <label>종료 연도<select value={year} onChange={(event) => setYear(Number(event.target.value))}>
        {years.map((item) => <option key={item}>{item}</option>)}
      </select></label>
      <label>기간<select value={span} onChange={(event) => setSpan(Number(event.target.value))}>
        {[1, 3, 5, 10].map((length) => <option key={length} value={length}>{length}년</option>)}
      </select></label>
    </div>
    {points.length ? <figure>
      <figcaption>{active.label} · {points[0].period}~{points.at(-1)?.period} · {active.observationLabel} ({active.unit}) · 관측값 {points.length}개</figcaption>
      <ol className="lab-list">
        {points.map(({ period, date, value, sourceUrl }) => <li className="market-trend-row" key={period}>
          <a href={base + period.replace('-', '/') + '/'}>{period}</a>
          <span className="trend-track market-trend-track" aria-hidden="true">
            <i style={{ left: zero + '%' }} />
            <span data-negative={value < 0} style={{ left: (value < 0 ? (value - min) / domain * 100 : zero) + '%', width: Math.abs(value) / domain * 100 + '%' }} />
          </span>
          <span>{format.format(value)} <small>{sourceUrl ? <a href={sourceUrl}>{date} 출처</a> : date}</small></span>
        </li>)}
      </ol>
      {active.sourceUrl && <a href={active.sourceUrl}>{active.sourceName}</a>}
    </figure> : <p className="empty-state" role="status">해당 기간의 관측값이 없습니다.</p>}
  </>;
}

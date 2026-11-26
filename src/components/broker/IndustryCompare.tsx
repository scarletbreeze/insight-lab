import { useState } from 'react';
import { defaultIndustryPeriod, formatBrokerMetric, formatIndustryRank, industryPeriods } from '../../utils/brokers';

const metrics = [
  ['rank', '자본총계 순위'],
  ['equity', '자본총계'],
  ['assets', '자산총계'],
  ['liabilities', '부채총계'],
  ['capital', '자본금'],
] as const;

type Company = { id: string; name: string };

export default function IndustryCompare({ leftCompany, rightCompany }: { leftCompany: Company; rightCompany: Company }) {
  const [periodIndex, setPeriod] = useState(defaultIndustryPeriod);
  const period = industryPeriods[periodIndex];
  const left = period.companies.find(({ id }) => id === leftCompany.id);
  const right = period.companies.find(({ id }) => id === rightCompany.id);

  return <section className="lab-block">
    <h3>별도 재무현황</h3>
    <div className="lab-controls">
      <label>비교 기준일
        <select value={periodIndex} onChange={(event) => setPeriod(Number(event.target.value))}>
          {industryPeriods.map(({ date, label }, index) => <option key={date} value={index}>{label}</option>)}
        </select>
      </label>
    </div>
    <div className="lab-table-wrap">
        <table className="lab-table">
          <caption>{period.date} · {period.scope}</caption>
          <thead><tr><th scope="col">별도 지표</th><th scope="col">{leftCompany.name}</th><th scope="col">{rightCompany.name}</th></tr></thead>
          <tbody>{metrics.map(([key, title]) => (
            <tr key={key}>
              <th scope="row">{title}</th>
              {[left, right].map((company, index) => <td key={index}>{
                key === 'rank' && company ? formatIndustryRank(company.rank, period.confirmedTopCount, period.date) : formatBrokerMetric(company?.[key], false)
              }</td>)}
            </tr>
          ))}</tbody>
        </table>
    </div>
    {period.sourceUrl && <p><a href={period.sourceUrl}>{period.sourceName}</a></p>}
    {period.rankSourceUrl && <p><a href={period.rankSourceUrl}>{period.rankSourceName}</a></p>}
    {[...new Map([left, right].flatMap((entry) => entry?.sourceUrl && entry.sourceUrl !== period.sourceUrl
      ? [[entry.sourceUrl, entry.sourceName] as const] : []))].map(([url, name]) => (
      <p key={url}><a href={url}>{name}</a></p>
    ))}
  </section>;
}

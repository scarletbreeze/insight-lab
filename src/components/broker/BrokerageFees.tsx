import { useState } from 'react';
import fees from '../../../data/brokers/equity-brokerage-fees.json';
import { brokers, formatBrokerMetric } from '../../utils/brokers';

export default function BrokerageFees({ brokerBase }: { brokerBase: string }) {
  const [index, setIndex] = useState(0);
  const total = fees.industryTotals[index];
  const rows = Object.entries(fees.companies).map(([id, values]) => ({
    id, name: brokers.find((broker) => broker.id === id)?.name ?? id, amount: values[index],
  })).sort((a, b) => b.amount - a.amount);
  return <section className="lab-block">
    <h2>국내 지분증권 위탁매매 수수료</h2>
    <label>수수료 결산 연도 <select value={index} onChange={(event) => setIndex(Number(event.target.value))}>
      {fees.years.map((year, i) => <option key={year} value={i}>{year}년</option>)}
    </select></label>
    <p>{fees.years[index]}년 업계 합계 {formatBrokerMetric(total, false)}. 점유율은 국내 증권법인과 외국계 지점의 수수료 합계를 기준으로 계산했습니다.</p>
    <div className="lab-table-wrap"><table className="lab-table">
      <caption>2025년 말 자본 상위 10개사의 {fees.years[index]}년 위탁매매 수수료 비교</caption>
      <thead><tr><th scope="col">증권사</th><th scope="col">수수료</th><th scope="col">시장점유율</th></tr></thead>
      <tbody>{rows.map(({ id, name, amount }) => <tr key={id}>
        <th scope="row"><a href={brokerBase + id + '/'}>{name}</a></th><td>{formatBrokerMetric(amount, false)}</td>
        <td>{(100 * amount / total).toFixed(2)}%</td>
      </tr>)}</tbody>
    </table></div>
    <a href={fees.sourceUrl}>금융감독원 금융통계정보시스템 수록 공시 표</a>
  </section>;
}

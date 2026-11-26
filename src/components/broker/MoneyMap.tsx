import type { brokers } from '../../utils/brokers';
import { segmentFilings } from '../../utils/broker-segments';

export default function MoneyMap({ broker }: { broker: (typeof brokers)[number] }) {
  const filing = segmentFilings[broker.id];
  if (!broker.map.length) return <p className="empty-state">사업 구조 자료 확인 중</p>;
  return <>
    <ol className="money-flows" aria-label={broker.name + ' 수익 경로'}>
      {broker.map.map(({ customer, business, revenue }) => <li className="money-flow" key={business}>
        <div><span>고객·시장</span><strong>{customer}</strong></div>
        <span className="money-arrow" aria-hidden="true">→</span>
        <div><span>사업</span><strong>{business}</strong></div>
        <span className="money-arrow" aria-hidden="true">→</span>
        <div><span>수익원</span><strong>{revenue}</strong></div>
      </li>)}
    </ol>
    {filing && <p>경로 근거 · <a href={filing.sourceUrl}>
      {filing.sourceName.startsWith(broker.name) ? filing.sourceName : broker.name + ' ' + filing.sourceName}
    </a> · 원문 검색어 <q>{broker.mapSourceTerm}</q></p>}
  </>;
}

import type { brokers } from '../../utils/brokers';
import { segmentFilings } from '../../utils/broker-segments';

export default function MoneyMap({ broker }: { broker: (typeof brokers)[number] }) {
  const filing = segmentFilings[broker.id];
  if (!broker.map.length) return <p className="empty-state">사업 구조 자료 확인 중</p>;
  return <>
    <p>사업 열은 공시 부문명과 그 설명을 요약한 것이고, 고객·시장과 수익원 열은 그 설명을 바탕으로 한 해석(안)입니다.</p>
    <ol className="money-flows" aria-label={broker.name + ' 수익 경로'}>
      {broker.map.map(({ customer, business, revenue }) => <li className="money-flow" key={business}>
        <div><span>고객·시장 (해석)</span><strong>{customer}</strong></div>
        <span className="money-arrow" aria-hidden="true">→</span>
        <div><span>사업 (공시 부문)</span><strong>{business}</strong></div>
        <span className="money-arrow" aria-hidden="true">→</span>
        <div><span>수익원 (해석)</span><strong>{revenue}</strong></div>
      </li>)}
    </ol>
    <p>경로 근거 · <a href={broker.sourceUrl}>{broker.name} 공시 원문</a> · 원문 검색어 <q>{broker.mapSourceTerm}</q>
      {filing && <> · <a href={filing.sourceUrl}>부문별 금액 공시</a></>}</p>
  </>;
}

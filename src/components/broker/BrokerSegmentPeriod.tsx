import { formatSegmentAmount, segmentFilings, segmentTag } from '../../utils/broker-segments';

export default function BrokerSegmentPeriod({ id, year, interim, detailUrl }: {
  id: string; year: number; interim: boolean; detailUrl: string;
}) {
  const filing = segmentFilings[id];
  const index = filing?.years.indexOf(year) ?? -1;
  const period = year + (interim ? '년 1~9월 누적' : '년 결산');
  if (!filing || index < 0 || (filing.period === '1~9월 누적') !== interim) {
    return <p>{period} 부문별 공시 수치 미수록 · <a href={detailUrl + '#disclosed-segments-' + id}>수록 기간 확인</a></p>;
  }
  return <div className="lab-table-wrap"><table className="lab-table">
    <caption>{period} · {filing.basis} {filing.metric} · 억 원</caption>
    <thead><tr><th scope="col">공시 부문</th><th scope="col">공통 업무 분류</th><th scope="col">{filing.metric}</th></tr></thead>
    <tbody>{filing.segments.map(({ name, amounts }) => <tr key={name}>
      <th scope="row">{name}</th><td>{segmentTag(name)}</td><td>{formatSegmentAmount(amounts[index], filing.unit)}</td>
    </tr>)}</tbody>
    <tfoot><tr><th scope="row" colSpan={2}>연결 합계</th><td>{formatSegmentAmount(filing.total[index], filing.unit)}</td></tr></tfoot>
  </table><a href={filing.sourceUrl}>{filing.sourceName}</a></div>;
}

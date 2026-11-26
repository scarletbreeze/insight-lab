import { brokerEvents } from '../../utils/brokers';

const typeLabels: Record<string, string> = {
  capital: '자본 조달',
  business: '사업·시장',
  regulation: '지정·인가',
  ma: '인수·합병',
  global: '해외 진출',
  digital: '디지털 서비스',
  other: '기타',
};

export default function BrokerTurningPoints({ brokerId, detail = false }: { brokerId: string; detail?: boolean }) {
  const events = brokerEvents.filter(({ id }) => id === brokerId);
  if (!events.length) return <p className="empty-state">전환점 자료 확인 중</p>;
  return <ol className="lab-list">
    {events.map(({ date, title, summary, type, sourceUrl }) => (
      <li key={date + title} id={detail ? 'event-' + date : undefined}>
        <small><time dateTime={date}>{date}</time>{typeLabels[type]}</small>
        <div><a href={sourceUrl}>{title}</a></div>
        <p>{summary}</p>
      </li>
    ))}
  </ol>;
}

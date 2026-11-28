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

type Event = (typeof brokerEvents)[number];

function Rows({ events, detail, brief }: { events: Event[]; detail: boolean; brief: boolean }) {
  return <ol className="lab-list lab-list--rows">
    {events.map(({ date, title, summary, type, sourceUrl }) => (
      <li key={date + title} id={detail ? 'event-' + date : undefined}>
        <time dateTime={date}>{date}</time>
        <span className="lab-chip">{typeLabels[type]}</span>
        <span className="row-title"><a href={sourceUrl}>{title}</a>{!brief && <><br /><small>{summary}</small></>}</span>
      </li>
    ))}
  </ol>;
}

// Compact rows: date, kind chip, title (linked to the disclosure or announcement) and the one-line summary.
// `limit` shows the most recent N rows and folds the rest, and `brief` drops the one-line summary (compare page);
// the detail page shows every row with its summary.
export default function BrokerTurningPoints({ brokerId, detail = false, limit, brief = false }: { brokerId: string; detail?: boolean; limit?: number; brief?: boolean }) {
  const events = brokerEvents.filter(({ id }) => id === brokerId);
  if (!events.length) return <p className="empty-state">전환점 자료 확인 중</p>;
  const shown = limit ? events.slice(0, limit) : events;
  const rest = events.slice(shown.length);
  return <>
    <Rows events={shown} detail={detail} brief={brief} />
    {rest.length > 0 && <details className="lab-fold">
      <summary><h4>{rest[0].date.slice(0, 4)}년 이전 전환점</h4> <span className="lab-fold__count">{rest.length}건</span></summary>
      <Rows events={rest} detail={detail} brief={brief} />
    </details>}
  </>;
}

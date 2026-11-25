export default function VocKeywords({ keywords }: { keywords: [string, number][] }) {
  if (!keywords.length) return <p className="empty-state">문의 키워드 자료 확인 중</p>;
  const max = keywords[0][1];
  return <ul className="lab-chips voc-keywords" aria-label="문의 키워드와 수록 건수">
    {keywords.map(([label, count]) => (
      <li key={label} style={{ fontSize: 0.95 + 0.45 * count / max + 'rem' }}>
        {label} <span>{count}건</span>
      </li>
    ))}
  </ul>;
}

import observations from '../../../data/brokers/kdic-year-end-equity.json';

import annual from '../../../data/brokers/industry-2021.json';

const filings = new Map(annual.companies.filter(company => company.sourceUrl).map(company =>
  [company.name, { equity: Math.round(company.equity / 100), url: company.sourceUrl }]));
filings.set('유안타증권', {
  equity: Math.round(1481817285 / 100000), // 별도 재무상태표 원문 단위는 천 원
  url: 'https://kind.krx.co.kr/external/2023/03/02/000735/20230302002053/00591.htm',
});

export default function KdicRankCheck({ date }: {date: string}) {
  const year = date.slice(0, 4);
  if (!date.endsWith('-12-31') || !Object.hasOwn(observations, year)) return null;
  const { records, boundary } = observations[year as keyof typeof observations];
  return <details className="lab-block">
    <summary>{year}년 말 예금보험공사 자료로 9~11위 대조</summary>
    <p>예금보험공사 연말 파일에 실린 부보 증권사 {records}개사의 자기자본을 내림차순으로 정렬했습니다.</p>
    <div className="lab-table-wrap"><table className="lab-table">
      <caption>부보 증권사 기준 · {date} · 억 원</caption>
      <thead><tr><th scope="col">순위</th><th scope="col">회사</th><th scope="col">예보 자기자본</th>{year === '2021' && <th scope="col">회사 공시 별도 자본총계</th>}</tr></thead>
      <tbody>{boundary.map(({rank, name, equity}) => <tr key={name}>
        <td>{rank}위</td><th scope="row">{name}</th><td>{equity.toLocaleString('ko-KR')}</td>
        {year === '2021' && <td><a href={filings.get(name + '증권')?.url}>{filings.get(name + '증권')?.equity.toLocaleString('ko-KR')}</a></td>}
      </tr>)}</tbody>
    </table></div>
    {year === '2021' && <p>세 회사의 별도 자본총계는 키움·대신·유안타 순입니다. 예금보험공사 표에서는 유안타가 대신보다 앞섭니다. 업계 9·10위 확정에는 다른 증권사까지 같은 기준으로 대조한 자료가 필요합니다.</p>}
    <a href="https://www.data.go.kr/data/15061054/fileData.do">예금보험공사 증권사 경영현황 · 주기성 과거 데이터</a>
  </details>;
}

import observations from '../../../data/brokers/kdic-year-end-equity.json';

export default function KdicRankCheck({ date }: {date: string}) {
  const year = date.slice(0, 4);
  if (!date.endsWith('-12-31') || !Object.hasOwn(observations, year)) return null;
  const { records, boundary } = observations[year as keyof typeof observations];
  return <details className="lab-block">
    <summary>{year}년 말 예금보험공사 자료로 9~11위 대조</summary>
    <p>예금보험공사 연말 파일에 실린 부보 증권사 {records}개사의 자기자본을 내림차순으로 정렬했습니다.</p>
    <div className="lab-table-wrap"><table className="lab-table">
      <caption>부보 증권사 기준 · {date} · 억 원</caption>
      <thead><tr><th scope="col">순위</th><th scope="col">회사</th><th scope="col">원표 자기자본</th></tr></thead>
      <tbody>{boundary.map(({rank, name, equity}) => <tr key={name}>
        <td>{rank}위</td><th scope="row">{name}</th><td>{equity.toLocaleString('ko-KR')}</td>
      </tr>)}</tbody>
    </table></div>
    {year === '2021' && <p>유안타증권은 이 파일에서 25,854억 원이지만 한국신용평가의 같은 결산일 별도 재무 표에는 14,818억 원입니다. 이 차이로 대신증권과 순서가 바뀌어 업계 10위 판정을 보류했습니다. <a href="https://kisrating.com/fileDown.do?fileName=rs20251114-20.pdf&amp;gubun=2&amp;menuCd=R8">유안타증권 별도 재무 표</a></p>}
    <a href="https://www.data.go.kr/data/15061054/fileData.do">예금보험공사 증권사 경영현황 · 주기성 과거 데이터</a>
  </details>;
}

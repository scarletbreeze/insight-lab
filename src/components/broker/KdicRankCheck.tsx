import { yuanta2021 } from '../../utils/brokers';
import observations from '../../../data/brokers/kdic-year-end-equity.json';

import check from '../../../data/brokers/2021-equity-review.json';
import annual from '../../../data/brokers/industry-2021.json';

const filings = new Map(annual.companies.filter(company => company.sourceUrl).map(company =>
  [company.name, { equity: Math.round(company.equity / 100), url: company.sourceUrl }]));
filings.set('유안타증권', { equity: Math.round(yuanta2021.equity), url: yuanta2021.url });

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
    {year === '2021' && <section aria-label="별도 자본 대조">
      <h3>58개사 안에서 별도 자본으로 다시 비교하면</h3>
      <p>키움의 별도 자본은 약 37,933억 원입니다. 예보 명단 58개사에서 키움은 9위로 확인됩니다. 대신의 별도 자본 20,262.76억 원을 기준으로 한 확인 내역은 다음과 같습니다.</p>
      <ul className="lab-list">
        <li>수록 10개사와 유안타는 회사 공시로 대조했습니다.</li>
        <li>{check.belowThreshold.count}개사는 총자산이 최대 {check.belowThreshold.maxAssets.toLocaleString('ko-KR')}억 원이어서 자본이 대신보다 작습니다.</li>
        <li>추가 {check.companies.length}개사는 한국신용평가의 해당일 별도 재무지표와 예보의 총자산이 억 원 단위로 일치합니다. 모두 대신보다 자본이 작습니다.</li>
        {check.pending.map(({ name, assets }) => <li key={name}>{name}은 총자산 {assets.toLocaleString('ko-KR')}억 원으로 키움보다 작습니다. 해당일 부채나 자본의 원문 확인 전까지 대신의 범위는 10–11위입니다.</li>)}
      </ul>
      <details><summary>추가 {check.companies.length}개사 별도 재무지표와 출처</summary>
        <div className="lab-table-wrap"><table className="lab-table">
          <caption>{check.asOf} · {check.unit} · 자료의 당시 회사명</caption>
          <thead><tr><th scope="col">증권사</th><th scope="col">총자산</th><th scope="col">자기자본</th></tr></thead>
          <tbody>{check.companies.map(({ name, assets, equity, sourceUrl }) => <tr key={name}>
            <th scope="row"><a href={sourceUrl}>{name}</a></th><td>{assets.toLocaleString('ko-KR')}</td><td>{equity.toLocaleString('ko-KR')}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </section>}
    <a href="https://www.data.go.kr/data/15061054/fileData.do">예금보험공사 증권사 경영현황 · 주기성 과거 데이터</a>
  </details>;
}

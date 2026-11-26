import { formatIndustryRank, industryPeriods, yuanta2021 } from '../../utils/brokers';
import observations from '../../../data/brokers/kdic-year-end-equity.json';

import check from '../../../data/brokers/2021-equity-review.json';
import annual from '../../../data/brokers/industry-2021.json';

const filings = new Map(annual.companies.filter(company => company.sourceUrl).map(company =>
  [company.name, { equity: Math.round(company.equity / 100), url: company.sourceUrl }]));
filings.set('유안타증권', { equity: Math.round(yuanta2021.equity), url: yuanta2021.url });

// Firms whose separate balance sheet is still unverified. Typed here because the JSON array may be empty.
const pending: { name: string; assets: number; reportedEquity: number; netOperatingCapital: number; sourceUrl: string }[] = check.pending;
const period2021 = industryPeriods.find(({ date }) => date === check.asOf);
const daishin2021 = period2021?.companies.find(({ id }) => id === 'daishin');
const daishinRank = daishin2021 && formatIndustryRank(daishin2021.rank, period2021?.confirmedTopCount, check.asOf);

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
        {check.resolved.map(({ name, disclosedName, balanceSheetDate, assets, liabilities, equity, sourceUnit, sourceValues, sourceName, sourceUrl, kdic }) => <li key={name}>
          {name}의 {balanceSheetDate} 자본총계는 {equity.toLocaleString('ko-KR')}억 원, 부채총계는 {liabilities.toLocaleString('ko-KR')}억 원입니다.
          <a href={sourceUrl}>{sourceName}</a>에 {disclosedName} 이름으로 자본총계 {sourceValues.equity.toLocaleString('ko-KR')}{sourceUnit}, 부채 및 자본총계 {sourceValues.total.toLocaleString('ko-KR')}{sourceUnit}이 실려 있습니다.
          총자산 {assets.toLocaleString('ko-KR')}억 원은 <a href={kdic.sourceUrl}>예보 연말 파일</a>의 {kdic.assets.toLocaleString('ko-KR')}억 원과 억 원 단위에서 일치하며, 같은 파일의 자기자본 {kdic.reportedEquity}(원문 값)과 영업용순자본 {kdic.netOperatingCapital.toLocaleString('ko-KR')}억 원은 그대로 표시합니다. 이 통계는 금융감독원이 업무보고서를 취합한 자료이며 지점의 감사보고서는 아닙니다.
          자본총계는 대신보다 작습니다.
        </li>)}
        {pending.map(({ name, assets, reportedEquity, netOperatingCapital, sourceUrl }) => <li key={name}>
          {name}의 총자산은 {assets.toLocaleString('ko-KR')}억 원입니다. <a href={sourceUrl}>예보 연말 파일</a>에는 자기자본이 {reportedEquity}으로 기재돼 있습니다.
          영업용순자본 {netOperatingCapital.toLocaleString('ko-KR')}억 원은 규제 지표이고 ROE의 분모는 기간 평균입니다.
          대신과 순서를 확정하려면 {check.asOf} 재무상태표의 자본총계 또는 부채총계가 필요합니다.
        </li>)}
      </ul>
      {daishin2021 && daishinRank && pending.length === 0 && <p>대신보다 별도 자본총계가 큰 회사는 명단 {check.records}개사 중 {daishin2021.rank - 1}개사입니다. 대신의 별도 자본 순위는 {daishinRank}입니다. 예보 파일의 자기자본 순위(위 표)와는 기준이 다릅니다.</p>}
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

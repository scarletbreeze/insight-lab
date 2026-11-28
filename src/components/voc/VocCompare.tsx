import { useEffect, useState } from 'react';
import { summarizeVocYear, vocTopics, vocYears } from '../../utils/voc';
import { publicBoardMonths, publicBoardTopics, publicBoardYear } from '../../utils/voc-public-board';

const boardCategories = ['문의', '제안', '칭찬·불만', '분류 확인 중'];
const formatCount = (value: number) => value.toLocaleString('ko-KR');
const formatShare = (count: number, total: number) => `${formatCount(count)}건 · ${(count / total * 100).toFixed(1)}%`;
const formatSigned = (value: number) => value.toLocaleString('ko-KR', { signDisplay: 'exceptZero' });
const formatChange = (from: number, to: number) => from
  ? ((to / from - 1) * 100).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }) + '%'
  : '기준 0건';

export default function VocCompare({ yearBase, topicBase }: { yearBase: string; topicBase: string }) {
  const [left, setLeft] = useState(2024);
  const [right, setRight] = useState(2025);
  const [topic, setTopic] = useState('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const [key, setYear] of [['left', setLeft], ['right', setRight]] as const) {
      const year = Number(params.get(key));
      if (vocYears.some((entry) => entry.year === year)) setYear(year);
    }
    const requested = params.get('topic');
    if (requested && vocTopics.some(({ id }) => id === requested && id !== 'other')) setTopic(requested);
  }, []);
  function updateSelection(key: 'left' | 'right' | 'topic', value: string) {
    if (key === 'left') setLeft(Number(value));
    if (key === 'right') setRight(Number(value));
    if (key === 'topic') setTopic(value);
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(window.history.state, '', url);
  }
  const leftMonths = publicBoardMonths(left, topic);
  const rightMonths = publicBoardMonths(right, topic);
  const pairedMonths = leftMonths.flatMap((a) => {
    const b = rightMonths.find((entry) => entry.period.slice(5) === a.period.slice(5));
    return b && !a.partialThrough && !b.partialThrough ? [{ month: Number(a.period.slice(5)), left: a.count, right: b.count }] : [];
  });
  const leftSum = pairedMonths.reduce((sum, row) => sum + row.left, 0);
  const rightSum = pairedMonths.reduce((sum, row) => sum + row.right, 0);
  const cells = [left, right].map((year) => ({ year, ...summarizeVocYear(year) }));
  const leftBoard = publicBoardYear(left);
  const rightBoard = publicBoardYear(right);
  const boardComparable = leftBoard?.isFullYear && rightBoard?.isFullYear;
  const leftTopics = publicBoardTopics(left);
  const rightTopics = publicBoardTopics(right);
  const boardTopicRows = leftTopics && rightTopics ? vocTopics.map(({ id, label }) => {
    const leftCount = leftTopics.ranked.find((topic) => topic.id === id)?.count ?? 0;
    const rightCount = rightTopics.ranked.find((topic) => topic.id === id)?.count ?? 0;
    return { id, label, leftCount, rightCount, difference: rightCount - leftCount };
  }).filter(({ leftCount, rightCount }) => leftCount || rightCount) : [];
  const declines = [...boardTopicRows].filter(({ difference }) => difference < 0)
    .sort((a, b) => a.difference - b.difference).slice(0, 3);
  const emerging = boardTopicRows.filter(({ leftCount }) => leftCount === 0);
  const leftInquiries = leftBoard?.categories['문의'] ?? 0;
  const rightInquiries = rightBoard?.categories['문의'] ?? 0;
  const noticeRows = vocTopics.map(({ id, label }) => ({
    id, label, counts: cells.map(({ selectedNotices }) => selectedNotices.filter(({ topic }) => topic === id).length),
  })).filter(({ counts }) => counts.some(Boolean));

  return <section className="lab-block">
    <div className="lab-controls">
      <label>첫 번째 연도
        <select value={left} onChange={(event) => updateSelection('left', event.target.value)}>
          {vocYears.map(({ year }) => <option key={year}>{year}</option>)}
        </select>
      </label>
      <label>두 번째 연도
        <select value={right} onChange={(event) => updateSelection('right', event.target.value)}>
          {vocYears.map(({ year }) => <option key={year}>{year}</option>)}
        </select>
      </label>
    </div>
    {left === right ? <p role="status">서로 다른 연도를 선택하세요.</p> : <>
    {leftBoard && rightBoard && <dl className="lab-facts lab-facts--inline">
      <div><dt>총 문의 증감 · {left}년에서 {right}년</dt>
        <dd>{boardComparable
          ? `${formatSigned(rightInquiries - leftInquiries)}건 (${formatChange(leftInquiries, rightInquiries)})`
          : '두 연도의 연간 자료가 모두 있을 때 표시'}</dd></div>
      <div><dt>건수가 가장 줄어든 분류 상위 3</dt>
        <dd>{boardComparable ? (declines.length ? declines.map(({ label, difference }) => `${label} ${formatCount(difference)}건`).join(' · ') : '없음') : '연간 자료 기준으로만 표시'}</dd></div>
      <div><dt>{left}년 0건에서 새로 집계된 분류</dt>
        <dd>{boardComparable ? (emerging.length ? `${emerging.length}개 · ${emerging.map(({ label }) => label).join(' · ')}` : '없음') : '연간 자료 기준으로만 표시'}</dd></div>
    </dl>}
    {leftBoard && rightBoard && <>
      <h2>공개 고객게시판 원글</h2>
      <div className="lab-table-wrap" role="region" aria-label="게시판 분류별 원글 비교 표" tabIndex={0}>
        <table className="lab-table lab-table--sticky-first">
          <caption>게시판 분류별 원글 건수와 비중</caption>
          <thead><tr>
            <th scope="col">게시판 분류</th>
            <th scope="col">{left}년 · {leftBoard.label}</th>
            <th scope="col">{right}년 · {rightBoard.label}</th>
            {boardComparable && <th scope="col">{left}년에서 {right}년 증감률</th>}
          </tr></thead>
          <tbody>
            {['전체', ...boardCategories].map((category) => {
              const leftCount = category === '전체' ? leftBoard.total : leftBoard.categories[category] ?? 0;
              const rightCount = category === '전체' ? rightBoard.total : rightBoard.categories[category] ?? 0;
              if (!leftCount && !rightCount) return null;
              return <tr key={category}>
                <th scope="row">{category}</th>
                <td>{formatShare(leftCount, leftBoard.total)}</td>
                <td>{formatShare(rightCount, rightBoard.total)}</td>
                {boardComparable && <td>{formatChange(leftCount, rightCount)}</td>}
              </tr>;
            })}
          </tbody>
        </table>
        {!boardComparable && <p>증감률은 두 연도의 1월 1일~12월 31일 자료가 모두 있을 때 표시합니다.</p>}
      </div>
    </>}
    {leftTopics && rightTopics && <>
      <h2>공개 문의 자동 분류 주제</h2>
      <div className="lab-table-wrap" role="region" aria-label="공개 문의 분류 비교 표" tabIndex={0}>
        <table className="lab-table lab-table--sticky-first">
          <caption>주제별 건수와 해당 연도 전체 공개 문의 대비 비중</caption>
          <thead><tr><th scope="col">주제</th><th scope="col">{left}년 · {leftBoard?.label}</th><th scope="col">{right}년 · {rightBoard?.label}</th>
            {boardComparable && <th scope="col">{left}년에서 {right}년 건수 변화</th>}</tr></thead>
          <tbody>{boardTopicRows.map(({ id, label, leftCount, rightCount, difference }) =>
            <tr key={id}><th scope="row"><a href={topicBase + id + '/'}>{label}</a></th>
              <td>{formatShare(leftCount, leftTopics.total)}</td><td>{formatShare(rightCount, rightTopics.total)}</td>
              {boardComparable && <td>{formatSigned(difference)}건</td>}
            </tr>
          )}
          <tr><th scope="row">여러 주제</th><td>{formatShare(leftTopics.ambiguous, leftTopics.total)}</td><td>{formatShare(rightTopics.ambiguous, rightTopics.total)}</td>{boardComparable && <td>—</td>}</tr>
          <tr><th scope="row">분류 미확인</th><td>{formatShare(leftTopics.unclassified, leftTopics.total)}</td><td>{formatShare(rightTopics.unclassified, rightTopics.total)}</td>{boardComparable && <td>—</td>}</tr>
          </tbody>
        </table>
      </div>
    </>}
    {pairedMonths.length > 0 && <section id="monthly">
      <h2>같은 달끼리 비교</h2>
      <label>비교할 문의 주제 <select value={topic} onChange={(event) => updateSelection('topic', event.target.value)}>
        <option value="">단일 주제 분류 전체</option>
        {vocTopics.filter(({ id }) => id !== 'other').map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <p>두 연도에서 월말까지 수집한 달만 비교합니다. 여러 주제에 해당하거나 분류되지 않은 문의는 제외합니다.</p>
      <div className="lab-table-wrap" role="region" aria-label="월별 문의 비교 표" tabIndex={0}><table className="lab-table lab-table--sticky-first">
        <caption>{left}년과 {right}년의 월별 문의 건수</caption>
        <thead><tr><th scope="col">월</th><th scope="col">{left}년</th><th scope="col">{right}년</th><th scope="col">건수 차이</th></tr></thead>
        <tbody>{pairedMonths.map((row) => <tr key={row.month}>
          <th scope="row">{row.month}월</th><td>{formatCount(row.left)}</td><td>{formatCount(row.right)}</td>
          <td>{formatSigned(row.right - row.left)}</td>
        </tr>)}</tbody>
        <tfoot><tr><th scope="row">{pairedMonths.length}개월 합계</th><td>{formatCount(leftSum)}</td><td>{formatCount(rightSum)}</td>
          <td>{formatSigned(rightSum - leftSum)}</td></tr></tfoot>
      </table></div>
    </section>}
    {noticeRows.length > 0 && <>
      <h2>주제별 수록 공지 표본</h2>
      <div className="lab-table-wrap" role="region" aria-label="수록 공지 비교 표" tabIndex={0}>
        <table className="lab-table lab-table--sticky-first">
          <caption>VOC Studio에 수록한 공지의 주제별 건수</caption>
          <thead><tr><th scope="col">주제</th><th scope="col">{left}년</th><th scope="col">{right}년</th></tr></thead>
          <tbody>{noticeRows.map(({ id, label, counts }) => <tr key={id}>
            <th scope="row"><a href={topicBase + id + '/'}>{label}</a></th>
            {counts.map((count, index) => <td key={cells[index].year}>{count ? count + '건' : '수록 표본 없음'}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
    </>}
    <h2>연도별 상세</h2>
    <p>문의 예시, 키워드, 공지 전후 문의 변화는 각 연도 페이지에 있습니다.</p>
    <ul className="lab-list lab-list--rows">
      {cells.map(({ year, coverage, selectedPosts, selectedNotices }) => <li key={year}>
        <a className="row-title" href={yearBase + year + '/'}>{year}년 고객 문의와 공지</a>
        <span>{coverage?.period} · 문의 예시 {selectedPosts.length ? selectedPosts.length + '건' : '자료 확인 중'} · 수록 공지 {selectedNotices.length ? selectedNotices.length + '건' : '자료 확인 중'}</span>
      </li>)}
    </ul></>}
  </section>;
}

import { useState } from 'react';
import { hasCompleteInquiryYear, summarizeVocYear, vocTopics, vocYears } from '../../utils/voc';
import VocKeywords from './VocKeywords';
import { generalNoticeYear, publicBoardTopics, publicBoardYear } from '../../utils/voc-public-board';

const boardCategories = ['문의', '제안', '칭찬·불만', '분류 확인 중'];
const formatCount = (value: number) => value.toLocaleString('ko-KR');
const formatShare = (count: number, total: number) => `${formatCount(count)}건 · ${(count / total * 100).toFixed(1)}%`;

export default function VocCompare({ yearBase, topicBase }: { yearBase: string; topicBase: string }) {
  const [left, setLeft] = useState(2024);
  const [right, setRight] = useState(2025);
  const cells = [left, right].map((year) => ({ year, ...summarizeVocYear(year) }));
  const [leftCell, rightCell] = cells;
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
  const comparable = cells.every(({ coverage }) => hasCompleteInquiryYear(coverage))
    && leftCell.coverage?.collectionId === rightCell.coverage?.collectionId;
  const questionRows = comparable ? vocTopics.map(({ id, label }) => {
    const leftCount = leftCell.topicCounts.find((topic) => topic.id === id)?.count ?? 0;
    const rightCount = rightCell.topicCounts.find((topic) => topic.id === id)?.count ?? 0;
    return { id, label, leftCount, rightCount };
  }).filter(({ leftCount, rightCount }) => leftCount || rightCount) : [];
  const noticeRows = vocTopics.map(({ id, label }) => ({
    id, label, counts: cells.map(({ selectedNotices }) => selectedNotices.filter(({ topic }) => topic === id).length),
  })).filter(({ counts }) => counts.some(Boolean));

  return <section className="lab-block">
    <div className="lab-controls">
      <label>첫 번째 연도
        <select value={left} onChange={(event) => setLeft(Number(event.target.value))}>
          {vocYears.map(({ year }) => <option key={year}>{year}</option>)}
        </select>
      </label>
      <label>두 번째 연도
        <select value={right} onChange={(event) => setRight(Number(event.target.value))}>
          {vocYears.map(({ year }) => <option key={year}>{year}</option>)}
        </select>
      </label>
    </div>
    {left === right ? <p role="status">서로 다른 연도를 선택하세요.</p> : <>
    {leftBoard && rightBoard && <div className="lab-table-wrap">
      <table className="lab-table">
        <caption>공개 고객게시판 원글 비교</caption>
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
            const change = leftCount ? ((rightCount / leftCount - 1) * 100).toLocaleString('ko-KR', {
              minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero',
            }) + '%' : '기준 0건';
            return <tr key={category}>
              <th scope="row">{category}</th>
              <td>{formatShare(leftCount, leftBoard.total)}</td>
              <td>{formatShare(rightCount, rightBoard.total)}</td>
              {boardComparable && <td>{change}</td>}
            </tr>;
          })}
        </tbody>
      </table>
      {!boardComparable && <p>증감률은 두 연도의 1월 1일~12월 31일 자료가 모두 있을 때 표시합니다.</p>}
    </div>}
    {leftTopics && rightTopics && <div className="lab-table-wrap">
      <table className="lab-table">
        <caption>공개 문의 자동 분류 주제</caption>
        <thead><tr><th scope="col">주제</th><th scope="col">{left}년 · {leftBoard?.label}</th><th scope="col">{right}년 · {rightBoard?.label}</th>
          {boardComparable && <th scope="col">{left}년에서 {right}년 건수 변화</th>}</tr></thead>
        <tbody>{boardTopicRows.map(({ id, label, leftCount, rightCount, difference }) =>
          <tr key={id}><th scope="row"><a href={topicBase + id + '/'}>{label}</a></th>
            <td>{formatShare(leftCount, leftTopics.total)}</td><td>{formatShare(rightCount, rightTopics.total)}</td>
            {boardComparable && <td>{difference.toLocaleString('ko-KR', { signDisplay: 'exceptZero' })}건</td>}
          </tr>
        )}
        <tr><th scope="row">여러 주제</th><td>{formatShare(leftTopics.ambiguous, leftTopics.total)}</td><td>{formatShare(rightTopics.ambiguous, rightTopics.total)}</td>{boardComparable && <td>—</td>}</tr>
        <tr><th scope="row">분류 미확인</th><td>{formatShare(leftTopics.unclassified, leftTopics.total)}</td><td>{formatShare(rightTopics.unclassified, rightTopics.total)}</td>{boardComparable && <td>—</td>}</tr>
        </tbody>
      </table>
      {boardComparable && <dl className="lab-facts">
        <div><dt>{left}년 0건에서 {right}년 집계가 생긴 분류</dt><dd>{emerging.length ? emerging.map(({ label }) => label).join(' · ') : '없음'}</dd></div>
        <div><dt>{left}년에서 {right}년으로 건수가 줄어든 주요 분류</dt>
          <dd>{declines.length ? declines.map(({ label, difference }) => `${label} ${formatCount(difference)}건`).join(' · ') : '없음'}</dd></div>
      </dl>}
    </div>}
    <div className="lab-grid">
      {cells.map(({ year, coverage, selectedPosts, selectedNotices, topicCounts, keywords }) => {
        const complete = hasCompleteInquiryYear(coverage);
        const boardTopics = publicBoardTopics(year);
        const noticeCount = generalNoticeYear(year);
        return <article key={year} className="lab-card">
          <h2><a href={yearBase + year + '/'}>{year}년</a></h2>
          <p>{coverage?.period}</p>
          <p>{complete ? '확인 범위 문의' : '수록 문의 표본'} {complete || selectedPosts.length ? selectedPosts.length + '건' : '자료 확인 중'}</p>
          <p>수록 공지 {selectedNotices.length ? selectedNotices.length + '건' : '자료 확인 중'}</p>
          {noticeCount !== undefined && <p>일반 공지 등록 {formatCount(noticeCount)}건 · {publicBoardYear(year)?.label}</p>}
          {boardTopics && <>
            <h3>공개 문의 주제 Top 10</h3>
            <ol>{boardTopics.ranked.slice(0, 10).map(({ id, label, count }) => <li key={id}>
              <a href={topicBase + id + '/'}>{label}</a> · {formatCount(count)}건
            </li>)}</ol>
          </>}
          {topicCounts.length > 0 && <>
            <h3>{complete ? '문의 주제 Top 10' : '표본 주제'}</h3>
            <ol>{topicCounts.slice(0, complete ? 10 : undefined).map(({ id, label, count }) => <li key={id}><a href={topicBase + id + '/'}>{label}</a> {count}건</li>)}</ol>
          </>}
          <h3>{complete ? '문의 키워드' : '표본 키워드'}</h3>
          <VocKeywords keywords={keywords} />
        </article>;
      })}
    </div>
    {comparable ? <div className="lab-table-wrap">
      <table className="lab-table">
        <caption>같은 수집 기준의 연간 문의 비교</caption>
        <thead><tr><th scope="col">주제</th><th scope="col">{left}년 건수·비중</th><th scope="col">{right}년 건수·비중</th><th scope="col">{left}년에서 {right}년 변화</th></tr></thead>
        <tbody>{questionRows.map(({ id, label, leftCount, rightCount }) => <tr key={id}>
          <th scope="row"><a href={topicBase + id + '/'}>{label}</a></th>
          <td>{leftCount}건 · {leftCell.selectedPosts.length ? (100 * leftCount / leftCell.selectedPosts.length).toFixed(1) + '%' : '비중 없음'}</td>
          <td>{rightCount}건 · {rightCell.selectedPosts.length ? (100 * rightCount / rightCell.selectedPosts.length).toFixed(1) + '%' : '비중 없음'}</td>
          <td>{(rightCount - leftCount).toLocaleString('ko-KR', { signDisplay: 'exceptZero' })}건</td>
        </tr>)}</tbody>
      </table>
    </div> : <p>본문 검토 표본은 두 연도의 주제 증감률을 산정하기에 부족합니다.</p>}
    {noticeRows.length > 0 && <div className="lab-table-wrap">
      <table className="lab-table">
        <caption>주제별 수록 공지 표본</caption>
        <thead><tr><th scope="col">주제</th><th scope="col">{left}년</th><th scope="col">{right}년</th></tr></thead>
        <tbody>{noticeRows.map(({ id, label, counts }) => <tr key={id}>
          <th scope="row"><a href={topicBase + id + '/'}>{label}</a></th>
          {counts.map((count, index) => <td key={cells[index].year}>{count ? count + '건' : '수록 표본 없음'}</td>)}
        </tr>)}</tbody>
      </table>
    </div>}</>}
  </section>;
}

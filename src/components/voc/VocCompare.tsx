import { useState } from 'react';
import { summarizeVocYear, vocYears } from '../../utils/voc';

export default function VocCompare() {
  const [left, setLeft] = useState(vocYears[0].year);
  const [right, setRight] = useState(vocYears[1].year);
  const cells = [left, right].map((year) => ({ year, ...summarizeVocYear(year) }));

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
    {left === right ? <p role="status">서로 다른 연도를 선택하세요.</p> : <div className="lab-grid">
      {cells.map(({ year, coverage, selectedPosts, selectedNotices, topicCounts }) => <article key={year} className="lab-card">
        <h2>{year}년 · {coverage?.period}</h2>
        <p>수록 문의 {selectedPosts.length ? selectedPosts.length + '건' : '자료 확인 중'}</p>
        <p>수록 공지 {selectedNotices.length ? selectedNotices.length + '건' : '자료 확인 중'}</p>
        {topicCounts.length > 0 && <ul>{topicCounts.map(({ id, label, count }) => <li key={id}>{label} {count}건</li>)}</ul>}
      </article>)}
    </div>}
  </section>;
}

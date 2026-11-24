import { useState } from 'react';
import questions from '../../../data/market/game.json';
import events from '../../../data/market/events.json';

export default function ReturnerGame() {
  const [answers, setAnswers] = useState<number[]>([]);
  const [shared, setShared] = useState(false);
  const question = questions[answers.length];

  if (question) {
    return <section className="lab-block">
      <p role="status">문제 {answers.length + 1} / {questions.length}</p>
      <h2>{question.prompt}</h2>
      <ul className="lab-list">{question.choices.map((choice, index) => (
        <li key={choice}><button className="lab-button" onClick={() => setAnswers([...answers, index])}>{choice}</button></li>
      ))}</ul>
    </section>;
  }

  const score = questions.filter(({ answer }, index) => answer === answers[index]).length;
  const grade = score >= 9 ? 'S' : score >= 7 ? 'A' : score >= 5 ? 'B' : 'C';
  const result = `Market Time Capsule · ${questions.length}문제 중 ${score}개 정답 · ${grade}등급`;

  return <section className="lab-block">
    <h2>퀴즈 결과</h2>
    <p role="status">{result}</p>
    <div className="lab-controls">
      <button onClick={() => { setAnswers([]); setShared(false); }}>다시 풀기</button>
      <button onClick={() => navigator.clipboard.writeText(result + '\n' + location.href).then(() => setShared(true)).catch(() => setShared(false))}>결과 복사</button>
    </div>
    {shared && <p role="status">결과를 복사했습니다.</p>}
    <ol className="lab-list">{questions.map(({ date, prompt, choices, answer }, index) => {
      const event = events.find((item) => item.date === date);
      return <li className="lab-card" key={date}>
        <strong>{index + 1}. {prompt}</strong>
        <span>선택 {choices[answers[index]]} · 정답 {choices[answer]}</span>
        {event && <a href={event.sourceUrl}>{event.sourceName}</a>}
      </li>;
    })}</ol>
  </section>;
}

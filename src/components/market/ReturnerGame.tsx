import { useEffect, useRef, useState } from 'react';
import questions from '../../../data/market/game.json';
import events from '../../../data/market/events.json';

interface Props {
  monthBase: string;
  assets: { period: string; firstDate: string; lastDate: string; multiples: number[] };
}

export default function ReturnerGame({ monthBase, assets }: Props) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [shareStatus, setShareStatus] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const question = questions[answers.length];
  useEffect(() => {
    if (started.current) heading.current?.focus();
  }, [answers.length]);

  if (question) {
    return <section className="lab-block">
      <p role="status">문제 {answers.length + 1} / {questions.length}</p>
      <h2 ref={heading} tabIndex={-1}>{question.prompt}</h2>
      <ul className="lab-list">{question.choices.map((choice, index) => (
        <li key={choice}><button className="lab-button" onClick={() => {
          started.current = true;
          setAnswers([...answers, index]);
        }}>{choice}</button></li>
      ))}</ul>
    </section>;
  }

  const score = questions.filter(({ answer }, index) => answer === answers[index]).length;
  const grade = score >= 9 ? 'S' : score >= 7 ? 'A' : score >= 5 ? 'B' : 'C';
  const startingBalance = 1_000_000;
  const virtualBalance = startingBalance + score * 100_000;
  const formattedBalance = virtualBalance.toLocaleString('ko-KR') + '원';
  const result = `Market Time Capsule · ${questions.length}문제 중 ${score}개 정답 · ${grade}등급 · 게임 잔액 ${formattedBalance}`;
  const assetQuestion = questions.findIndex(({ date, series }) => date === assets.period && series?.length === 1 && series[0] === 'DEXKOUS');
  const assetChoices = questions[assetQuestion]?.choices;

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(result + '\n' + location.href);
      setShareStatus('결과를 복사했습니다.');
    } catch {
      setShareStatus('복사할 수 없습니다. 위 카드의 결과를 선택해 복사하세요.');
    }
  }

  function downloadResult() {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const context = canvas.getContext('2d');
    if (!context) {
      setShareStatus('결과 이미지를 만들 수 없습니다.');
      return;
    }
    context.fillStyle = '#101923';
    context.fillRect(0, 0, 960, 540);
    context.strokeStyle = '#94d4ec';
    context.lineWidth = 3;
    context.strokeRect(40, 40, 880, 460);
    context.fillStyle = '#94d4ec';
    context.font = '30px system-ui, sans-serif';
    context.fillText('INSIGHT LAB · MARKET TIME CAPSULE', 85, 125);
    context.fillStyle = '#fff';
    context.font = 'bold 64px system-ui, sans-serif';
    context.fillText(`${grade}등급 · ${score}/${questions.length} 정답`, 85, 250);
    context.font = '42px system-ui, sans-serif';
    context.fillText(`게임 잔액 ${formattedBalance}`, 85, 340);
    context.font = '23px system-ui, sans-serif';
    context.fillText('가상 시작금 100만 원 · 정답마다 10만 원', 85, 430);
    const link = document.createElement('a');
    link.download = 'market-time-capsule-result.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    setShareStatus('결과 이미지 다운로드를 시작했습니다.');
  }

  return <section className="lab-block">
    <h2 ref={heading} tabIndex={-1}>퀴즈 결과</h2>
    <div className="lab-card" role="status">
      <strong>{grade}등급 · {score}/{questions.length} 정답</strong>
      <span>게임 잔액 {formattedBalance}</span>
      <p>가상 시작금 100만 원에 정답마다 10만 원을 더하는 게임 점수입니다.</p>
    </div>
    <div className="lab-controls">
      <button onClick={() => { setAnswers([]); setShareStatus(''); }}>다시 풀기</button>
      <button onClick={copyResult}>결과 복사</button>
      <button onClick={downloadResult}>결과 이미지 저장</button>
    </div>
    {shareStatus && <p role="status">{shareStatus}</p>}
    {assetChoices && <section aria-labelledby="asset-outcome">
      <h3 id="asset-outcome">자산 선택의 가상 평가액</h3>
      <p>{assets.firstDate}~{assets.lastDate}에 각 선택지에 100만 원을 넣었을 때의 원화 평가액입니다. 배당·이자·거래 비용은 제외했습니다.</p>
      <ul className="lab-list">{assetChoices.map((choice, index) => (
        <li key={choice} className="lab-card">
          <strong>{choice}{answers[assetQuestion] === index && ' · 내가 선택한 자산'}</strong>
          <span>{Math.round(startingBalance * assets.multiples[index]).toLocaleString('ko-KR')}원</span>
        </li>
      ))}</ul>
      <a href={monthBase + assets.period.replace('-', '/') + '/'}>시장 지표와 출처</a>
    </section>}
    <ol className="lab-list">{questions.map(({ date, prompt, choices, answer, series, explanation, sourceUrl, sourceName }, index) => {
      const event = events.find((item) => item.date === date);
      return <li className="lab-card" key={prompt}>
        <strong>{index + 1}. {prompt}</strong>
        <span>선택 {choices[answers[index]]} · 정답 {choices[answer]}</span>
        {explanation && <p>{explanation}</p>}
        {series ? <>
          <a href={monthBase + date.replace('-', '/') + '/'}>해당 월 관측값 보기</a>
          <ul>{series.map((id) => <li key={id}><a href={'https://fred.stlouisfed.org/series/' + id}>FRED · {id}</a></li>)}</ul>
        </> : sourceUrl ? <a href={sourceUrl}>{sourceName}</a> : event && <a href={event.sourceUrl}>{event.sourceName}</a>}
      </li>;
    })}</ol>
  </section>;
}

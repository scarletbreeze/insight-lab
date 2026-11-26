import { useEffect, useRef, useState } from 'react';
import questions from '../../../data/market/game.json';

interface Props {
  monthBase: string;
  assets: { period: string; firstDate: string; lastDate: string; multiples: number[] }[];
}

export default function ReturnerGame({ monthBase, assets }: Props) {
  const [answers, setAnswers] = useState<number[]>([]);
  const [shareStatus, setShareStatus] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const [period, setPeriod] = useState('2020-03');
  const scenario = assets.find((item) => item.period === period) ?? assets[0];
  const gameQuestions = questions.map((item) => {
    if (!scenario || item.date !== '2020-03' || item.series?.[0] !== 'DEXKOUS') return item;
    const best = Math.max(...scenario.multiples);
    return { ...item, date: scenario.period, prompt: scenario.period + ' 첫 거래일에서 마지막 거래일까지 원화 기준 평가액이 가장 높았던 선택은 무엇일까요?',
      answer: scenario.multiples.indexOf(best), explanation: '각 선택지의 원화 평가액과 관측 날짜는 결과표에서 확인할 수 있습니다.' };
  });
  const question = gameQuestions[answers.length];
  useEffect(() => {
    if (started.current) heading.current?.focus();
  }, [answers.length]);

  if (question) {
    return <section className="lab-block">
      <p role="status">문제 {answers.length + 1} / {questions.length}</p>
      {answers.length === 0 && scenario && <label>자산 선택 문항의 투자 시기 <select value={scenario.period} onChange={(event) => setPeriod(event.target.value)}>
        {assets.map(({ period }) => <option key={period} value={period}>{period}</option>)}
      </select></label>}
      <h2 ref={heading} tabIndex={-1}>{question.prompt}</h2>
      <ul className="lab-list">{question.choices.map((choice, index) => (
        <li key={choice}><button className="lab-button" onClick={() => {
          started.current = true;
          setAnswers([...answers, index]);
        }}>{choice}</button></li>
      ))}</ul>
    </section>;
  }

  const score = gameQuestions.filter(({ answer }, index) => answer === answers[index]).length;
  const grade = score >= 9 ? 'S' : score >= 7 ? 'A' : score >= 5 ? 'B' : 'C';
  const startingBalance = 1_000_000;
  const assetQuestion = gameQuestions.findIndex(({ date, series }) => date === scenario?.period && series?.length === 1 && series[0] === 'DEXKOUS');
  const assetChoices = gameQuestions[assetQuestion]?.choices;
  const chosenAsset = assetChoices?.[answers[assetQuestion]];
  const multiple = scenario?.multiples[answers[assetQuestion]];
  const outcome = multiple == null ? '' : Math.round(startingBalance * multiple).toLocaleString('ko-KR') + '원';
  const result = [`Market Time Capsule · ${questions.length}문제 중 ${score}개 정답 · ${grade}등급`,
    outcome && `${scenario.period} · ${chosenAsset} · 100만 원의 가상 평가액 ${outcome}`].filter(Boolean).join('\n');

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
    context.fillText(`가상 평가액 ${outcome}`, 85, 340);
    context.font = '23px system-ui, sans-serif';
    context.fillText(scenario ? scenario.period + ' · ' + chosenAsset + ' · 시작금 100만 원' : '', 85, 430);
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
      {outcome && <span>{scenario.period} · {chosenAsset} · 가상 평가액 {outcome}</span>}
      <p>정답 수로 등급을 매기고, 선택한 자산의 기간 수익률로 시작금 100만 원의 평가액을 계산합니다.</p>
    </div>
    <div className="lab-controls">
      <button onClick={() => { setAnswers([]); setShareStatus(''); }}>다시 풀기</button>
      <button onClick={copyResult}>결과 복사</button>
      <button onClick={downloadResult}>결과 이미지 저장</button>
    </div>
    {shareStatus && <p role="status">{shareStatus}</p>}
    {assetChoices && scenario && <section aria-labelledby="asset-outcome">
      <h3 id="asset-outcome">자산 선택의 가상 평가액</h3>
      <p>{scenario.firstDate}~{scenario.lastDate}에 각 선택지에 100만 원을 넣었을 때의 원화 평가액입니다. 배당·이자·거래 비용은 제외했습니다.</p>
      <ul className="lab-list">{assetChoices.map((choice, index) => (
        <li key={choice} className="lab-card">
          <strong>{choice}{answers[assetQuestion] === index && ' · 내가 선택한 자산'}</strong>
          <span>{Math.round(startingBalance * scenario.multiples[index]).toLocaleString('ko-KR')}원</span>
        </li>
      ))}</ul>
      <a href={monthBase + scenario.period.replace('-', '/') + '/'}>시장 지표와 출처</a>
    </section>}
    <ol className="lab-list">{gameQuestions.map(({ date, prompt, choices, answer, series, explanation, sourceUrl, sourceName }, index) => {
      return <li className="lab-card" key={prompt}>
        <strong>{index + 1}. {prompt}</strong>
        <span>선택 {choices[answers[index]]} · 정답 {choices[answer]}</span>
        {explanation && <p>{explanation}</p>}
        {series ? <>
          <a href={monthBase + date.replace('-', '/') + '/'}>해당 월 관측값 보기</a>
          <ul>{series.map((id) => <li key={id}><a href={'https://fred.stlouisfed.org/series/' + id}>FRED · {id}</a></li>)}</ul>
        </> : sourceUrl && <a href={sourceUrl}>{sourceName}</a>}
      </li>;
    })}</ol>
  </section>;
}

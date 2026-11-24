import { useState } from 'react';
import layouts from '../../../data/hero/layouts.json';
import { screenByNumber } from '../../utils/hero';

type Style = keyof typeof layouts.style;
type Focus = keyof typeof layouts.focus;

export default function LayoutPlanner({ screenBase }: { screenBase: string }) {
  const [monitors, setMonitors] = useState(1);
  const [style, setStyle] = useState<Style>('단타');
  const [focus, setFocus] = useState<Focus>('시황');
  const isDerivative = style === '파생';
  const focusScreen = layouts.focus[focus];
  const supportsFocus = style !== '해외' && (!isDerivative || layouts.style.파생.includes(focusScreen));
  const candidates = [
    ...new Set([...(supportsFocus ? [focusScreen] : []), ...layouts.style[style]]),
  ];
  const panels = Array.from({ length: monitors }, (_, monitor) => (
    candidates.filter((_, index) => index % monitors === monitor)
  ));

  return (
    <section aria-label="화면 배치 구성">
      <div className="hero-filters">
        <label>모니터 수
          <select value={monitors} onChange={(event) => setMonitors(Number(event.target.value))}>
            {[1, 2, 3].map((count) => <option key={count} value={count}>{count}대</option>)}
          </select>
        </label>
        <label>투자 스타일
          <select value={style} onChange={(event) => setStyle(event.target.value as Style)}>
            {Object.keys(layouts.style).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>관심 분야
          <select value={focus} onChange={(event) => setFocus(event.target.value as Focus)}>
            {Object.keys(layouts.focus).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      {!candidates.length ? <p className="empty-state" role="status">해외 화면 구성 자료 확인 중</p> : <>
        {!supportsFocus && <p className="hero-status" role="status">선택한 스타일과 관심 분야에 모두 맞는 화면은 자료 확인 중입니다.</p>}
        <div className="hero-grid monitor-grid" aria-label="모니터별 배치 예시">
          {panels.map((panel, index) => (
            <section key={index} className="monitor">
              <h2>모니터 {index + 1}</h2>
              {panel.length ? <ul>
                {panel.map((number) => <li key={number}>
                  <a href={screenBase + number + '/'}>{number} {screenByNumber(number).title}</a>
                </li>)}
              </ul> : <p>배정한 화면이 없습니다.</p>}
            </section>
          ))}
        </div>
      </>}
    </section>
  );
}

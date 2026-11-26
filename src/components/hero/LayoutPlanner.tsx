import { useState } from 'react';
import layouts from '../../../data/hero/layouts.json';

type Style = keyof typeof layouts.style;
type Focus = keyof typeof layouts.focus;
const derivativeFocus: Partial<Record<Focus, string>> = layouts.derivativeFocus;
const overseasFocus: Partial<Record<Focus, string>> = layouts.overseasFocus;

export default function LayoutPlanner({ screenBase, cards }: { screenBase: string; cards: Record<string, { title: string; screenType: string }> }) {
  const [monitors, setMonitors] = useState(1);
  const [style, setStyle] = useState<Style>('단타');
  const [focus, setFocus] = useState<Focus>('시황');
  const focusScreen = (style === '파생' ? derivativeFocus : style === '해외' ? overseasFocus : layouts.focus)[focus];
  const candidates = [
    ...new Set([...(focusScreen ? [focusScreen] : []), ...layouts.style[style]]),
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
        {style === '파생' && focus === '수급' && <p className="hero-status">0780에서 선물·콜옵션·풋옵션 중 비교할 시장을 선택하세요.</p>}
        {!focusScreen && <p className="hero-status" role="status">선택한 관심 분야의 전용 화면은 자료 확인 중입니다. 아래는 {style} 기본 배치입니다.</p>}
        <div className="hero-grid monitor-grid" role="group" aria-label={`${monitors}대 모니터 화면 배치`}>
          {panels.map((panel, index) => (
            <section key={index} className="monitor">
              <h2>모니터 {index + 1}</h2>
              {panel.length ? <ul className="monitor-windows">
                {panel.map((number) => {
                  const screen = cards[number];
                  return <li key={number} data-primary={number === focusScreen}>
                    <a href={screenBase + number + '/'}>
                      <small>{number} · {screen.screenType}{number === focusScreen && ' · 중심 화면'}</small>
                      <strong>{screen.title}</strong>
                    </a>
                  </li>;
                })}
              </ul> : <p>배정한 화면이 없습니다.</p>}
            </section>
          ))}
        </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import layouts from '../../../data/hero/layouts.json';
import workflows from '../../../data/hero/recipes.json';

type Style = keyof typeof layouts.style;
type Focus = keyof typeof layouts.focus;
type Selection = { monitors: number; style: Style; focus: Focus; recipe: string };
const initial: Selection = { monitors: 1, style: '단타', focus: '시황', recipe: '' };
const derivativeFocus: Partial<Record<Focus, string>> = layouts.derivativeFocus;
const overseasFocus: Partial<Record<Focus, string>> = layouts.overseasFocus;

function readSelection(params: URLSearchParams): Selection {
  const monitors = Number(params.get('monitors'));
  const style = params.get('style') as Style;
  const focus = params.get('focus') as Focus;
  return {
    monitors: [1, 2, 3].includes(monitors) ? monitors : initial.monitors,
    style: Object.hasOwn(layouts.style, style) ? style : initial.style,
    focus: Object.hasOwn(layouts.focus, focus) ? focus : initial.focus,
    recipe: workflows.find(({ slug }) => slug === params.get('recipe'))?.slug ?? '',
  };
}

interface Props {
  screenBase: string;
  recipeBase: string;
  cards: Record<string, { title: string; screenType: string }>;
}

export default function LayoutPlanner({ screenBase, recipeBase, cards }: Props) {
  const [selection, setSelection] = useState(initial);
  const { monitors, style, focus, recipe } = selection;
  useEffect(() => {
    const restore = () => setSelection(readSelection(new URLSearchParams(location.search)));
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  function select(change: Partial<Selection>) {
    const next = { ...selection, ...change };
    setSelection(next);
    const url = new URL(location.href);
    for (const key of ['monitors', 'style', 'focus', 'recipe'] as const) {
      if (next[key] === initial[key]) url.searchParams.delete(key);
      else url.searchParams.set(key, String(next[key]));
    }
    history.replaceState(history.state, '', url);
  }

  const workflow = workflows.find(({ slug }) => slug === recipe);
  const focusScreen = workflow ? undefined : (style === '파생' ? derivativeFocus : style === '해외' ? overseasFocus : layouts.focus)[focus];
  const candidates = workflow ? workflow.steps.map(step => step.number) :
    [...new Set([...(focusScreen ? [focusScreen] : []), ...layouts.style[style]])];
  const panels = Array.from({ length: monitors }, (_, monitor) => candidates.filter((_, index) => index % monitors === monitor));

  return (
    <section aria-label="화면 배치 구성">
      <div className="hero-filters layout-controls">
        <label>화면 조합
          <select value={recipe} onChange={(event) => select({ recipe: event.target.value })}>
            <option value="">투자 스타일로 구성</option>
            {workflows.map(({ slug, title }) => <option key={slug} value={slug}>{title}</option>)}
          </select>
        </label>
        <label>모니터 수
          <select value={monitors} onChange={(event) => select({ monitors: Number(event.target.value) })}>
            {[1, 2, 3].map((count) => <option key={count} value={count}>{count}대</option>)}
          </select>
        </label>
        {!workflow && <>
          <label>투자 스타일
            <select value={style} onChange={(event) => select({ style: event.target.value as Style })}>
              {Object.keys(layouts.style).map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>관심 분야
            <select value={focus} onChange={(event) => select({ focus: event.target.value as Focus })}>
              {Object.keys(layouts.focus).map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </>}
      </div>
      {workflow && <p className="hero-status">{workflow.summary} <a href={recipeBase + '#' + workflow.slug}>조합 설명과 근거</a></p>}
      {!workflow && style === '파생' && focus === '수급' && <p className="hero-status">0780에서 선물·콜옵션·풋옵션 중 비교할 시장을 선택하세요.</p>}
      {!workflow && !focusScreen && <p className="hero-status" role="status">선택한 관심 분야의 전용 화면은 자료 확인 중입니다. 아래는 {style} 기본 배치입니다.</p>}
      <div className="hero-grid monitor-grid" role="group" aria-label={`${monitors}대 모니터 화면 배치`}>
        {panels.map((panel, index) => (
          <section key={index} className="monitor">
            <h2>모니터 {index + 1}</h2>
            {panel.length ? <ul className="monitor-windows">
              {panel.map((number) => {
                const screen = cards[number];
                const step = workflow?.steps.findIndex(item => item.number === number);
                return <li key={number} data-primary={number === focusScreen}>
                  <a href={screenBase + number + '/'}>
                    <small>{step !== undefined && `${step + 1}단계 · `}{number} · {screen.screenType}{number === focusScreen && ' · 중심 화면'}</small>
                    <strong>{screen.title}</strong>
                  </a>
                  {step !== undefined && <p>{workflow?.steps[step].note}</p>}
                </li>;
              })}
            </ul> : <p>이 모니터에 배정된 화면이 없습니다.</p>}
          </section>
        ))}
      </div>
    </section>
  );
}

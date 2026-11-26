import { useEffect, useState } from 'react';
import { findServices, services } from '../../utils/services';
import type { SearchRecord } from '../../utils/catalog';

const previewCount = 5;

function resultLink(base: string, item: SearchRecord) {
  const { route, query, anchor, title, summary } = item;
  const href = base + route + '/' + (query ? '?' + query : '') + (anchor ? '#' + anchor : '');
  return <li key={href + title}><a href={href}>
    <strong>{title}</strong>{summary && <span>{summary}</span>}
  </a></li>;
}

export default function SearchPanel({ base }: { base: string }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchRecord[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const active = Boolean(query.trim());

  useEffect(() => {
    if (!active || index) return;
    const controller = new AbortController();
    setFailed(false);
    fetch(base + 'search-index.json', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<SearchRecord[]>;
      })
      .then(records => { if (!controller.signal.aborted) setIndex(records); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [active, attempt, base, index]);

  useEffect(() => {
    const restore = () => setQuery(new URL(window.location.href).searchParams.get('q') ?? '');
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  function updateQuery(value: string) {
    setQuery(value);
    const url = new URL(window.location.href);
    if (url.hash.startsWith('#results-')) url.hash = '';
    if (value.trim()) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', url);
  }

  const matchingServices = findServices(query);
  const terms = query.trim().toLowerCase().split(/\s+/);
  const records = active && index ? index.filter(({ title, summary, keywords }) => {
    const text = [title, summary, ...(keywords ?? [])].join(' ').toLowerCase();
    return terms.every(term => text.includes(term));
  }) : [];
  const groups = services.map((service) => ({
    service,
    matched: matchingServices.includes(service),
    items: records.filter(({ service: slug }) => slug === service.slug),
  })).filter(({ matched, items }) => matched || items.length);
  const count = matchingServices.length + records.length;

  let status = active ? `검색 결과 ${count}개` : '전체 서비스';
  if (active && !index) status = failed ? '검색 자료를 불러오지 못했습니다.' : '검색 자료를 불러오는 중입니다.';
  return (
    <div role="search" aria-label="Insight Lab 검색" className="search-panel">
      <label htmlFor="service-search">서비스, 화면번호, 제목 또는 키워드</label>
      <input id="service-search" type="search" value={query} onChange={(event) => updateQuery(event.target.value)} />
      <p role="status">{status}</p>
      {active && failed && <button type="button" onClick={() => setAttempt(attempt + 1)}>다시 불러오기</button>}
      {active && groups.length > 1 && <nav className="search-services" aria-label="서비스별 검색 결과">
        {groups.map(({ service, matched, items }) => <a key={service.slug} href={'#results-' + service.slug}>
          {service.title} · {items.length + Number(matched)}
        </a>)}
      </nav>}
      {groups.map(({ service, matched, items }) => (
        <section className="search-group" key={service.slug} aria-label={service.title}>
          <h2 id={'results-' + service.slug} tabIndex={-1}>{service.title}</h2>
          <ul className="search-results">
            {matched && <li><a href={base + service.slug + '/'}>
              <strong>서비스 홈</strong><span>{service.description}</span>
            </a></li>}
            {items.slice(0, previewCount).map(item => resultLink(base, item))}
          </ul>
          {items.length > previewCount && <details className="search-more" key={query.trim()}>
            <summary>{service.title} 결과 {items.length - previewCount}건 더 보기</summary>
            <ul className="search-results">{items.slice(previewCount).map(item => resultLink(base, item))}</ul>
          </details>}
        </section>
      ))}
      {index && !groups.length && <p className="empty-state">일치하는 결과가 없습니다.</p>}
    </div>
  );
}

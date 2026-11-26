import { useEffect, useState } from 'react';
import { findServices, services } from '../../utils/services';
import { searchCatalog } from '../../utils/catalog';

export default function SearchPanel({ base }: { base: string }) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    const restore = () => setQuery(new URL(window.location.href).searchParams.get('q') ?? '');
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  function updateQuery(value: string) {
    setQuery(value);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', url);
  }

  const matchingServices = findServices(query);
  const records = searchCatalog(query);
  const groups = services.map((service) => ({
    service,
    matched: matchingServices.includes(service),
    items: records.filter(({ service: slug }) => slug === service.slug),
  })).filter(({ matched, items }) => matched || items.length);
  const count = matchingServices.length + records.length;

  return (
    <div role="search" aria-label="Insight Lab 검색" className="search-panel">
      <label htmlFor="service-search">서비스, 화면번호, 제목 또는 키워드</label>
      <input id="service-search" type="search" value={query} onChange={(event) => updateQuery(event.target.value)} />
      <p role="status">{query.trim() ? `검색 결과 ${count}개` : '전체 서비스'}</p>
      {groups.map(({ service, matched, items }) => (
        <section className="search-group" key={service.slug} aria-label={service.title}>
          <h2>{service.title}</h2>
          <ul className="search-results">
            {matched && <li><a href={base + service.slug + '/'}>
              <strong>서비스 홈</strong><span>{service.description}</span>
            </a></li>}
            {items.map(({ route, anchor, title, summary }) => (
              <li key={route + title}><a href={base + route + '/' + (anchor ? '#' + anchor : '')}>
                <strong>{title}</strong>{summary && <span>{summary}</span>}
              </a></li>
            ))}
          </ul>
        </section>
      ))}
      {!groups.length && <p className="empty-state">일치하는 결과가 없습니다.</p>}
    </div>
  );
}

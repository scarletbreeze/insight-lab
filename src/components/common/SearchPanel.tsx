import { useState } from 'react';
import { findServices } from '../../utils/services';

export default function SearchPanel({ base }: { base: string }) {
  const [query, setQuery] = useState('');
  const results = findServices(query);

  return (
    <div role="search" aria-label="서비스 검색" className="search-panel">
      <label htmlFor="service-search">서비스 이름 또는 키워드</label>
      <input id="service-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
      <p role="status">{query.trim() ? `검색 결과 ${results.length}개` : '전체 서비스'}</p>
      {results.length ? (
        <ul className="search-results">
          {results.map(({ slug, title, description, category }) => (
            <li key={slug}>
              <a href={base + slug + '/'}>
                <span className="category">{category}</span>
                <strong>{title}</strong>
                <span>{description}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : <p className="empty-state">일치하는 서비스가 없습니다.</p>}
    </div>
  );
}

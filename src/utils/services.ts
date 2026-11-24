export const services = [
  { slug: 'hero-lab', title: 'Hero Lab', category: 'Product', description: '영웅문 화면을 찾고 활용 흐름을 탐색합니다.', accent: '#94afff' },
  { slug: 'voc-studio', title: 'VOC Studio', category: 'Customer', description: '키움의 변화와 고객이 궁금해했던 질문을 연도별로 살펴봅니다.', accent: '#ff9eb8' },
  { slug: 'broker-atlas', title: 'Broker Atlas', category: 'Company', description: '공시로 증권사의 성장과 수익 구조를 비교합니다.', accent: '#8dbff3' },
  { slug: 'market-time-capsule', title: 'Market Time Capsule', category: 'Market', description: '1990년부터 2026년까지 시장의 사건과 흐름을 돌아봅니다.', accent: '#9bddd2' },
  { slug: 'ceo-lens', title: 'CEO Lens', category: 'Industry', description: '증권업의 변화를 살피고 경영 관점에서 질문을 던집니다.', accent: '#e6c58f' },
  { slug: 'normalman-archive', title: 'Normalman Archive', category: 'Archive', description: '공부와 개발, 리서치 기록을 시간순으로 모읍니다.', accent: '#d0c3b6' },
] as const;

export function findServices(query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return services.filter(({ title, category, description }) => {
    const text = [title, category, description].join(' ').toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}

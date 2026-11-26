import filings from '../../data/brokers/disclosed-segments.json';

interface Filing {
  basis: string;
  unit: string;
  metric: string;
  period?: string;
  years: number[];
  sourceName: string;
  sourceUrl: string;
  segments: { name: string; amounts: number[] }[];
  total: number[];
}

export const segmentFilings: Partial<Record<string, Filing>> = filings;

// Match complete disclosure labels. Combined units retain their full disclosed amount.
const businessTags: Record<string, string> = {
  '위탁매매': '위탁매매',
  '선물중개업': '위탁매매',
  '위탁영업/ 자산관리': '위탁매매·자산관리',
  '자산관리/ 위탁영업': '위탁매매·자산관리',
  '자산관리부문(WM)': '자산관리',
  WM: '자산관리',
  IB: '기업금융',
  IB사업본부: '기업금융',
  '투자은행부문(IB)': '기업금융',
  기업금융: '기업금융',
  기업금융및IB사업: '기업금융',
  Trading: '트레이딩',
  자기매매: '트레이딩',
  'S&T': '세일즈·트레이딩',
  'S&T그룹': '세일즈·트레이딩',
  'Sales &Trading': '세일즈·트레이딩',
  'Sales&Trading': '세일즈·트레이딩',
  '트레이딩 및 자기자본투자부문(Sales & Trading)': '세일즈·트레이딩',
};

export const segmentTag = (name: string) => businessTags[name] ?? '기타·미분류';
export const formatSegmentAmount = (amount: number, unit: string) =>
  (amount / (unit === '백만원' ? 100 : 100_000)).toLocaleString('ko-KR', { maximumFractionDigits: 1 });

import legendData from '../../data/hero/legends.json';
import screenData from '../../data/hero/screens.json';
import workflowData from '../../data/hero/recipes.json';
import guideData from '../../data/hero/screen-guides.json';
import essentialData from '../../data/hero/essentials.json';

interface ScreenGuide {
  image?: string;
  width: number;
  height: number;
  imageCaption?: string;
  relatedHelp?: { number: string; title: string }[];
  focus: string[];
  sections?: string[][];
}

export const legends = legendData;
export const essentials = essentialData;
export type EssentialCriterion = keyof typeof essentialData.criteria;

export const screens = screenData;
export const workflows = workflowData;
export const screenGuides: Record<string, ScreenGuide> = guideData;

export const purposes = ['시장 파악', '종목 발굴', '종목 분석', '주문', '계좌', '파생', '해외'];
export const styles = ['초보', '단타', '스윙', '장기', '파생', '해외'];
export const interests = ['수급', '차트', '종목발굴', '시황', '뉴스'];

export function screenByNumber(number: string) {
  const screen = screens.find((screen) => screen.number === number);
  if (!screen) throw new Error(`Unknown Hero screen: ${number}`);
  return screen;
}

export const heroGuides = [
  { title: '영웅문 길라잡이', url: 'https://download.kiwoom.com/hero4_help_new/intro/intro.htm' },
  { title: '영웅문 100% 활용하기', url: 'https://download.kiwoom.com/hero4_help_new/hero100/hero.htm' },
];

const hero100Base = 'https://download.kiwoom.com/hero4_help_new/hero100/';
const quoteGuide = { title: '현재가 설정', url: hero100Base + 'qa31.htm' };
const orderGuide = { title: '주문확인창과 수량·가격 설정', url: hero100Base + 'qa08.htm' };

export const screenLearning: Record<string, { title: string; url: string }[]> = {
  '0101': [quoteGuide],
  '0102': [quoteGuide],
  '0130': [
    { title: '관심그룹과 표시 필드 설정', url: hero100Base + 'qa36.htm' },
    { title: '관심종목 추가와 이동', url: hero100Base + 'qa15.htm' },
  ],
  '0150': [
    { title: '조건검색 기능별 공식 FAQ', url: 'https://download.kiwoom.com/hero4_help_doc/KiwoomHero4_AdvancedSearch.pdf' },
  ],
  '0600': [
    { title: '차트 공통기능과 환경설정', url: 'https://download.kiwoom.com/hero4_help_new/010.htm' },
  ],
  '4989': [orderGuide, quoteGuide],
};

export function relatedScreens(number: string) {
  const screen = screenByNumber(number);
  const helpNumbers = new Set(screenGuides[number]?.relatedHelp?.map(item => item.number));
  const companionNumbers = new Set(workflows
    .filter(({ steps }) => steps.some((step) => step.number === number))
    .flatMap(({ steps }) => steps.map((step) => step.number)));
  return screens.filter((candidate) => candidate.number !== number)
    .map((candidate) => ({
      candidate,
      score: Number(companionNumbers.has(candidate.number)) * 8 + Number(helpNumbers.has(candidate.number)) * 4
        + Number(candidate.purpose === screen.purpose) * 2
        + Number(candidate.tags.some((tag) => screen.tags.includes(tag))),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ candidate }) => candidate);
}

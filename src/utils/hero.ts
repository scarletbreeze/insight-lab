import screenData from '../../data/hero/screens.json';
import workflowData from '../../data/hero/recipes.json';

export const screens = screenData;
export const workflows = workflowData;

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

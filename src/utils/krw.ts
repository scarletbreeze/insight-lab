// Korean won amounts are stored in 백만원 (brokers) or 억 원 (verification tables).
// Screens read 1조 원 and above as 조 + 억 so large balances are easy to scan.
const EOK_PER_JO = 10_000;
const locale = 'ko-KR';

/** Format an amount given in 억 원 as 'N조 M억 원' or 'M억 원'. */
export function formatEok(eok: number): string {
  if (!Number.isFinite(eok)) return '자료 확인 중';
  const sign = eok < 0 ? '-' : '';
  const abs = Math.abs(eok);
  if (abs >= EOK_PER_JO - 0.5) {
    const rounded = Math.round(abs);
    const jo = Math.floor(rounded / EOK_PER_JO);
    const rest = rounded % EOK_PER_JO;
    return sign + jo.toLocaleString(locale) + '조' + (rest ? ' ' + rest.toLocaleString(locale) + '억' : '') + ' 원';
  }
  const maximumFractionDigits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return sign + abs.toLocaleString(locale, { maximumFractionDigits }) + '억 원';
}

/** Format an amount given in 백만원 (as disclosed in filings). */
export const formatKrwMillion = (million: number) => formatEok(million / 100);

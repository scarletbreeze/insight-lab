import events from '../../data/market/events.json';

export const years = Array.from({ length: 37 }, (_, index) => 1990 + index);
export const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
export const marketEvents = events as Array<(typeof events)[number] & { then?: string; now?: string }>;

export function eraColor(year: number) {
  if (year <= 1997) return '#9bddd2';
  if (year <= 2004) return '#9eb8ef';
  if (year <= 2011) return '#fac29c';
  if (year <= 2016) return '#b0dba1';
  if (year <= 2020) return '#c4b4ff';
  return '#94d4ec';
}

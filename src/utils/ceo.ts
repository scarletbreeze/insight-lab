import source from '../../data/ceo/signals.json';
import weekly from '../../data/ceo/weekly.json';
import briefData from '../../data/ceo/briefs.json';
import consortiumData from '../../data/ceo/sto-consortiums.json';

export const signals = source;
const signalsById = new Map(signals.map((signal) => [signal.id, signal]));
export const weeklyEditions = [...weekly].sort((a, b) => b.start.localeCompare(a.start))
  .map((edition) => ({
    ...edition,
    question: signalsById.get(edition.questionSignal)!,
    related: edition.relatedSignals.map((id) => signalsById.get(id)!),
    items: edition.signals.map((id) => signalsById.get(id)!),
  }));
export const ceoSections = [
  ['공개 시그널', 'signals'],
  ['경쟁사 동향', 'competitors'],
  ['규제', 'regulation'],
  ['자본·인가 로드맵', 'capital-roadmap'],
  ['디지털자산·토큰증권', 'digital-assets'],
  ['AI·디지털', 'ai-digital'],
  ['해외 사례', 'global'],
  ['아카이브', 'archive'],
  ['방법론', 'methodology'],
] as const;

export const briefs = briefData; // file order: 종투사 → 토큰증권 → 디지털자산업법
export type CeoBrief = (typeof briefs)[number];
export const briefsById = new Map(briefs.map((brief) => [brief.id, brief]));
export const briefSignals = (brief: CeoBrief) => brief.relatedSignalIds.map((id) => signalsById.get(id)).filter((signal) => signal !== undefined);
export interface StoConsortium {
  consortium: string; leadBroker: string; brokerId: string | null; brokerIds: string[]; members: string; announced: string;
  focus: string; status: string; statusAsOf: string; statusSources: { name: string; url: string; date: string }[];
  sourceUrl: string; sourceName: string;
}
export const stoConsortiums: { asOf: string; note: string; rows: StoConsortium[] } = consortiumData;

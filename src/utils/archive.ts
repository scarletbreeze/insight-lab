import data from '../../data/archive/notes/index.json';

export const notes = data.filter(({ visibility }) => visibility === 'public');
export const archiveTags = [...new Set(notes.flatMap(({ tags }) => tags))].sort();
export const archiveYears = [...new Set(notes.map(({ date }) => date.slice(0, 4)))].sort();
export const archiveContentLabels: Readonly<Record<string, string>> = {
  original: 'Original',
  rewritten: 'Rewritten',
  summary: 'Summary',
};

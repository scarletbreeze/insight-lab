import data from '../../data/archive/notes/index.json';

export const notes = data.filter(({ visibility }) => visibility === 'public');
export const archiveTags = [...new Set(notes.flatMap(({ tags }) => tags))].sort();

import { catalog, type SearchRecord } from '../utils/catalog';

export function GET() {
  const records: SearchRecord[] = catalog.map(({ service, route, query, anchor, title, summary, keywords }) =>
    ({ service, route, query, anchor, title, summary, keywords }));
  return Response.json(records);
}

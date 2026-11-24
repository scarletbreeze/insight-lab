export interface SourceRef {
  sourceName: string;
  sourceType: 'official' | 'disclosure' | 'research' | 'media' | 'reference' | 'editorial';
  sourceUrl?: string;
  sourceDate?: string;
  retrievedAt?: string;
}

export interface BaseContent {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  tags: string[];
  sources: SourceRef[];
  publishedAt?: string;
  lastUpdated: string;
}

export type SourceType =
  | "rss"
  | "newsapi"
  | "guardian"
  | "gdelt"
  | "openai_web_search";

export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  enabled: boolean;
  priority: number;
  url?: string;
  topics: string[];
  config?: Record<string, unknown>;
}

export interface RawArticle {
  sourceId: string;
  sourceName: string;
  sourcePriority: number;
  sourceTopics: string[];
  title: string;
  url: string;
  guid?: string;
  excerpt?: string;
  body?: string;
  author?: string;
  publishedAt?: Date;
}

export interface Article {
  id: string;
  sourceId: string;
  sourceName: string;
  sourcePriority: number;
  canonicalUrl: string;
  title: string;
  excerpt?: string;
  body?: string;
  author?: string;
  publishedAt?: Date;
  fetchedAt: Date;
  contentHash: string;
  topics: string[];
}

export interface StoryCluster {
  id: string;
  representative: Article;
  articles: Article[];
  topics: string[];
  score: number;
}

export interface DigestItem {
  index: number;
  clusterId: string;
  title: string;
  shortSummary: string;
  whyItMatters?: string;
  sourceLinks: Array<{ sourceName: string; url: string }>;
  topics: string[];
}

export interface Digest {
  id: string;
  createdAt: Date;
  smsBody: string;
  items: DigestItem[];
}

export interface UserPreferences {
  topicWeights: Record<string, number>;
  sourceWeights: Record<string, number>;
  mutedSources: string[];
}

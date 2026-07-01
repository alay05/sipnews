import type { Article, StoryCluster } from "./types.js";
import { hashContent } from "./hash.js";
import { normalizeTitleForComparison } from "./normalize.js";

const TITLE_SIMILARITY_THRESHOLD = 0.82;

export function dedupeArticles(articles: Article[]): StoryCluster[] {
  const clusters: StoryCluster[] = [];

  for (const article of articles) {
    const existing = clusters.find((cluster) =>
      shouldJoinCluster(article, cluster)
    );

    if (existing) {
      existing.articles.push(article);
      existing.topics = unique([...existing.topics, ...article.topics]);
      existing.id = generateClusterId(existing.articles);
      continue;
    }

    clusters.push({
      id: generateClusterId([article]),
      representative: article,
      articles: [article],
      topics: article.topics,
      score: 0
    });
  }

  return clusters;
}

export function generateClusterId(articles: readonly Article[]): string {
  if (articles.length === 0) {
    return `cluster_${hashContent("empty").slice(0, 16)}`;
  }

  const canonicalUrls = articles
    .map((article) => article.canonicalUrl)
    .filter(Boolean)
    .sort();
  const titleSeeds = articles
    .map((article) => normalizeTitleForComparison(article.title))
    .filter(Boolean)
    .sort();
  const seed = canonicalUrls.length > 0 ? canonicalUrls.join("\n") : titleSeeds.join("\n");

  return `cluster_${hashContent(seed).slice(0, 16)}`;
}

function shouldJoinCluster(article: Article, cluster: StoryCluster): boolean {
  if (
    cluster.articles.some(
      (existing) => existing.canonicalUrl === article.canonicalUrl
    )
  ) {
    return true;
  }

  return (
    titleSimilarity(article.title, cluster.representative.title) >=
    TITLE_SIMILARITY_THRESHOLD
  );
}

export function titleSimilarity(left: string, right: string): number {
  const leftTokens = tokenSet(normalizeTitleForComparison(left));
  const rightTokens = tokenSet(normalizeTitleForComparison(right));
  const union = new Set([...leftTokens, ...rightTokens]);

  if (union.size === 0) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  return intersection / union.size;
}

function tokenSet(value: string): Set<string> {
  return new Set(value.split(" ").filter((token) => token.length > 2));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

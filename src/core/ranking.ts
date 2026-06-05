import type { StoryCluster, UserPreferences } from "../types/articles.js";

export function rankClusters(
  clusters: StoryCluster[],
  preferences: UserPreferences,
  now = new Date()
): StoryCluster[] {
  return clusters
    .filter((cluster) => !isMuted(cluster, preferences))
    .map((cluster) => ({ ...cluster, score: scoreCluster(cluster, preferences, now) }))
    .sort((left, right) => right.score - left.score);
}

function scoreCluster(
  cluster: StoryCluster,
  preferences: UserPreferences,
  now: Date
): number {
  const sourcePriority =
    cluster.articles.reduce((sum, article) => sum + article.sourcePriority, 0) /
    cluster.articles.length;
  const sourcePreference = cluster.articles.reduce(
    (sum, article) => sum + (preferences.sourceWeights[article.sourceName] ?? 0),
    0
  );
  const topicPreference = cluster.topics.reduce(
    (sum, topic) => sum + (preferences.topicWeights[topic] ?? 0),
    0
  );
  const duplicateBoost = Math.min(cluster.articles.length - 1, 3) * 0.2;
  const recencyBoost = getRecencyBoost(cluster.representative.publishedAt, now);

  return sourcePriority + sourcePreference + topicPreference + duplicateBoost + recencyBoost;
}

function getRecencyBoost(publishedAt: Date | undefined, now: Date): number {
  if (!publishedAt) return 0;
  const ageHours = Math.max(0, now.getTime() - publishedAt.getTime()) / 36e5;
  return Math.max(0, 1 - ageHours / 48);
}

function isMuted(cluster: StoryCluster, preferences: UserPreferences): boolean {
  const muted = new Set(preferences.mutedSources.map((source) => source.toLowerCase()));
  return cluster.articles.some((article) =>
    muted.has(article.sourceName.toLowerCase())
  );
}

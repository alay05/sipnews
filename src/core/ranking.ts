import type { StoryCluster, UserPreferences } from "../types/articles.js";

export type DigestCategory = "general" | "tech" | "ai-dev" | "startups";

export interface CategoryBalancedSelectionOptions {
  maxItems: number;
  date?: Date;
}

const CATEGORY_RATIOS: Record<DigestCategory, number> = {
  general: 0.2,
  tech: 0.3,
  "ai-dev": 0.3,
  startups: 0.2
};

const CATEGORY_MATCHERS: Record<DigestCategory, RegExp[]> = {
  general: [/\bgeneral\b/, /\bworld\b/, /\bus\b/, /\bu\.s\.\b/, /\bunited states\b/],
  tech: [/\btech\b/, /\btechnology\b/, /\btech industry\b/],
  "ai-dev": [
    /\bai\b/,
    /\bllm\b/,
    /\bopenai\b/,
    /\bprogramming\b/,
    /\bdev\b/,
    /\bdeveloper\b/,
    /\bdevelopment\b/,
    /\bgithub\b/,
    /\bsoftware\b/
  ],
  startups: [
    /\bstartup\b/,
    /\bstartups\b/,
    /\bventure\b/,
    /\bfunding\b/,
    /\bproduct hunt\b/,
    /\bproduct-hunt\b/,
    /\byc\b/,
    /\by combinator\b/
  ]
};

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

export function selectCategoryBalancedClusters(
  rankedClusters: StoryCluster[],
  options: CategoryBalancedSelectionOptions
): StoryCluster[] {
  if (options.maxItems <= 0) return [];

  const targets = getCategoryTargets(options.maxItems, options.date);
  const selected: StoryCluster[] = [];
  const selectedIds = new Set<string>();

  for (const category of getSelectionOrder(options.date)) {
    const needed = targets[category];
    if (needed <= 0) continue;

    for (const cluster of rankedClusters) {
      if (selected.length >= options.maxItems) break;
      if (selectedIds.has(cluster.id)) continue;
      if (inferDigestCategory(cluster) !== category) continue;

      selected.push(cluster);
      selectedIds.add(cluster.id);
      if (selected.filter((item) => inferDigestCategory(item) === category).length >= needed) {
        break;
      }
    }
  }

  for (const cluster of rankedClusters) {
    if (selected.length >= options.maxItems) break;
    if (selectedIds.has(cluster.id)) continue;

    selected.push(cluster);
    selectedIds.add(cluster.id);
  }

  const rankedIndex = new Map(
    rankedClusters.map((cluster, index) => [cluster.id, index])
  );

  return selected.sort(
    (left, right) =>
      (rankedIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (rankedIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );
}

export function getCategoryTargets(
  maxItems: number,
  date = new Date()
): Record<DigestCategory, number> {
  const categories: DigestCategory[] = ["general", "tech", "ai-dev", "startups"];
  const targets = Object.fromEntries(
    categories.map((category) => [
      category,
      Math.floor(CATEGORY_RATIOS[category] * maxItems)
    ])
  ) as Record<DigestCategory, number>;

  let remaining =
    maxItems - categories.reduce((sum, category) => sum + targets[category], 0);
  const extraPriority = getSelectionOrder(date)
    .map((category) => ({
      category,
      fractional: CATEGORY_RATIOS[category] * maxItems - targets[category]
    }))
    .sort((left, right) => right.fractional - left.fractional);

  while (remaining > 0) {
    for (const { category } of extraPriority) {
      if (remaining <= 0) break;
      targets[category] += 1;
      remaining -= 1;
    }
  }

  return targets;
}

export function inferDigestCategory(cluster: StoryCluster): DigestCategory {
  const topics = cluster.topics.map(normalizeTopic);

  for (const category of getMatcherPriority()) {
    if (
      topics.some((topic) =>
        CATEGORY_MATCHERS[category].some((matcher) => matcher.test(topic))
      )
    ) {
      return category;
    }
  }

  return "general";
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

function getSelectionOrder(date = new Date()): DigestCategory[] {
  return isTechExtraDay(date)
    ? ["general", "tech", "ai-dev", "startups"]
    : ["general", "ai-dev", "tech", "startups"];
}

function getMatcherPriority(): DigestCategory[] {
  return ["startups", "ai-dev", "tech", "general"];
}

function isTechExtraDay(date: Date): boolean {
  return date.getUTCDate() % 2 === 1;
}

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
}

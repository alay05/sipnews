import type { StoryCluster, UserPreferences } from "./types.js";
import { normalizeTopic } from "./normalize.js";

export type DigestCategory = "world" | "tech" | "ai" | "startups";

export interface CategoryBalancedSelectionOptions {
  maxItems: number;
  date?: Date;
}

export const DIGEST_CATEGORIES: readonly DigestCategory[] = [
  "world",
  "tech",
  "ai",
  "startups"
];

export const DEFAULT_CATEGORY_RATIOS: Record<DigestCategory, number> = {
  world: 0.2,
  tech: 0.3,
  ai: 0.3,
  startups: 0.2
};

const CATEGORY_MATCHERS: Record<DigestCategory, RegExp[]> = {
  world: [/\bgeneral\b/, /\bworld\b/, /\bus\b/, /\bu\.s\.\b/, /\bunited states\b/],
  tech: [/\btech\b/, /\btechnology\b/, /\btech industry\b/],
  ai: [
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
      if (
        selected.filter((item) => inferDigestCategory(item) === category).length >=
        needed
      ) {
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
  return distributeIntegerQuota(DEFAULT_CATEGORY_RATIOS, maxItems, getSelectionOrder(date));
}

export function inferDigestCategory(cluster: Pick<StoryCluster, "topics">): DigestCategory {
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

  return "world";
}

export function normalizeDigestCategory(value: string): DigestCategory | undefined {
  const normalized = normalizeTopic(value).replace(/[-\s]+/g, "_");
  if (normalized === "tech" || normalized === "technology") return "tech";
  if (normalized === "ai" || normalized === "ai_dev" || normalized === "ai_development") return "ai";
  if (normalized === "startup" || normalized === "startups") return "startups";
  if (normalized === "general" || normalized === "world" || normalized === "us") return "world";
  return undefined;
}

export function distributeIntegerQuota(
  weights: Record<DigestCategory, number>,
  totalItemCount: number,
  tieBreakOrder: readonly DigestCategory[] = DIGEST_CATEGORIES
): Record<DigestCategory, number> {
  const zero = Object.fromEntries(
    DIGEST_CATEGORIES.map((category) => [category, 0])
  ) as Record<DigestCategory, number>;
  if (totalItemCount <= 0) return zero;

  const positiveWeights = Object.fromEntries(
    DIGEST_CATEGORIES.map((category) => [
      category,
      Math.max(0, weights[category] ?? 0)
    ])
  ) as Record<DigestCategory, number>;
  const totalWeight = DIGEST_CATEGORIES.reduce(
    (sum, category) => sum + positiveWeights[category],
    0
  );
  const effectiveWeights = totalWeight > 0 ? positiveWeights : DEFAULT_CATEGORY_RATIOS;
  const effectiveTotal = DIGEST_CATEGORIES.reduce(
    (sum, category) => sum + effectiveWeights[category],
    0
  );

  const quotas = { ...zero };
  const remainders = DIGEST_CATEGORIES.map((category) => {
    const exact = (effectiveWeights[category] / effectiveTotal) * totalItemCount;
    quotas[category] = Math.floor(exact);
    return { category, fractional: exact - quotas[category] };
  });

  let remaining =
    totalItemCount - DIGEST_CATEGORIES.reduce((sum, category) => sum + quotas[category], 0);
  const tieBreakIndex = new Map(tieBreakOrder.map((category, index) => [category, index]));
  remainders.sort(
    (left, right) =>
      right.fractional - left.fractional ||
      (tieBreakIndex.get(left.category) ?? Number.MAX_SAFE_INTEGER) -
        (tieBreakIndex.get(right.category) ?? Number.MAX_SAFE_INTEGER)
  );

  while (remaining > 0) {
    for (const { category } of remainders) {
      if (remaining <= 0) break;
      quotas[category] += 1;
      remaining -= 1;
    }
  }

  return quotas;
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
    (sum, topic) => sum + (preferences.topicWeights[normalizeTopic(topic)] ?? 0),
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
  return isTechnologyExtraDay(date)
    ? ["world", "tech", "ai", "startups"]
    : ["world", "ai", "tech", "startups"];
}

function getMatcherPriority(): DigestCategory[] {
  return ["startups", "ai", "tech", "world"];
}

function isTechnologyExtraDay(date: Date): boolean {
  return date.getUTCDate() % 2 === 1;
}

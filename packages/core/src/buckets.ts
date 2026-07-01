import type { StoryCluster, UserPreferences } from "./types.js";
import { hashContent } from "./hash.js";
import {
  DEFAULT_CATEGORY_RATIOS,
  DIGEST_CATEGORIES,
  type DigestCategory,
  distributeIntegerQuota,
  inferDigestCategory,
  normalizeDigestCategory,
  rankClusters
} from "./ranking.js";

export type ClusterBucketPools = Record<DigestCategory, StoryCluster[]>;

export interface BucketMembership {
  clusterId: string;
  bucket: DigestCategory;
  topics: string[];
}

export interface UserBucketSelectionOptions {
  totalItemCount: number;
  now?: Date;
  date?: Date;
}

export interface SummaryCacheKeyInput {
  clusterId: string;
  summaryLength: "small" | "medium" | "large" | number;
  model: string;
  version: string;
}

export function deriveBucketMembership(cluster: StoryCluster): BucketMembership {
  return {
    clusterId: cluster.id,
    bucket: inferDigestCategory(cluster),
    topics: [...cluster.topics]
  };
}

export function deriveBucketPools(clusters: readonly StoryCluster[]): ClusterBucketPools {
  const pools = emptyBucketPools();
  for (const cluster of clusters) {
    pools[inferDigestCategory(cluster)].push(cluster);
  }
  return pools;
}

export function deriveQuotaFromTopicWeights(
  topicWeights: Record<string, number>,
  totalItemCount: number,
  date = new Date()
): Record<DigestCategory, number> {
  const categoryWeights = { ...DEFAULT_CATEGORY_RATIOS };

  for (const [topic, weight] of Object.entries(topicWeights)) {
    const category = normalizeDigestCategory(topic);
    if (!category) continue;
    categoryWeights[category] += Math.max(0, weight) * 0.1;
  }

  return distributeIntegerQuota(categoryWeights, totalItemCount, getBucketTieBreakOrder(date));
}

export function selectClustersForUserFromBuckets(
  pools: ClusterBucketPools,
  preferences: UserPreferences,
  options: UserBucketSelectionOptions
): StoryCluster[] {
  if (options.totalItemCount <= 0) return [];

  const quotas = deriveQuotaFromTopicWeights(
    preferences.topicWeights,
    options.totalItemCount,
    options.date
  );
  const rankedPools = Object.fromEntries(
    DIGEST_CATEGORIES.map((category) => [
      category,
      rankClusters(pools[category] ?? [], preferences, options.now ?? options.date ?? new Date())
    ])
  ) as ClusterBucketPools;

  const selected: StoryCluster[] = [];
  const selectedIds = new Set<string>();
  for (const category of getBucketTieBreakOrder(options.date)) {
    for (const cluster of rankedPools[category]) {
      if (selected.length >= options.totalItemCount) break;
      if (selectedIds.has(cluster.id)) continue;
      if (selected.filter((item) => inferDigestCategory(item) === category).length >= quotas[category]) {
        break;
      }
      selected.push(cluster);
      selectedIds.add(cluster.id);
    }
  }

  const fallback = DIGEST_CATEGORIES.flatMap((category) => rankedPools[category]).sort(
    (left, right) => right.score - left.score
  );
  for (const cluster of fallback) {
    if (selected.length >= options.totalItemCount) break;
    if (selectedIds.has(cluster.id)) continue;
    selected.push(cluster);
    selectedIds.add(cluster.id);
  }

  return selected;
}

export function generateSummaryCacheKey(input: SummaryCacheKeyInput): string {
  const normalized = [
    input.clusterId,
    String(input.summaryLength),
    input.model.trim().toLowerCase(),
    input.version.trim()
  ].join("\n");
  return `summary_${hashContent(normalized).slice(0, 32)}`;
}

function emptyBucketPools(): ClusterBucketPools {
  return {
    world: [],
    tech: [],
    ai: [],
    startups: []
  };
}

function getBucketTieBreakOrder(date = new Date()): DigestCategory[] {
  return date.getUTCDate() % 2 === 1
    ? ["world", "tech", "ai", "startups"]
    : ["world", "ai", "tech", "startups"];
}

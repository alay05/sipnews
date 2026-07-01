export type JsonObject = Record<string, unknown>;

export interface DataUser {
  id: string;
  externalAuthProvider: string;
  externalAuthSubject: string;
  email?: string;
  displayName?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserDigestSettings {
  userId: string;
  timezone: string;
  sendHour: number;
  digestMaxItems: number;
  deliveryChannel: string;
  deliveryAddress?: string;
  topicWeights: Record<string, number>;
  sourceWeights: Record<string, number>;
  mutedSources: string[];
  preferredBucketIds: string[];
  includeBucketLabels: boolean;
}

export interface SourceRecord {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  priority: number;
  url?: string;
  topics: string[];
  config?: JsonObject;
}

export interface ArticleRecord {
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
  metadata?: JsonObject;
}

export interface StoryClusterRecord {
  id: string;
  representativeArticleId?: string;
  canonicalKey?: string;
  title: string;
  topics: string[];
  score: number;
  status: string;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  articleIds: string[];
  metadata?: JsonObject;
}

export interface BucketDefinition {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  rules: JsonObject;
}

export interface ClusterBucketMembership {
  clusterId: string;
  bucketId: string;
  confidence: number;
  rationale?: string;
  assignedBy: string;
}

export interface ClusterSummary {
  id: string;
  clusterId: string;
  title: string;
  summary: string;
  whyItMatters?: string;
  sourceLinks: Array<{ sourceName: string; url: string }>;
  topics: string[];
  model?: string;
  promptVersion?: string;
  metadata?: JsonObject;
}

export interface ClusterSummaryVariant {
  id: string;
  clusterSummaryId: string;
  clusterId: string;
  variantType: string;
  title: string;
  shortSummary: string;
  whyItMatters?: string;
  sourceLinks: Array<{ sourceName: string; url: string }>;
  topics: string[];
  model?: string;
  promptVersion?: string;
  metadata?: JsonObject;
}

export interface DigestRecord {
  id: string;
  userId: string;
  localDate: string;
  status: string;
  title?: string;
  bodyText?: string;
  generatedAt: Date;
  deliveredAt?: Date;
  items: DigestItemRecord[];
}

export interface DigestItemRecord {
  id: string;
  digestId: string;
  clusterId: string;
  summaryVariantId: string;
  bucketId?: string;
  itemIndex: number;
  titleSnapshot: string;
  summarySnapshot: string;
  whyItMattersSnapshot?: string;
  sourceLinksSnapshot: Array<{ sourceName: string; url: string }>;
  topicsSnapshot: string[];
}

export interface IngestionRun {
  id: string;
  status: string;
  startedAt: Date;
  finishedAt?: Date;
  articlesSeen: number;
  articlesSaved: number;
  clustersTouched: number;
  errorMessage?: string;
  metadata?: JsonObject;
}

export interface DeliveryRun {
  id: string;
  userId?: string;
  digestId?: string;
  channel: string;
  status: string;
  destination?: string;
  providerMessageId?: string;
  errorMessage?: string;
  queuedAt: Date;
  sentAt?: Date;
  finishedAt?: Date;
  metadata?: JsonObject;
}

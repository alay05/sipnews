import type { RawArticle, SourceConfig, StoryCluster } from "@sms-news/core";
import type {
  ClusterSummary,
  ClusterSummaryVariant,
  DigestRecord
} from "@sms-news/data";

export interface SourceAdapter {
  fetch(source: SourceConfig): Promise<RawArticle[]>;
}

export interface ClusterSummarizer {
  summarize(cluster: StoryCluster): Promise<ClusterSummaryDraft>;
}

export interface ClusterSummaryDraft {
  title: string;
  summary: string;
  whyItMatters?: string;
  sourceLinks: Array<{ sourceName: string; url: string }>;
  topics: string[];
}

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailClient {
  sendEmail(message: EmailMessage): Promise<{ providerMessageId?: string } | void>;
}

export type SummaryVariantType = "small" | "medium" | "large";

export interface PreparedClusterSummary {
  summary: ClusterSummary;
  variants: Record<SummaryVariantType, ClusterSummaryVariant>;
}

export interface WorkerRunResult {
  ingestionRunId: string;
  articlesSeen: number;
  articlesSaved: number;
  clustersTouched: number;
  dueUsers: number;
  digests: DigestRecord[];
}

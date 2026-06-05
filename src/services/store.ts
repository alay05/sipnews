import { randomUUID } from "node:crypto";
import type {
  AppUser,
  Article,
  Digest,
  DigestItem,
  SourceConfig,
  StoryCluster,
  UserPreferences
} from "../types/articles.js";
import type { FeedbackCommand } from "../core/feedback.js";

export interface FeedbackContext {
  digestId?: string;
  itemIndex?: number;
  rawBody?: string;
  sentiment?: "like" | "dislike";
  topic?: string;
  topics?: string[];
  sourceName?: string;
}

export interface AppStore {
  ensureUser(user: AppUser): Promise<void>;
  getActiveUsers(): Promise<AppUser[]>;
  getUserByPhone(phoneNumber: string): Promise<AppUser | undefined>;
  updateUserActive(userId: string, isActive: boolean): Promise<void>;
  saveSources(sources: SourceConfig[]): Promise<void>;
  saveArticles(articles: Article[]): Promise<void>;
  saveClusters(clusters: StoryCluster[]): Promise<void>;
  saveDigest(digest: Digest): Promise<void>;
  getDigest(id: string): Promise<Digest | undefined>;
  getDigestForUserDate(userId: string, localDate: string): Promise<Digest | undefined>;
  getLatestDigestForUser(userId: string): Promise<Digest | undefined>;
  getDigestItem(digestId: string, itemIndex: number): Promise<DigestItem | undefined>;
  getPreferences(userId: string): Promise<UserPreferences>;
  savePreferences(userId: string, preferences: UserPreferences): Promise<void>;
  saveFeedback(
    userId: string,
    command: FeedbackCommand,
    context?: FeedbackContext
  ): Promise<void>;
}

export class InMemoryStore implements AppStore {
  private readonly users = new Map<string, AppUser>();
  private readonly articles = new Map<string, Article>();
  private readonly clusters = new Map<string, StoryCluster>();
  private readonly digests = new Map<string, Digest>();
  private readonly preferences = new Map<string, UserPreferences>();
  private readonly feedback: Array<{
    userId: string;
    command: FeedbackCommand;
    context?: FeedbackContext;
  }> = [];

  async ensureUser(user: AppUser): Promise<void> {
    this.users.set(user.id, user);
    if (!this.preferences.has(user.id)) {
      this.preferences.set(user.id, emptyPreferences());
    }
  }

  async getActiveUsers(): Promise<AppUser[]> {
    return [...this.users.values()].filter((user) => user.isActive);
  }

  async getUserByPhone(phoneNumber: string): Promise<AppUser | undefined> {
    return [...this.users.values()].find(
      (user) => user.phoneNumber === phoneNumber
    );
  }

  async updateUserActive(userId: string, isActive: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) this.users.set(userId, { ...user, isActive });
  }

  async saveSources(_sources: SourceConfig[]): Promise<void> {
    // Source config is file-backed in memory mode.
  }

  async saveArticles(articles: Article[]): Promise<void> {
    for (const article of articles) this.articles.set(article.id, article);
  }

  async saveClusters(clusters: StoryCluster[]): Promise<void> {
    for (const cluster of clusters) this.clusters.set(cluster.id, cluster);
  }

  async saveDigest(digest: Digest): Promise<void> {
    this.digests.set(digest.id, digest);
  }

  async getDigest(id: string): Promise<Digest | undefined> {
    return this.digests.get(id);
  }

  async getDigestForUserDate(
    userId: string,
    localDate: string
  ): Promise<Digest | undefined> {
    return [...this.digests.values()].find(
      (digest) => digest.userId === userId && digest.localDate === localDate
    );
  }

  async getLatestDigestForUser(userId: string): Promise<Digest | undefined> {
    return [...this.digests.values()]
      .filter((digest) => digest.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  }

  async getDigestItem(
    digestId: string,
    itemIndex: number
  ): Promise<DigestItem | undefined> {
    return this.digests.get(digestId)?.items.find((item) => item.index === itemIndex);
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    return clonePreferences(this.preferences.get(userId) ?? emptyPreferences());
  }

  async savePreferences(
    userId: string,
    preferences: UserPreferences
  ): Promise<void> {
    this.preferences.set(userId, clonePreferences(preferences));
  }

  async saveFeedback(
    userId: string,
    command: FeedbackCommand,
    context?: FeedbackContext
  ): Promise<void> {
    this.feedback.push({ userId, command, context });
  }
}

export function emptyPreferences(): UserPreferences {
  return {
    topicWeights: {},
    sourceWeights: {},
    mutedSources: []
  };
}

export function clonePreferences(preferences: UserPreferences): UserPreferences {
  return {
    topicWeights: { ...preferences.topicWeights },
    sourceWeights: { ...preferences.sourceWeights },
    mutedSources: [...preferences.mutedSources]
  };
}

export function sourceNameForDigestItem(item: DigestItem): string | undefined {
  return item.sourceLinks[0]?.sourceName;
}

export function feedbackContextForDigestItem(item: DigestItem): FeedbackContext {
  return {
    itemIndex: item.index,
    topic: item.topics[0],
    topics: item.topics,
    sourceName: sourceNameForDigestItem(item)
  };
}

export function feedbackSentiment(
  command: FeedbackCommand
): "like" | "dislike" | undefined {
  if (command.type === "like") return "like";
  if (command.type === "dislike") return "dislike";
  return undefined;
}

export function feedbackTopic(command: FeedbackCommand): string | undefined {
  if (command.type === "more_topic" || command.type === "less_topic") {
    return command.topic;
  }
  return undefined;
}

export function feedbackSource(command: FeedbackCommand): string | undefined {
  return command.type === "mute_source" ? command.sourceName : undefined;
}

export function feedbackItemIndex(command: FeedbackCommand): number | undefined {
  if (
    command.type === "like" ||
    command.type === "dislike" ||
    command.type === "save" ||
    command.type === "why"
  ) {
    return command.itemIndex;
  }
  return undefined;
}

export function feedbackEventId(): string {
  return randomUUID();
}

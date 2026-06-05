import type {
  Article,
  Digest,
  StoryCluster,
  UserPreferences
} from "../types/articles.js";
import type { FeedbackCommand } from "../core/feedback.js";

export interface AppStore {
  saveArticles(articles: Article[]): Promise<void>;
  saveClusters(clusters: StoryCluster[]): Promise<void>;
  saveDigest(digest: Digest): Promise<void>;
  getDigest(id: string): Promise<Digest | undefined>;
  getPreferences(): Promise<UserPreferences>;
  savePreferences(preferences: UserPreferences): Promise<void>;
  saveFeedback(command: FeedbackCommand, digestId?: string): Promise<void>;
}

export class InMemoryStore implements AppStore {
  private readonly articles = new Map<string, Article>();
  private readonly clusters = new Map<string, StoryCluster>();
  private readonly digests = new Map<string, Digest>();
  private preferences: UserPreferences = {
    topicWeights: {},
    sourceWeights: {},
    mutedSources: []
  };
  private readonly feedback: Array<{ command: FeedbackCommand; digestId?: string }> = [];

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

  async getPreferences(): Promise<UserPreferences> {
    return {
      topicWeights: { ...this.preferences.topicWeights },
      sourceWeights: { ...this.preferences.sourceWeights },
      mutedSources: [...this.preferences.mutedSources]
    };
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    this.preferences = preferences;
  }

  async saveFeedback(command: FeedbackCommand, digestId?: string): Promise<void> {
    this.feedback.push({ command, digestId });
  }
}

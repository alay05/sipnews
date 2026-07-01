import "server-only";

export type DigestStatus = "sent" | "queued" | "draft";

export type DigestSummary = {
  id: string;
  title: string;
  deliveredAt: string | null;
  status: DigestStatus;
  storyCount: number;
};

export type UserSettings = {
  phoneNumber: string | null;
  email: string | null;
  deliveryHourLocal: number;
  timezone: string;
  topics: string[];
};

export type OnboardingSnapshot = {
  hasCompletedOnboarding: boolean;
  recommendedTopics: string[];
  settings: UserSettings;
};

type ApiClientOptions = {
  authToken?: string | null;
  baseUrl?: string;
};

const defaultBaseUrl =
  process.env.SMS_NEWS_API_URL ?? process.env.NEXT_PUBLIC_SMS_NEWS_API_URL;

const placeholderSettings: UserSettings = {
  phoneNumber: null,
  email: null,
  deliveryHourLocal: 8,
  timezone: "America/New_York",
  topics: ["Local news", "World", "Technology"]
};

const placeholderDigests: DigestSummary[] = [
  {
    id: "placeholder-2026-06-30",
    title: "Morning brief placeholder",
    deliveredAt: null,
    status: "draft",
    storyCount: 0
  }
];

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? defaultBaseUrl;

  async function request<T>(path: string): Promise<T | null> {
    if (!baseUrl) {
      return null;
    }

    const response = await fetch(new URL(path, baseUrl), {
      headers: {
        Accept: "application/json",
        ...(options.authToken
          ? { Authorization: `Bearer ${options.authToken}` }
          : {})
      },
      cache: "no-store"
    });

    if (response.status === 404 || response.status === 501) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`SMS News API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  return {
    async getDigestHistory(): Promise<DigestSummary[]> {
      return (await request<DigestSummary[]>("/digests")) ?? placeholderDigests;
    },

    async getSettings(): Promise<UserSettings> {
      return (await request<UserSettings>("/me/settings")) ?? placeholderSettings;
    },

    async getOnboarding(): Promise<OnboardingSnapshot> {
      return (
        (await request<OnboardingSnapshot>("/me/onboarding")) ?? {
          hasCompletedOnboarding: false,
          recommendedTopics: placeholderSettings.topics,
          settings: placeholderSettings
        }
      );
    }
  };
}

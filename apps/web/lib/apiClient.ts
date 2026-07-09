import "server-only";

import type {
  DigestDetailDto,
  DigestListDto,
  FeedbackRequestDto,
  MeDto,
  OnboardingPayload,
  OnboardingStateDto,
  UserSettingsDto,
  UserSettingsPayload
} from "@sipnews/contracts";

type ApiClientOptions = {
  authToken?: string | null;
  baseUrl?: string;
};

const defaultBaseUrl = process.env.NEXT_PUBLIC_SIPNEWS_API_URL;

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? defaultBaseUrl;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!baseUrl) {
      throw new Error("Sip API base URL is not configured");
    }

    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {}),
        ...init?.headers
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Sip API request failed: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  return {
    getMe(): Promise<MeDto> {
      return request<MeDto>("/v1/me");
    },

    getOnboarding(): Promise<OnboardingStateDto> {
      return request<OnboardingStateDto>("/v1/me/onboarding");
    },

    saveOnboarding(payload: OnboardingPayload): Promise<OnboardingStateDto> {
      return request<OnboardingStateDto>("/v1/me/onboarding", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },

    getSettings(): Promise<UserSettingsDto> {
      return request<UserSettingsDto>("/v1/me/settings");
    },

    saveSettings(payload: UserSettingsPayload): Promise<UserSettingsDto> {
      return request<UserSettingsDto>("/v1/me/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    },

    async getDigestHistory() {
      const response = await request<DigestListDto>("/v1/me/digests");
      return response.digests;
    },

    getDigest(id: string): Promise<DigestDetailDto> {
      return request<DigestDetailDto>(`/v1/me/digests/${encodeURIComponent(id)}`);
    },

    sendFeedback(payload: FeedbackRequestDto): Promise<{ ok: true; persisted: boolean }> {
      return request<{ ok: true; persisted: boolean }>("/v1/me/feedback", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  };
}

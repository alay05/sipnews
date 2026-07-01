import { z } from "zod";

export const topicCategorySchema = z.enum(["world", "tech", "ai", "startups"]);
export type TopicCategory = z.infer<typeof topicCategorySchema>;

export const topicCategories = topicCategorySchema.options;

const categoryAliases: Record<string, TopicCategory> = {
  general: "world",
  news: "world",
  politics: "world",
  us: "world",
  "u.s.": "world",
  "united states": "world",
  world: "world",
  tech: "tech",
  technology: "tech",
  "tech industry": "tech",
  ai: "ai",
  "ai-dev": "ai",
  "ai development": "ai",
  llm: "ai",
  openai: "ai",
  programming: "ai",
  dev: "ai",
  developer: "ai",
  software: "ai",
  startup: "startups",
  startups: "startups",
  venture: "startups",
  funding: "startups"
};

export function normalizeTopicCategory(value: string): TopicCategory {
  const key = value.toLowerCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ").trim();
  return topicCategorySchema.parse(categoryAliases[key] ?? key);
}

export const summaryLengthSchema = z.enum(["small", "medium", "large"]);
export type SummaryLength = z.infer<typeof summaryLengthSchema>;

export const summaryLengths = summaryLengthSchema.options;

export const categoryCountMapSchema = z.object({
  world: z.number().int().min(0),
  tech: z.number().int().min(0),
  ai: z.number().int().min(0),
  startups: z.number().int().min(0)
});
export type CategoryCountMap = z.infer<typeof categoryCountMapSchema>;

const digestPreferencesBaseSchema = z.object({
  timezone: z.string().min(1),
  sendHour: z.number().int().min(0).max(23),
  digestMaxItems: z.number().int().min(1).max(25),
  categoryCounts: categoryCountMapSchema,
  summaryLength: summaryLengthSchema
});

function refineDigestPreferences(
  value: DigestPreferencesLike,
  ctx: z.RefinementCtx
) {
  const total = Object.values(value.categoryCounts).reduce((sum, count) => sum + count, 0);
  if (total !== value.digestMaxItems) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoryCounts"],
      message: "Category counts must add up to digestMaxItems"
    });
  }

  if (total <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["categoryCounts"],
      message: "At least one category must have a positive count"
    });
  }
}

type DigestPreferencesLike = z.infer<typeof digestPreferencesBaseSchema>;

export const digestPreferencesSchema = digestPreferencesBaseSchema.superRefine(refineDigestPreferences);
export type DigestPreferences = z.infer<typeof digestPreferencesSchema>;

export const onboardingPayloadSchema = digestPreferencesBaseSchema.extend({
  displayName: z.string().min(1).optional()
}).superRefine(refineDigestPreferences);
export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;

const userSettingsPayloadBaseSchema = digestPreferencesBaseSchema.extend({
  displayName: z.string().min(1).optional(),
  isActive: z.boolean().optional()
});

export const userSettingsPayloadSchema = userSettingsPayloadBaseSchema.superRefine(
  refineDigestPreferences
);
export type UserSettingsPayload = z.infer<typeof userSettingsPayloadSchema>;

export const meDtoSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  isActive: z.boolean(),
  onboardingComplete: z.boolean()
});
export type MeDto = z.infer<typeof meDtoSchema>;

export const userSettingsDtoSchema = userSettingsPayloadBaseSchema.extend({
  email: z.string().email().optional()
}).superRefine(refineDigestPreferences);
export type UserSettingsDto = z.infer<typeof userSettingsDtoSchema>;

export const onboardingStateDtoSchema = z.object({
  isComplete: z.boolean(),
  settings: userSettingsDtoSchema
});
export type OnboardingStateDto = z.infer<typeof onboardingStateDtoSchema>;

export const digestSourceLinkDtoSchema = z.object({
  sourceName: z.string(),
  url: z.string().url()
});
export type DigestSourceLinkDto = z.infer<typeof digestSourceLinkDtoSchema>;

export const digestItemDtoSchema = z.object({
  index: z.number().int().nonnegative(),
  clusterId: z.string(),
  title: z.string(),
  summary: z.string(),
  whyItMatters: z.string().optional(),
  sourceLinks: z.array(digestSourceLinkDtoSchema),
  topics: z.array(z.string()),
  category: topicCategorySchema.optional()
});
export type DigestItemDto = z.infer<typeof digestItemDtoSchema>;

export const digestSummaryDtoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  localDate: z.string(),
  createdAt: z.string(),
  deliveredAt: z.string().optional(),
  itemCount: z.number().int().nonnegative(),
  title: z.string()
});
export type DigestSummaryDto = z.infer<typeof digestSummaryDtoSchema>;

export const digestListDtoSchema = z.object({
  digests: z.array(digestSummaryDtoSchema)
});
export type DigestListDto = z.infer<typeof digestListDtoSchema>;

export const digestDetailDtoSchema = digestSummaryDtoSchema.extend({
  bodyText: z.string().optional(),
  items: z.array(digestItemDtoSchema)
});
export type DigestDetailDto = z.infer<typeof digestDetailDtoSchema>;

export const feedbackSentimentSchema = z.enum(["like", "dislike"]);
export type FeedbackSentiment = z.infer<typeof feedbackSentimentSchema>;

export const feedbackRequestDtoSchema = z.object({
  digestId: z.string(),
  itemIndex: z.number().int().nonnegative(),
  sentiment: feedbackSentimentSchema
});
export type FeedbackRequestDto = z.infer<typeof feedbackRequestDtoSchema>;

export const bucketDimensionSchema = z.enum([
  "category",
  "source",
  "user",
  "localDate",
  "summaryLength"
]);
export type BucketDimension = z.infer<typeof bucketDimensionSchema>;

export const bucketDimensionsSchema = z.object({
  category: topicCategorySchema.optional(),
  sourceId: z.string().optional(),
  userId: z.string().optional(),
  localDate: z.string().optional(),
  summaryLength: summaryLengthSchema.optional()
});
export type BucketDimensions = z.infer<typeof bucketDimensionsSchema>;

export const summaryCacheKeySchema = z.object({
  clusterId: z.string().min(1),
  summaryLength: summaryLengthSchema,
  model: z.string().min(1),
  version: z.string().min(1)
});
export type SummaryCacheKey = z.infer<typeof summaryCacheKeySchema>;

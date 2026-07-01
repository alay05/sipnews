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
  const category = categoryAliases[key] ?? key;
  return topicCategorySchema.parse(category);
}

export const summaryLengthSchema = z.enum(["short", "standard", "long"]);
export type SummaryLength = z.infer<typeof summaryLengthSchema>;

export const onboardingPayloadSchema = z.object({
  phoneNumber: z.string().min(1),
  displayName: z.string().min(1).optional(),
  timezone: z.string().min(1),
  sendHour: z.number().int().min(0).max(23),
  digestMaxItems: z.number().int().positive(),
  categories: z.array(topicCategorySchema).default([...topicCategories]),
  summaryLength: summaryLengthSchema.default("standard")
});
export type OnboardingPayload = z.infer<typeof onboardingPayloadSchema>;

export const userSettingsPayloadSchema = z.object({
  displayName: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
  digestMaxItems: z.number().int().positive().optional(),
  categories: z.array(topicCategorySchema).optional(),
  summaryLength: summaryLengthSchema.optional(),
  isActive: z.boolean().optional()
});
export type UserSettingsPayload = z.infer<typeof userSettingsPayloadSchema>;

export const digestSourceLinkDtoSchema = z.object({
  sourceName: z.string(),
  url: z.string().url()
});
export type DigestSourceLinkDto = z.infer<typeof digestSourceLinkDtoSchema>;

export const digestItemDtoSchema = z.object({
  index: z.number().int().nonnegative(),
  clusterId: z.string(),
  title: z.string(),
  shortSummary: z.string(),
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
  sentAt: z.string().optional(),
  itemCount: z.number().int().nonnegative()
});
export type DigestSummaryDto = z.infer<typeof digestSummaryDtoSchema>;

export const digestListDtoSchema = z.object({
  digests: z.array(digestSummaryDtoSchema)
});
export type DigestListDto = z.infer<typeof digestListDtoSchema>;

export const digestDetailDtoSchema = digestSummaryDtoSchema.extend({
  recipientPhone: z.string().optional(),
  smsBody: z.string(),
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
  sourceArticleIds: z.array(z.string()).min(1),
  category: topicCategorySchema,
  summaryLength: summaryLengthSchema,
  model: z.string().min(1),
  version: z.string().min(1)
});
export type SummaryCacheKey = z.infer<typeof summaryCacheKeySchema>;

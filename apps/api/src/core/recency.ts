import type { Article } from "../types/articles.js";

const HOURS_PER_DAY = 24;
const MS_PER_HOUR = 60 * 60 * 1000;
const FUTURE_TOLERANCE_HOURS = 6;

export function filterRecentArticles(
  articles: Article[],
  options: { now: Date; maxAgeDays: number }
): Article[] {
  return articles.filter((article) =>
    isRecentArticle(article, {
      now: options.now,
      maxAgeDays: options.maxAgeDays
    })
  );
}

export function isRecentArticle(
  article: Article,
  options: { now: Date; maxAgeDays: number }
): boolean {
  if (!article.publishedAt) return false;

  const ageHours =
    (options.now.getTime() - article.publishedAt.getTime()) / MS_PER_HOUR;

  if (ageHours < -FUTURE_TOLERANCE_HOURS) return false;
  return ageHours <= options.maxAgeDays * HOURS_PER_DAY;
}

# Source Recommendations for Daily AI News SMS Digest

Researched: 2026-06-05

## Recommended MVP Strategy

Use RSS and official APIs first. They are stable, cheap, and provide enough metadata for a daily SMS digest: title, canonical link, publication time, excerpt, source, and sometimes tags. Avoid broad article scraping in the MVP unless the source explicitly permits it; use article links and summaries from feed/API metadata where possible.

For the user's preference, weight the digest toward tech, AI, programming, and startups while preserving one concise general-news slot:

- General world / US news: 20%
- Tech industry: 30%
- AI tools, AI development, and general programming: 30%
- Startups and venture: 20%

For an SMS digest, default to 5 items with a weighted rotation. Across every two daily digests, target 10 total items:

- 2 general world or US stories
- 3 tech-industry stories
- 3 AI tool/dev/general programming stories
- 2 startup/tool/funding stories

On any single day, send:

- 1 general world or US story
- 1-2 tech-industry stories
- 1-2 AI tool/dev/general programming stories
- 1 startup/tool/funding story

Alternate the extra middle slot between tech industry and AI/dev/programming so the weekly mix stays close to 30% / 30%.

Use a longer web digest for overflow. SMS should contain only the highest-ranked cluster titles, short summaries, and one canonical link per cluster.

## MVP Source Set

| Priority | Category | Source | Why include it | Ingestion method | Cadence | Weight |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | General | BBC News | Reliable global and US/world coverage with official RSS support. BBC states that its News output is available through RSS feeds and an OPML list. | RSS: `https://feeds.bbci.co.uk/news/world/rss.xml`, `https://feeds.bbci.co.uk/news/us_and_canada/rss.xml`, fallback top feed `https://feeds.bbci.co.uk/news/rss.xml`. Source: [BBC feeds](https://support.bbc.co.uk/platform/feeds/NewsFeeds.htm). | Every 2-4 hours | Medium |
| 2 | General | The Guardian | Good world, US, tech, science, and policy coverage; official API provides article text for non-commercial developer usage. | Official API with sections/tags such as `world`, `us-news`, `technology`, `science`. Source: [Guardian Open Platform access](https://open-platform.theguardian.com/access/) and [documentation](https://open-platform.theguardian.com/documentation/). | Every 2-4 hours | Medium |
| 3 | General discovery | GDELT 2.0 DOC API | Broad global discovery layer across many outlets and languages; useful for catching major stories without hard-coding every outlet. | Official API, links only. Use domain filters for Reuters/AP/NYT/NPR-style discovery rather than scraping full articles. Source: [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/amp/). | Every 2-4 hours | Low-medium |
| 4 | General / US | NPR | Useful US/world context and non-clickbait public-radio coverage. Feed availability is less discoverable and should be verified during implementation. | Prefer RSS if working, e.g. NPR top stories feed variants; otherwise use GDELT/domain discovery and link to NPR articles. Source: [NPR homepage](https://www.npr.org/). | Every 4-6 hours | Low |
| 5 | Tech industry | The Verge | Strong consumer tech, platform, policy, and AI product coverage. | RSS: `https://www.theverge.com/rss/index.xml`. Full-text RSS is a paid subscriber feature; free feed may be excerpt-only. Sources: [Vox Media subscription announcement](https://www.voxmedia.com/2024/12/3/24312010/the-verge-launches-its-first-sitewide-subscription-product), [feed reference](https://daige.st/en/sources/predefined/the-verge-rss). | Hourly | High |
| 6 | Tech industry / dev | Ars Technica | Strong technical reporting, cybersecurity, policy, science, and developer-adjacent coverage. | RSS. Recommended feeds: all news plus Technology Lab and Security/Law sections. Source: [Ars RSS feeds](https://arstechnica.com/rss-feeds/). | Hourly | High |
| 7 | Tech industry / AI | WIRED | Useful AI, business-of-tech, security, and culture coverage; official RSS page lists topic feeds. | RSS feeds for Top Stories, Business, Artificial Intelligence, and Security. Source: [WIRED RSS feeds](https://www.wired.com/about/rss-feeds/). | Hourly | Medium-high |
| 8 | Tech / startups | TechCrunch | Strong startup, venture, AI, enterprise, and product-launch coverage; high overlap with startup news. | RSS and topic pages. Start with main feed plus AI, Startups, Venture, Enterprise. Source: [TechCrunch subscribing](https://techcrunch.com/subscribing/). | Hourly | High |
| 9 | Dev / AI | GitHub Blog | First-party source for GitHub product updates, Copilot, AI/ML, open-source, and developer platform news. | RSS: `https://github.blog/feed/`, `https://github.blog/ai-and-ml/feed/`, `https://github.blog/changelog/feed/`. Source: [GitHub blog RSS location](https://github.blog/news-insights/new-blog-rss-feed-location/). | Every 2-4 hours | Medium-high |
| 10 | AI labs / tools | OpenAI News | First-party source for OpenAI model, product, safety, engineering, and Codex announcements. | RSS: `https://openai.com/news/rss.xml`; also monitor category pages if needed. Source: [OpenAI News](https://openai.com/news/). | Every 2-4 hours | High |
| 11 | AI labs / tools | Anthropic Newsroom | First-party Claude/model/company announcements. No clearly exposed native RSS found during research, so avoid assuming one. | Official page monitor or GDELT/domain filter for `anthropic.com/news`; do not scrape full article text unless terms allow. Source: [Anthropic Newsroom](https://www.anthropic.com/news). | Every 2-4 hours | High |
| 12 | AI labs / research | Google DeepMind | First-party AI model, research, robotics, science, and Gemini-related updates. Native RSS was not clearly exposed in research. | Official page monitor for `deepmind.google/blog/` and/or Google AI blog links; use link/excerpt metadata. Source: [Google DeepMind news](https://deepmind.google/blog/). | Every 2-4 hours | High |
| 13 | AI/dev analysis | Simon Willison's Weblog | High-signal AI engineering, LLM tooling, coding-agent, security, and developer practice commentary. | Atom/RSS: `https://simonwillison.net/atom/everything/`; optionally filter tags like `generative-ai`, `llms`, `ai-assisted-programming`, `prompt-injection`. Source: [Simon Willison's Weblog](https://simonwillison.net/). | Every 2-4 hours | High |
| 14 | Dev / architecture | InfoQ | Enterprise software, architecture, DevOps, Java, AI/ML, and data engineering trends. | RSS from InfoQ topic pages, especially AI/ML/Data Engineering, Architecture, DevOps. Source: [InfoQ RSS references](https://www.infoq.com/InfoQ/). | Every 4-6 hours | Medium |
| 15 | Programming | Stack Overflow Blog | Developer ecosystem, programming practice, Stack Overflow product/community, AI and developer survey content. | RSS: `https://stackoverflow.blog/feed/`; optionally parse weekly newsletters if desired. Source: [Stack Overflow Blog](https://stackoverflow.blog/). | Daily or every 6 hours | Medium |
| 16 | Programming / startup signal | Hacker News | Best source for developer attention and early technical/startup signal, but noisy. | Official RSS: `https://news.ycombinator.com/rss`. For MVP quality, prefer HNRSS keyword/threshold feeds for `AI`, `LLM`, `programming`, `startup`, `Show HN`, and minimum points/comments. Source: [HN official RSS reference](https://dupple.com/blog/hacker-news-rss), [HNRSS GitHub](https://github.com/hnrss). | Hourly, rank at digest time | High |
| 17 | Curated newsletters | TLDR newsletter family | Efficient curated layer for tech, AI, dev, DevOps, security, product, and founders. Treat as an aggregator, not a primary source. | Newsletter ingestion via inbound email-to-RSS or mailbox parser. Subscribe to TLDR, TLDR AI, TLDR Dev, and TLDR Founders. Source: [TLDR newsletters list](https://tldrnewsletter.io/newsletters). | Daily as emails arrive | Medium |
| 18 | Startups | Y Combinator Blog | High-quality founder/startup advice and YC announcements; not a high-volume breaking-news source but strong relevance. | RSS: `https://www.ycombinator.com/blog/rss` or `https://www.ycombinator.com/blog/feed`; verify during implementation. Source: [YC blog](https://www.ycombinator.com/blog/), [feed reference](https://daige.st/en/sources/predefined/y-combinator). | Daily | Medium |
| 19 | AI tools / startups | Product Hunt | Strong daily signal for new AI tools, dev tools, SaaS, founder products, and market experiments. | Official RSS. Product Hunt confirms a main RSS feed exists. Source: [Product Hunt RSS help](https://help.producthunt.com/en/articles/484970-does-product-hunt-have-an-rss-feed). | Daily after leaderboard stabilizes | Medium-high |
| 20 | Startups / venture | Crunchbase News | Startup funding, private markets, AI startup rounds, M&A, venture trends. | RSS or newsletter; avoid Crunchbase data scraping. Use Crunchbase News editorial only. Sources: [Crunchbase News](https://news.crunchbase.com/), [about Crunchbase News](https://news.crunchbase.com/about-news/). | Daily | Medium |

## Sources to Defer or Treat Carefully

- NewsAPI: useful for development-time discovery, but the free Developer plan is for development/testing only, has request limits, and does not provide full article text. Use only for prototyping unless the user pays for a production plan. Source: [NewsAPI pricing](https://newsapi.org/pricing), [NewsAPI terms](https://newsapi.org/terms).
- AP and Reuters direct ingestion: valuable outlets, but direct content/API access is typically commercial or not straightforward for personal apps. Prefer GDELT domain-filtered discovery links or official RSS if verified; avoid scraping article bodies.
- The Information, Stratechery, Platformer, and other paid newsletters: high-signal for tech strategy, but ingestion depends on user subscription terms. Add later through a private mailbox/newsletter parser if the user subscribes.
- Social/X/LinkedIn feeds: high signal for AI tooling but noisy and API/licensing-heavy. Defer until the RSS/API pipeline is stable.

## Ingestion Design

Use three source classes:

1. Primary RSS/API sources: BBC, Guardian, TechCrunch, Ars, WIRED, GitHub, OpenAI, Simon Willison, InfoQ, Stack Overflow, Hacker News, YC, Product Hunt, Crunchbase News.
2. Official page monitors: Anthropic Newsroom, Google DeepMind News, and any source with no exposed RSS.
3. Curator/newsletter sources: TLDR and optional paid newsletters. Rank these lower for uniqueness because they often summarize primary stories already ingested elsewhere.

Each fetched item should normalize into:

- `source_name`
- `source_category`
- `source_weight`
- `ingestion_method`
- `title`
- `canonical_url`
- `published_at`
- `author`
- `excerpt`
- `tags`
- `raw_feed_id` or GUID
- `source_url`
- `is_curator_source`

Do not require full article text for MVP. For high-quality summaries, combine feed excerpts, Open Graph metadata, title, source tags, and cross-source cluster context. Where official APIs provide article text, such as The Guardian's developer access, store it with attribution and source constraints.

## Deduping and Ranking Notes

- Cluster exact duplicate canonical URLs first, then near-duplicate normalized titles, then embedding similarity.
- Treat Hacker News as a discussion signal. If HN links to an article already ingested from another source, keep the original article as the primary link and attach the HN discussion as a secondary link.
- Treat newsletters as curators. If TLDR points to the same OpenAI, TechCrunch, GitHub, or Product Hunt item already present, boost the cluster's ranking but do not create a duplicate digest item.
- Product Hunt duplicates should be matched by product name, landing-page URL, and founder/company name, not only by Product Hunt URL.
- AI lab announcements often trigger same-day coverage from The Verge, TechCrunch, WIRED, HN, and Simon Willison. Cluster by entity/version terms like model name, product name, benchmark name, and release date.
- General-news sources should be capped to avoid crowding out the user's tech preference. A major world/US story can override the cap only if it appears across multiple independent sources or has unusually high GDELT volume.

## Default Daily Digest Policy

- Fetch feeds throughout the day, but generate one daily digest at the user's chosen morning time.
- Rank candidate clusters with this starting formula:
  - 35% personal preference score from feedback
  - 25% source/category weight
  - 20% cross-source corroboration or discussion signal
  - 10% recency
  - 10% novelty compared with recent digests
- Start with these per-category caps for the SMS:
  - General: max 1 item
  - Tech industry: max 2 items
  - AI/dev/programming: max 2 items
  - Startups/tools: max 1 item
- Use a two-day weighted rotation so the 5-item SMS format averages to 20% general, 30% tech industry, 30% AI tool/dev/general programming, and 20% startups.
- Full web digest can include 10-15 ranked items plus "more like this" links.

## Implementation Assumptions

- This is a personal MVP, not a commercial news redistribution product.
- RSS/API metadata and links are enough for v1 SMS summaries; full article extraction is optional and source-specific.
- The system should keep per-source failure logs because feeds can move, throttle, or block automated access.
- The user can refine the source mix later with SMS commands such as `more AI tools`, `less politics`, `mute Product Hunt`, `more startups`, or `only major world news`.

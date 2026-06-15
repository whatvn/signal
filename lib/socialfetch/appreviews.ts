import gplay from "google-play-scraper";
import { RawPost } from "./types";

// iTunes RSS feed: public, no auth, up to 10 pages × 50 reviews
export async function fetchAppleReviews(
  cutoff: number,
  appId: string,
  country: string
): Promise<RawPost[]> {
  const sourceUrl = `https://apps.apple.com/${country}/app/id${appId}`;
  try {
    const allPosts: RawPost[] = [];
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page++) {
      const url = `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${appId}/sortby=mostrecent/json`;
      const res = await fetch(url);

      if (!res.ok) {
        console.warn(`[AppReviews] Apple RSS page ${page} status ${res.status}`);
        break;
      }

      const json = (await res.json()) as {
        feed?: {
          entry?: Array<{
            id: { label: string };
            author: { name: { label: string } };
            title: { label: string };
            content: { label: string };
            updated: { label: string };
            link: { attributes: { href: string } };
          }>;
        };
      };

      const items = json.feed?.entry ?? [];
      if (items.length === 0) break;

      const posts = items.map((r): RawPost => {
        const publishedAt = r.updated?.label
          ? Math.floor(new Date(r.updated.label).getTime() / 1000)
          : undefined;
        const text = [r.title?.label, r.content?.label].filter(Boolean).join("\n");
        return {
          id: `as_${r.id.label}`,
          platform: "appstore",
          authorHandle: r.author?.name?.label ?? "",
          contentText: text,
          sourceUrl: r.link?.attributes?.href ?? sourceUrl,
          rawJson: JSON.stringify(r),
          publishedAt,
        };
      });

      allPosts.push(...posts);

      const allOlderThanCutoff = posts.every(
        (p) => p.publishedAt != null && p.publishedAt < cutoff
      );
      if (allOlderThanCutoff) break;
    }

    return allPosts;
  } catch (err) {
    console.error("[AppReviews] Apple App Store fetch failed:", err);
    return [];
  }
}

export async function fetchPlayStoreReviews(
  cutoff: number,
  appId: string
): Promise<RawPost[]> {
  const sourceUrl = `https://play.google.com/store/apps/details?id=${appId}`;
  try {
    const allPosts: RawPost[] = [];
    let nextToken: string | undefined;
    const maxPages = 5;

    for (let page = 0; page < maxPages; page++) {
      const result = await gplay.reviews({
        appId,
        sort: 2, // sort.NEWEST
        num: 100,
        lang: "vi",
        country: "vn",
        paginate: true,
        nextPaginationToken: nextToken,
      });

      const items = result.data ?? [];
      if (items.length === 0) break;

      const posts = items.map((r): RawPost => {
        const publishedAt = r.date
          ? Math.floor(new Date(r.date).getTime() / 1000)
          : undefined;
        const text = r.title ? `${r.title}\n${r.text}` : r.text;
        return {
          id: `gp_${r.id}`,
          platform: "playstore",
          authorHandle: r.userName ?? "",
          contentText: text ?? "",
          sourceUrl: r.url ?? sourceUrl,
          rawJson: JSON.stringify(r),
          publishedAt,
        };
      });

      allPosts.push(...posts);

      const allOlderThanCutoff = posts.every(
        (p) => p.publishedAt != null && p.publishedAt < cutoff
      );
      if (allOlderThanCutoff || !result.nextPaginationToken) break;

      nextToken = result.nextPaginationToken;
    }

    return allPosts;
  } catch (err) {
    console.error("[AppReviews] Google Play Store fetch failed:", err);
    return [];
  }
}

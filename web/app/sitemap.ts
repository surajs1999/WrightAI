import { MetadataRoute } from "next";

const BASE = "https://www.wrightai.live";

/**
 * Generates a static sitemap array defining the crawlable URLs, their update frequency, and priority for the application.
 *
 * Returns a Next.js-compatible MetadataRoute.Sitemap array containing entries for the base URL, the documentation page, and the login page. Each entry includes the current date as the lastModified timestamp, a changeFrequency hint for crawlers, and a numeric priority value indicating relative importance.
 * @returns {MetadataRoute.Sitemap} An array of sitemap entry objects, each containing a URL string, lastModified Date, changeFrequency string, and a numeric priority value. Includes entries for the root URL (priority 1), /docs (priority 0.8), and /login (priority 0.3).
 * @example
 * // In Next.js app/sitemap.ts, the default export is picked up automatically:
 * const sitemapEntries = sitemap();
 * // sitemapEntries[0] => { url: 'https://example.com', lastModified: Date, changeFrequency: 'weekly', priority: 1 }
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = ["python", "typescript", "javascript", "go", "rust"];

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...languages.map((lang) => ({
      url: `${BASE}/${lang}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    {
      url: `${BASE}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}

import { MetadataRoute } from "next";

const BASE = "https://www.wrightai.live";

/**
 * Generates a structured sitemap for the application, covering the home page, docs, language-specific pages, and the login page.
 *
 * Builds and returns a Next.js-compatible sitemap array containing URL entries for the base route, documentation, five supported programming language pages (Python, TypeScript, JavaScript, Go, Rust), and the login page. Each entry includes the current date as the last-modified timestamp, a change frequency hint, and a priority score for search engine crawling.
 * @returns {MetadataRoute.Sitemap} An array of sitemap entry objects, each containing a URL, lastModified date set to the current date, a changeFrequency string ('weekly' or 'monthly'), and a numeric priority value between 0 and 1.
 * @example
 * // In Next.js app/sitemap.ts, export the function as default:
 * // export default sitemap;
 * // Next.js will automatically call it and serve /sitemap.xml
 * const entries = sitemap();
 * // entries[0] => { url: 'https://example.com', lastModified: Date, changeFrequency: 'weekly', priority: 1 }
 * // entries[2] => { url: 'https://example.com/python', lastModified: Date, changeFrequency: 'monthly', priority: 0.9 }
 */




// Update LAST_UPDATED when you make meaningful content changes to the home or docs pages
const LAST_UPDATED = new Date("2025-05-25");

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = [
    { slug: "python",     updated: new Date("2025-05-25") },
    { slug: "typescript", updated: new Date("2025-05-25") },
    { slug: "javascript", updated: new Date("2025-05-25") },
    { slug: "go",         updated: new Date("2025-05-25") },
    { slug: "rust",       updated: new Date("2025-05-25") },
  ];

  return [
    {
      url: BASE,
      lastModified: LAST_UPDATED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/docs`,
      lastModified: LAST_UPDATED,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...languages.map(({ slug, updated }) => ({
      url: `${BASE}/${slug}`,
      lastModified: updated,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    {
      url: `${BASE}/login`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];
}

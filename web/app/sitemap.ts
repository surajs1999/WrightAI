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

import { MetadataRoute } from "next";

/**
 * Generates and returns the robots.txt configuration for the WrightAI web application.
 *
 * Defines crawling rules for all user agents, permitting access to the root path while blocking the /dashboard/, /auth/, and /api/ routes. Also provides the sitemap URL for search engine indexing.
 * @returns {MetadataRoute.Robots} A Next.js MetadataRoute.Robots object containing crawling rules for all user agents and the sitemap URL.
 * @example
 * // In Next.js app/robots.ts
 * import { robots } from './robots';
 * const robotsConfig = robots();
 * // robotsConfig.sitemap === 'https://wrightai-web.fly.dev/sitemap.xml'
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/auth/", "/api/"],
    },
    sitemap: "https://wrightai-web.fly.dev/sitemap.xml",
  };
}

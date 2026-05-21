import { MetadataRoute } from "next";

/**
 * Generates and returns the robots.txt configuration for the Wright AI web application.
 *
 * Defines crawling rules for all user agents, permitting access to the root path while blocking dashboard, authentication, and API routes. Also specifies the sitemap URL for search engine indexing.
 * @returns {MetadataRoute.Robots} A Next.js MetadataRoute.Robots object containing crawler rules (userAgent, allow, disallow paths) and the sitemap URL for the Wright AI site.
 * @example
 * // In Next.js app/robots.ts
 * const robotsConfig = robots();
 * // robotsConfig.rules.disallow => ["/dashboard/", "/auth/", "/api/"]
 * // robotsConfig.sitemap => "https://www.wrightai.live/sitemap.xml"
 */




export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/auth/", "/api/"],
    },
    sitemap: "https://www.wrightai.live/sitemap.xml",
  };
}

"use client";

import { useEffect } from "react";
import { ga } from "@/lib/ga";

const SCROLL_MILESTONES = [25, 50, 75, 90] as const;

export default function HomepageAnalytics() {
  // Scroll depth
  useEffect(() => {
    const fired = new Set<number>();
    const onScroll = () => {
      const pct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      for (const milestone of SCROLL_MILESTONES) {
        if (pct >= milestone && !fired.has(milestone)) {
          fired.add(milestone);
          ga.scrollDepth(milestone as 25 | 50 | 75 | 90);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Return visit detection
  useEffect(() => {
    const key = "wright_visited";
    if (sessionStorage.getItem(key)) {
      ga.returnVisit();
    } else {
      sessionStorage.setItem(key, "1");
    }
  }, []);

  return null;
}

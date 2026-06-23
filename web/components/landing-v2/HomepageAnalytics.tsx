"use client";

import { useEffect } from "react";
import { ga } from "@/lib/ga";

const SCROLL_MILESTONES = [25, 50, 75, 90] as const;

// Sections to time — matches the IDs used in the page
const TIMED_SECTIONS: { id: string; label: string }[] = [
  { id: "section-problem",  label: "The Problem" },
  { id: "pillars",          label: "How It Works" },
  { id: "drift",            label: "Drift Detection" },
  { id: "install",          label: "Get Started" },
  { id: "compare",          label: "Compare" },
  { id: "section-whynow",  label: "Why Now" },
  { id: "section-feedback", label: "Feedback" },
];

// Only fire if they spent at least this many seconds in a section
const MIN_SECONDS = 5;

export default function HomepageAnalytics() {
  // Scroll depth
  useEffect(() => {
    const fired = new Set<number>();
    const onScroll = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      if (total <= 0) return;
      const pct = Math.round((window.scrollY / total) * 100);
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

  // Time on section
  useEffect(() => {
    const entryTimes = new Map<string, number>();
    const observers: IntersectionObserver[] = [];

    TIMED_SECTIONS.forEach(({ id, label }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            entryTimes.set(id, Date.now());
          } else {
            const entered = entryTimes.get(id);
            if (entered) {
              const seconds = Math.round((Date.now() - entered) / 1000);
              entryTimes.delete(id);
              if (seconds >= MIN_SECONDS) {
                ga.timeOnSection(label, seconds);
              }
            }
          }
        },
        { threshold: 0.3 } // section must be 30% visible to count as "in view"
      );

      obs.observe(el);
      observers.push(obs);
    });

    // Fire for any section still visible when user leaves
    const onUnload = () => {
      entryTimes.forEach((entered, id) => {
        const section = TIMED_SECTIONS.find(s => s.id === id);
        if (!section) return;
        const seconds = Math.round((Date.now() - entered) / 1000);
        if (seconds >= MIN_SECONDS) ga.timeOnSection(section.label, seconds);
      });
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      observers.forEach(o => o.disconnect());
      window.removeEventListener("beforeunload", onUnload);
    };
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

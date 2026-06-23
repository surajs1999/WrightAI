"use client";

import { useEffect, useRef, useState } from "react";
import { ga } from "@/lib/ga";

const SECTIONS = [
  { id: "section-hero",       label: "Hero",            color: "#7F77DD" },
  { id: "section-problem",    label: "The Problem",     color: "#E24B4A" },
  { id: "pillars",            label: "How It Works",    color: "#7F77DD" },
  { id: "drift",              label: "Drift Detection", color: "#EF9F27" },
  { id: "install",            label: "Get Started",     color: "#1D9E75" },
  { id: "section-command",    label: "Command Center",  color: "#1D9E75" },
  { id: "section-ai",         label: "AI Context",      color: "#00D4FF" },
  { id: "compare",            label: "Compare",         color: "#7F77DD" },
  { id: "section-whynow",     label: "Why Now",         color: "#EF9F27" },
  { id: "section-feedback",   label: "Feedback",        color: "#7F77DD" },
  { id: "section-finalcta",   label: "Start Free",      color: "#1D9E75" },
];

const SEGMENT = 40; // px between dots

export default function ScrollRuler() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const prevIndexRef = useRef(-1);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setIsScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setIsScrolling(false), 1000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTIONS.forEach((section, i) => {
      const el = document.getElementById(section.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i);
            if (prevIndexRef.current !== i) {
              prevIndexRef.current = i;
              ga.sectionView(SECTIONS[i].label);
            }
          }
        },
        { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const active = SECTIONS[activeIndex];
  const progressPct = activeIndex / (SECTIONS.length - 1);

  return (
    <div
      className="scroll-ruler-wrap"
      style={{
        position: "fixed",
        left: 20,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Top cap */}
      <div style={{ width: 1, height: 20, background: "rgba(175,169,236,0.08)" }} />

      {/* Track + dots */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Background track */}
        <div style={{
          position: "absolute",
          left: "50%", top: 0, bottom: 0, width: 1,
          background: "rgba(175,169,236,0.1)",
          transform: "translateX(-50%)",
        }} />

        {/* Filled progress */}
        <div style={{
          position: "absolute",
          left: "50%", top: 0, width: 1,
          height: `${progressPct * 100}%`,
          background: `linear-gradient(to bottom, rgba(127,119,221,0.6), ${active.color}90)`,
          transform: "translateX(-50%)",
          transition: "height 0.5s ease, background 0.4s ease",
        }} />

        {SECTIONS.map((section, i) => {
          const isActive  = i === activeIndex;
          const isPassed  = i < activeIndex;
          const isHovered = hovered === i;

          return (
            <div
              key={section.id}
              style={{
                position: "relative",
                height: SEGMENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={() => scrollTo(section.id)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Section number — left of dot */}
              <span style={{
                position: "absolute",
                right: "calc(100% + 7px)",
                fontFamily: "var(--font-mono)",
                fontSize: 8.5,
                letterSpacing: "0.04em",
                color: isActive
                  ? section.color
                  : isPassed
                    ? "rgba(175,169,236,0.3)"
                    : "rgba(175,169,236,0.15)",
                transition: "color 0.3s",
                userSelect: "none",
              }}>
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Dot */}
              <div style={{
                width:  isActive ? 9 : isPassed ? 6 : 5,
                height: isActive ? 9 : isPassed ? 6 : 5,
                borderRadius: "50%",
                background: isActive
                  ? section.color
                  : isPassed
                    ? `${section.color}55`
                    : isHovered
                      ? `${section.color}40`
                      : "rgba(175,169,236,0.18)",
                boxShadow: isActive
                  ? `0 0 0 3px ${section.color}20, 0 0 12px ${section.color}60`
                  : isHovered
                    ? `0 0 6px ${section.color}50`
                    : "none",
                transition: "all 0.25s ease",
                zIndex: 1,
                flexShrink: 0,
              }} />

              {/* Label — active section while scrolling, any section on hover */}
              {((isScrolling && isActive) || isHovered) && (
                <div style={{
                  position: "absolute",
                  left: "calc(100% + 12px)",
                  background: "rgba(8,6,18,0.92)",
                  border: `1px solid ${section.color}35`,
                  borderRadius: 7,
                  padding: "4px 10px",
                  fontFamily: "var(--font-body)",
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: isActive ? section.color : "var(--text-muted)",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  zIndex: 10,
                  boxShadow: `0 4px 16px rgba(0,0,0,0.45)`,
                  animation: "float-up 0.12s ease-out",
                }}>
                  {section.label}
                </div>
              )}

              {/* Tick mark on left side (active only) */}
              {isActive && (
                <div style={{
                  position: "absolute",
                  right: "calc(100% + 2px)",
                  width: 4,
                  height: 1,
                  background: section.color,
                  opacity: 0.6,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom cap */}
      <div style={{ width: 1, height: 20, background: "rgba(175,169,236,0.08)" }} />

      {/* Progress % at bottom */}
      <div style={{
        marginTop: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 8.5,
        color: active.color,
        letterSpacing: "0.04em",
        opacity: 0.6,
        transition: "color 0.4s",
        userSelect: "none",
      }}>
        {String(Math.round(progressPct * 100)).padStart(2, "0")}%
      </div>
    </div>
  );
}

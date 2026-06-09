import React from "react";

/**
 * Inline spinner dot — use wherever a "Loading…" label needs an animated indicator.
 *
 * @param size   Dot diameter in px (default 7)
 * @param color  CSS color value (default var(--purple-light))
 * @param gap    Gap between the spinner and adjacent text in px (default 6)
 */
export function Spinner({
  size = 7,
  color = "var(--purple-light)",
  gap = 6,
}: {
  size?: number;
  color?: string;
  gap?: number;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        marginRight: gap,
        animation: "pulse-hex 1.2s ease-in-out infinite",
      }}
    />
  );
}

/**
 * A row of three bouncing dots — use inside output panels / empty states
 * to indicate background work is in progress.
 */
export function DotsLoader({ color = "var(--purple-light)" }: { color?: string }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            display: "inline-block",
            animation: `pulse-hex 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * A single skeleton shimmer block — drop it anywhere content will appear after loading.
 */
export function SkeletonBlock({
  width = "100%",
  height = 18,
  style,
}: {
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 6, ...style }}
    />
  );
}

/**
 * A spinning arc indicator — used inside buttons and status badges.
 */
export function SpinnerArc({ size = 14, color = "var(--purple-light)" }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid rgba(175,169,236,0.2)`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

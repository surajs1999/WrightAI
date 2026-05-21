"use client";

import { useState } from "react";

interface CoverageBarProps {
  folder: string;
  pct: number;
  documented?: number;
  total?: number;
}

/**
 * Renders a styled coverage bar row displaying a folder's documentation coverage percentage, count badge, and animated progress bar with hover interactions.
 *
 * Displays a single row in a coverage dashboard grid containing a color-coded status dot, a truncated folder path, an optional documented/total count badge, an animated progress bar, and a percentage badge. Colors transition through green (≥80%), amber (≥50%), and red (<50%) thresholds. The row highlights on hover and the progress bar gains a glow effect.
 *
 * @param {string} folder - The folder path to display. Paths longer than 28 characters are truncated with a leading ellipsis showing the last 25 characters.
 * @param {number} pct - The documentation coverage percentage (0–100) used to determine bar width and color thresholds.
 * @param {number | undefined} documented - The number of documented items in the folder. Displayed alongside total when both are provided.
 * @param {number | undefined} total - The total number of items in the folder. Displayed alongside documented when both are provided.
 * @returns {JSX.Element} A React div element containing the fully styled coverage bar row with status dot, folder label, count badge, progress bar, and percentage badge.
 * @example
 * <CoverageBar folder="src/components/dashboard" pct={76} documented={19} total={25} />
 */



export default function CoverageBar({ folder, pct, documented, total }: CoverageBarProps) {
  const [hovered, setHovered] = useState(false);

  const color = pct >= 80 ? "var(--green)" : pct >= 50 ? "var(--amber)" : "var(--red)";
  const bgColor = pct >= 80 ? "rgba(29,158,117,0.08)" : pct >= 50 ? "rgba(239,159,39,0.08)" : "rgba(226,75,74,0.08)";
  const icon = pct >= 80 ? "●" : pct >= 50 ? "●" : "●";

  const shortFolder = folder.length > 28 ? "…" + folder.slice(-25) : folder;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "16px 1fr auto 1fr auto",
        alignItems: "center",
        gap: 10,
        padding: "9px 10px",
        borderRadius: 8,
        background: hovered ? "rgba(175,169,236,0.04)" : "transparent",
        transition: "background 0.15s",
        cursor: "default",
      }}
    >
      {/* Status dot */}
      <span style={{ fontSize: 8, color, lineHeight: 1, textAlign: "center" }}>{icon}</span>

      {/* Folder name */}
      <span
        title={folder}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: hovered ? "var(--text)" : "var(--text-muted)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          transition: "color 0.15s",
        }}
      >
        {shortFolder}
      </span>

      {/* Count badge */}
      {total !== undefined && documented !== undefined ? (
        <span style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-muted)",
          whiteSpace: "nowrap",
          minWidth: 52,
          textAlign: "right",
        }}>
          {documented}/{total}
        </span>
      ) : (
        <span />
      )}

      {/* Progress bar */}
      <div style={{ height: 6, background: "rgba(175,169,236,0.08)", borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(pct, 100)}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: hovered ? `0 0 6px ${color}` : "none",
          }}
        />
      </div>

      {/* Percentage badge */}
      <span style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        color,
        background: hovered ? bgColor : "transparent",
        padding: "2px 7px",
        borderRadius: 5,
        minWidth: 42,
        textAlign: "right",
        transition: "background 0.15s",
      }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

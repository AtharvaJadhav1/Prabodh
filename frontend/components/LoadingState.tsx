"use client";

import React from "react";
import ThoughtLine from "./ThoughtLine";

export interface LoadingStateProps {
  label?: string;
  steps?: string[];
  doneLabel?: string;
  compact?: boolean;
  fontSize?: number;
  color?: string;
  glyphColor?: string;
  className?: string;
}

const BRAND_DEEP = "#5B2E10";
const BRAND_PRIMARY = "#D96B27";

export default function LoadingState({
  label,
  steps,
  doneLabel,
  compact = false,
  fontSize,
  color = BRAND_DEEP,
  glyphColor = BRAND_PRIMARY,
  className = "",
}: LoadingStateProps) {
  return (
    <div
      className={`${
        compact ? "flex items-center justify-center" : "flex min-h-screen items-center justify-center bg-brand-canvas px-6"
      } ${className}`}
    >
      <ThoughtLine
        label={label}
        doneLabel={doneLabel}
        steps={steps}
        color={color}
        glyphColor={glyphColor}
        fontSize={fontSize ?? (compact ? 14 : 16)}
        collapsible={false}
        collapseOnSettle={false}
      />
    </div>
  );
}
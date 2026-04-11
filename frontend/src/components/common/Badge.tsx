import React from "react";
import clsx from "clsx";

interface BadgeProperties {
  children: React.ReactNode;
  colour?: "primary" | "success" | "warning" | "danger" | "neutral";
  size?: "small" | "medium";
  className?: string;
}

export function Badge({
  children,
  colour = "neutral",
  size = "medium",
  className,
}: BadgeProperties) {
  const colourStyles = {
    primary: "bg-primary-200/45 text-primary-900 border border-primary-300/55",
    success: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    warning: "bg-accent-orange/20 text-accent-orange border border-accent-orange/35",
    danger: "bg-accent-rose/20 text-accent-rose border border-accent-rose/35",
    neutral: "bg-navy-200/80 text-navy-800 border border-navy-300/80",
  };

  const sizeStyles = {
    small: "px-2 py-0.5 text-xs",
    medium: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full font-medium",
        colourStyles[colour],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

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
    primary: "bg-primary-200/30 text-primary-900 border border-primary-300/55",
    success: "bg-primary-200/30 text-primary-900 border border-primary-300/55",
    warning: "bg-amber-500/20 text-amber-200 border border-amber-500/35",
    danger: "bg-red-500/20 text-red-200 border border-red-500/35",
    neutral: "bg-navy-200/80 text-navy-800 border border-navy-300/70",
  };

  const sizeStyles = {
    small: "px-2 py-1 text-xs",
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

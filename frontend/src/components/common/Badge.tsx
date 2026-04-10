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
    primary: "bg-primary-100 text-primary-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-orange-100 text-orange-700",
    danger: "bg-red-100 text-red-700",
    neutral: "bg-navy-100 text-navy-700",
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

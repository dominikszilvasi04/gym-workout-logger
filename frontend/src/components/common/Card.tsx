import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
  border?: boolean;
  interactive?: boolean;
}

/**
 * Professional card component for containing content
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      padding = "md",
      shadow = "md",
      border = false,
      interactive = false,
      className,
      ...props
    },
    ref
  ) => {
    const paddingStyles = {
      none: "p-0",
      sm: "p-3",
      md: "p-4 md:p-6",
      lg: "p-6 md:p-8",
    };

    const shadowStyles = {
      none: "",
      sm: "shadow-sm",
      md: "shadow-md",
      lg: "shadow-lg",
    };

    return (
      <div
        ref={ref}
        className={clsx(
          "rounded-2xl bg-[linear-gradient(160deg,rgba(30,26,22,0.94)_0%,rgba(20,18,16,0.96)_100%)] backdrop-blur-sm",
          paddingStyles[padding],
          shadowStyles[shadow],
          border && "border border-navy-300/60",
          interactive && "hover:shadow-lg transition-shadow duration-200 cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

import React from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  children: React.ReactNode;
}

/**
 * Professional primary button component
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      icon,
      iconPosition = "left",
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        "bg-primary-500 text-navy-950 hover:bg-primary-600 active:bg-primary-700 shadow-[0_8px_24px_rgba(91,108,255,0.35)] disabled:bg-primary-300",
      secondary:
        "bg-navy-200 text-navy-900 hover:bg-navy-300 active:bg-navy-400 disabled:bg-navy-100",
      outline:
        "border border-primary-400/60 bg-primary-100/30 text-primary-900 hover:bg-primary-200/30 active:bg-primary-300/35 disabled:border-primary-300/50 disabled:text-primary-400",
      ghost:
        "text-primary-800 hover:bg-primary-100/45 active:bg-primary-200/45 disabled:text-primary-500",
      danger:
        "bg-accent-rose text-navy-950 hover:brightness-105 active:brightness-95 disabled:opacity-40",
    };

    const sizeStyles = {
      xs: "px-2 py-1 text-xs font-medium h-7 min-w-7",
      sm: "px-3 py-1.5 text-sm font-medium h-8 min-w-8",
      md: "px-4 py-2 text-base font-medium h-10 min-w-10",
      lg: "px-6 py-3 text-lg font-medium h-12 min-w-12",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          "inline-flex items-center justify-center gap-2",
          "rounded-xl font-medium transition-[transform,box-shadow,background-color,color,border-color] duration-200 ease-out motion-reduce:transition-none",
          "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/80",
          "touch-target", // min 44x44 for mobile
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {icon && iconPosition === "left" && (
          <span className={isLoading ? "animate-spin" : ""}>{icon}</span>
        )}
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Loading...
          </>
        ) : (
          children
        )}
        {icon && iconPosition === "right" && <span>{icon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

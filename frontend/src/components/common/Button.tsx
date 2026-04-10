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
        "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 disabled:bg-primary-300",
      secondary:
        "bg-navy-200 text-navy-900 hover:bg-navy-300 active:bg-navy-400 disabled:bg-navy-100",
      outline:
        "border-2 border-primary-500 text-primary-500 hover:bg-primary-50 active:bg-primary-100 disabled:border-primary-300 disabled:text-primary-300",
      ghost:
        "text-primary-500 hover:bg-primary-50 active:bg-primary-100 disabled:text-primary-300",
      danger:
        "bg-accent-rose text-white hover:bg-red-600 active:bg-red-700 disabled:bg-red-300",
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
          "rounded-lg font-medium transition-all duration-200",
          "active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
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

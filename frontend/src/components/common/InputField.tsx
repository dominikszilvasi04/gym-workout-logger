import React from "react";
import clsx from "clsx";

interface InputFieldProperties extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  errorMessage?: string;
  helperText?: string;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProperties>(
  ({ label, errorMessage, helperText, className, id, ...properties }, reference) => {
    const inputIdentifier = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputIdentifier} className="text-sm font-medium text-navy-800">
          {label}
        </label>
        <input
          ref={reference}
          id={inputIdentifier}
          className={clsx(
            "h-11 w-full rounded-lg border px-3 text-base text-navy-900",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            "placeholder:text-navy-400",
            errorMessage ? "border-red-500" : "border-navy-300",
            className
          )}
          {...properties}
        />
        {errorMessage ? (
          <p className="text-sm text-red-600">{errorMessage}</p>
        ) : helperText ? (
          <p className="text-sm text-navy-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

InputField.displayName = "InputField";

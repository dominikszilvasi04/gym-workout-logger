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
    const isDateLikeInput = properties.type === "datetime-local" || properties.type === "date" || properties.type === "time";

    return (
      <div className="min-w-0 flex flex-col gap-1">
        <label htmlFor={inputIdentifier} className="text-sm font-medium tracking-[0.01em] text-navy-800">
          {label}
        </label>
        <input
          ref={reference}
          id={inputIdentifier}
          className={clsx(
            "touch-target block h-11 min-w-0 w-full max-w-full rounded-xl border bg-navy-50/80 px-3 text-base text-navy-900",
            "focus:outline-none focus:ring-2 focus:ring-primary-600/80 focus:border-primary-500",
            "touch-manipulation placeholder:text-navy-600",
            isDateLikeInput && "overflow-hidden text-left [text-align-last:left] [&::-webkit-datetime-edit]:text-left [&::-webkit-datetime-edit-fields-wrapper]:justify-start",
            errorMessage ? "border-red-400" : "border-navy-300/70",
            className
          )}
          {...properties}
        />
        {errorMessage ? (
          <p className="text-sm text-red-300">{errorMessage}</p>
        ) : helperText ? (
          <p className="text-sm text-navy-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

InputField.displayName = "InputField";

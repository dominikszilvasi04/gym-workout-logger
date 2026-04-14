import React, { useEffect, useRef } from "react";

interface DialogProperties {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Dialog({ open, title, onClose, children, footer }: DialogProperties) {
  const dialogContainerReference = useRef<HTMLDivElement | null>(null);
  const closeButtonReference = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return;
    }

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousTouchAction = body.style.touchAction;
    const previouslyFocusedElement = document.activeElement as HTMLElement | null;

    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    const focusTimer = window.setTimeout(() => {
      closeButtonReference.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const container = dialogContainerReference.current;
      if (!container) {
        return;
      }

      const focusableElements = Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled") && !element.getAttribute("aria-hidden"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/78 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogContainerReference}
        className="flex h-[min(88vh,42rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-navy-300/60 bg-[linear-gradient(160deg,rgba(30,26,22,0.98)_0%,rgba(20,18,16,0.98)_100%)] shadow-2xl shadow-black/55"
      >
        <div className="flex items-center justify-between border-b border-navy-300/60 p-4">
          <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
          <button
            ref={closeButtonReference}
            type="button"
            onClick={onClose}
            className="touch-target h-11 w-11 rounded-full text-navy-700 transition-colors duration-150 hover:bg-navy-200/65 focus-visible:ring-2 focus-visible:ring-primary-600/80"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <div className="border-t border-navy-300/60 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

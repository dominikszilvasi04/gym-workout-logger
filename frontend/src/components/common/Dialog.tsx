import React from "react";

interface DialogProperties {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Dialog({ open, title, onClose, children, footer }: DialogProperties) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/78 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-2xl border border-navy-300/60 bg-[linear-gradient(160deg,rgba(30,26,22,0.98)_0%,rgba(20,18,16,0.98)_100%)] shadow-2xl shadow-black/55">
        <div className="flex items-center justify-between border-b border-navy-300/60 p-4">
          <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
          <button type="button" onClick={onClose} className="touch-target h-11 w-11 rounded-full text-navy-700 transition-colors duration-150 hover:bg-navy-200/65 focus-visible:ring-2 focus-visible:ring-primary-600/80" aria-label="Close dialog">
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
        {footer ? <div className="border-t border-navy-300/60 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

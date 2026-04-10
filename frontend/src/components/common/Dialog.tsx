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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-200 p-4">
          <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-full text-navy-500 hover:bg-navy-100">
            ×
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
        {footer ? <div className="border-t border-navy-200 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

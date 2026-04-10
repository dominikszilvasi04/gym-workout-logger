import React from "react";
import { BottomNavigation } from "./BottomNavigation";

interface ApplicationShellProperties {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function ApplicationShell({ title, action, children }: ApplicationShellProperties) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl bg-navy-50 pb-24">
      <header className="sticky top-0 z-30 border-b border-navy-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="font-display text-2xl font-semibold text-navy-900">{title}</h1>
          {action}
        </div>
      </header>
      <main className="space-y-4 p-4">{children}</main>
      <BottomNavigation />
    </div>
  );
}

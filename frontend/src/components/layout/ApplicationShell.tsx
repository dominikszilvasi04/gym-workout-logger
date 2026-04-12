import React from "react";
import { BottomNavigation } from "./BottomNavigation";

interface ApplicationShellProperties {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function ApplicationShell({ title, action, children }: ApplicationShellProperties) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl bg-[linear-gradient(180deg,#0d0c0b_0%,#141210_55%,#1b1916_100%)] pb-24">
      <header className="sticky top-0 z-30 border-b border-navy-300/50 bg-navy-100/90 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-primary-700">Atelier strength</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-[0.01em] text-navy-950">{title}</h1>
          </div>
          {action ? <div className="pt-1">{action}</div> : null}
        </div>
      </header>
      <main className="space-y-4 px-4 py-4 motion-safe:animate-fade-in">{children}</main>
      <BottomNavigation />
    </div>
  );
}

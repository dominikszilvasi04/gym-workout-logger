import React from "react";
import { BottomNavigation } from "./BottomNavigation";

interface ApplicationShellProperties {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function ApplicationShell({ title, action, children }: ApplicationShellProperties) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.10),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_52%,_#ffffff_100%)] pb-24">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/80 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-600">Gym workout logger</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-navy-950">{title}</h1>
          </div>
          {action ? <div className="pt-1">{action}</div> : null}
        </div>
      </header>
      <main className="space-y-4 px-4 py-4">{children}</main>
      <BottomNavigation />
    </div>
  );
}

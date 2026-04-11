import React from "react";
import { BottomNavigation } from "./BottomNavigation";

interface ApplicationShellProperties {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function ApplicationShell({ title, action, children }: ApplicationShellProperties) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl bg-[radial-gradient(circle_at_10%_-10%,_rgba(91,108,255,0.24),_transparent_35%),radial-gradient(circle_at_88%_0%,_rgba(33,209,144,0.14),_transparent_24%),linear-gradient(180deg,_#070b14_0%,_#0b1220_52%,_#111c2e_100%)] pb-24">
      <header className="sticky top-0 z-30 border-b border-navy-300/60 bg-navy-100/86 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-700">Gym workout logger</p>
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

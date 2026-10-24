"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import CallProvider from "@/components/CallProvider";

const TABS = [
  {
    href: "/app",
    label: "চ্যাট",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none">
        <path
          d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.3-.6L3 21l1.8-5.1A8.2 8.2 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill={a ? "currentColor" : "none"}
          fillOpacity={a ? 0.14 : 0}
        />
      </svg>
    ),
  },
  {
    href: "/app/calls",
    label: "কল",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none">
        <path
          d="M6.6 3.5h-.9A2.7 2.7 0 0 0 3 6.4C3 14.5 9.5 21 17.6 21a2.7 2.7 0 0 0 2.9-2.7v-.9a1.4 1.4 0 0 0-1-1.3l-3-.9a1.4 1.4 0 0 0-1.5.5l-.8 1a12.4 12.4 0 0 1-5-5l1-.8a1.4 1.4 0 0 0 .5-1.5l-.9-3a1.4 1.4 0 0 0-1.2-.9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill={a ? "currentColor" : "none"}
          fillOpacity={a ? 0.14 : 0}
        />
      </svg>
    ),
  },
  {
    href: "/app/contacts",
    label: "কন্টাক্ট",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none">
        <circle
          cx="9"
          cy="8"
          r="3.6"
          stroke="currentColor"
          strokeWidth="1.8"
          fill={a ? "currentColor" : "none"}
          fillOpacity={a ? 0.14 : 0}
        />
        <path
          d="M2.8 20c.5-3.3 3.1-5.4 6.2-5.4s5.7 2.1 6.2 5.4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16.5 5.4a3.2 3.2 0 0 1 0 6M18.4 14.9c2.1.5 3.6 2.3 3.9 5.1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/app/profile",
    label: "প্রোফাইল",
    icon: (a: boolean) => (
      <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none">
        <circle
          cx="12"
          cy="8"
          r="3.8"
          stroke="currentColor"
          strokeWidth="1.8"
          fill={a ? "currentColor" : "none"}
          fillOpacity={a ? 0.14 : 0}
        />
        <path
          d="M4.8 20.2c.6-3.7 3.6-6 7.2-6s6.6 2.3 7.2 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/app/chat/");

  return (
    <CallProvider>
      <div className="mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white shadow-[0_0_60px_-20px_rgba(11,27,51,0.25)]">
        <main className="flex-1 overflow-hidden">{children}</main>

        {!hideNav && (
          <nav className="safe-b grid grid-cols-4 border-t border-[var(--line)] bg-white/95 backdrop-blur">
            {TABS.map((tab) => {
              const active =
                tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                    active ? "text-[var(--brand-600)]" : "text-slate-400"
                  }`}
                >
                  {active && (
                    <span className="absolute left-1/2 top-0 h-0.5 w-9 -translate-x-1/2 rounded-full bg-[var(--brand-500)]" />
                  )}
                  {tab.icon(active)}
                  <span className={active ? "font-semibold" : ""}>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </CallProvider>
  );
}

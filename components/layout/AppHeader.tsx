"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/pipeline", label: "Pipeline" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-700/50 px-6 py-3 shrink-0 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: "#4ECDC4", color: "#0F172A" }}
        >
          Z
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-100">Signal — Social Listening</h1>
          <p className="text-xs text-slate-500">Real-time monitoring · Multi-platform</p>
        </div>
      </div>

      <nav className="flex items-center gap-1">
        {NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                active
                  ? "bg-slate-700 text-slate-100 font-medium"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-brand animate-pulse" />
        <span className="text-xs text-slate-400">Live</span>
      </div>
    </header>
  );
}

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/any", label: "Any site", id: "any" },
  { to: "/guide", label: "Guide", id: "guide" },
] as const;

export function SiteHeader({
  active,
  extra,
}: {
  active?: "home" | "any" | "guide";
  extra?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <Link to="/" className="shrink-0 font-display text-xl tracking-tight text-fg">
          Skipper
        </Link>
        <nav className="flex min-w-0 items-center">
          {LINKS.map((link) => (
            <Link
              key={link.id}
              to={link.to}
              className={cn(
                "inline-flex h-11 items-center px-2.5 text-sm sm:px-3",
                active === link.id ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {link.label}
            </Link>
          ))}
          {extra}
        </nav>
      </div>
    </header>
  );
}

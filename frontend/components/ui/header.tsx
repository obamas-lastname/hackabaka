"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default function Header({ title = "Fraud Detection Dashboard", prominent = false }: { title?: string; prominent?: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    document.title = title;
  }, [title]);

  const isActive = (href: string) => pathname === href;

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Statistics", href: "/statistics" },
    { label: "Map", href: "/map" },
  ];

  return (
    <header className="w-full border-b border-border bg-background/40 backdrop-blur-sm">
      <div className="px-4 md:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 flex items-center justify-center rounded-lg w-10 h-10 bg-gradient-to-br from-red-500/20 to-orange-500/10 border border-red-200/30 dark:border-red-800/30">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
          
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

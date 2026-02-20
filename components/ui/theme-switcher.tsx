"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const current = theme === "system" ? resolvedTheme : theme;

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background p-1">
      <button
        onClick={() => setTheme("light")}
        className={`rounded-md p-2 transition-colors ${
          current === "light"
            ? "bg-muted text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted"
        }`}
        title="Light"
      >
        <Sun size={16} />
      </button>

      <button
        onClick={() => setTheme("dark")}
        className={`rounded-md p-2 transition-colors ${
          current === "dark"
            ? "bg-muted text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted"
        }`}
        title="Dark"
      >
        <Moon size={16} />
      </button>

      <button
        onClick={() => setTheme("system")}
        className={`rounded-md p-2 transition-colors ${
          theme === "system"
            ? "bg-muted text-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted"
        }`}
        title="System"
      >
        <Monitor size={16} />
      </button>
    </div>
  );
}
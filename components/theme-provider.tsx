"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"           // uses .dark class (Tailwind default)
      defaultTheme="system"       // respects system preference initially
      enableSystem
      disableTransitionOnChange   // ← prevents flash during switch
    >
      {children}
    </NextThemesProvider>
  );
}
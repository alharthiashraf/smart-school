"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export default function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme="smart-light"
      enableSystem={false}
      themes={["smart-light", "smart-dark"]}
      storageKey="smart-school-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}

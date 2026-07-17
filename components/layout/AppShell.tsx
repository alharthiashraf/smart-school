"use client";

import { createContext, useContext, type ReactNode } from "react";

import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Breadcrumb from "./Breadcrumb";
import PageContainer from "./PageContainer";

const AppShellContext = createContext(false);

type AppShellProps = {
  children: ReactNode;
  showHeader?: boolean;
  showBreadcrumb?: boolean;
};

export default function AppShell({
  children,
  showHeader = true,
  showBreadcrumb = true,
}: AppShellProps) {
  const alreadyInsideShell = useContext(AppShellContext);

  if (alreadyInsideShell) {
    return <>{children}</>;
  }

  return (
    <AppShellContext.Provider value>
      <main
        dir="rtl"
        className="
          min-h-screen overflow-x-hidden
          bg-[var(--app-background)]
          text-[var(--app-text)]
          transition-colors duration-300
        "
      >
        <div className="flex min-h-screen w-full overflow-x-hidden">
          <AppSidebar />

          <section className="min-w-0 flex-1 overflow-x-hidden">
            {showHeader && <AppHeader />}

            <div className="w-full px-3 py-4 sm:px-4 lg:px-6">
              <PageContainer>
                {showBreadcrumb && <Breadcrumb />}

                <div className="min-w-0">{children}</div>
              </PageContainer>
            </div>
          </section>
        </div>
      </main>
    </AppShellContext.Provider>
  );
}
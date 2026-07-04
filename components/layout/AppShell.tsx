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

  if (alreadyInsideShell) return <>{children}</>;

  return (
    <AppShellContext.Provider value={true}>
      <main
        dir="rtl"
        className="min-h-screen overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-text)] transition-colors duration-300"
      >
        <div className="flex min-h-screen w-full overflow-x-hidden">
          <AppSidebar />

          <section className="min-w-0 flex-1 overflow-x-hidden">
            {showHeader && <AppHeader />}

            <div className="w-full bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.08),transparent_34%),var(--app-bg)] px-3 py-4 transition-colors duration-300 sm:px-4 lg:px-5 xl:px-6">
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
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
  showHeader?: boolean;
};

export default function AppShell({
  children,
  showHeader = true,
}: AppShellProps) {
  return (
    <main
      dir="rtl"
      className="
        min-h-screen
        bg-[var(--app-background)]
        text-[var(--app-text)]
      "
    >
      <div className="flex min-h-screen">
        <AppSidebar />

        <section className="flex min-w-0 flex-1 flex-col">
          {showHeader && <AppHeader />}

          <div
            className="
              flex-1
              overflow-x-hidden
            "
          >
            <div
              className="
                mx-auto
                w-full
                max-w-[1700px]
                px-3
                py-4
                sm:px-4
                lg:px-5
                xl:px-6
              "
            >
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
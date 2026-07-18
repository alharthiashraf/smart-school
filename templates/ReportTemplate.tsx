import type { ReactNode } from "react";
import PageHeader from "@/components/ui/page/PageHeader";
import Section from "@/components/ui/page/PageSection";
import LoadingSkeleton from "@/components/ui/feedback/LoadingSkeleton";
import ErrorState from "@/components/ui/feedback/ErrorState";

type ReportTemplateProps = {
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  actions?: ReactNode;

  preparedBy?: string;
  xAccount?: string;

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  children: ReactNode;
};

export default function ReportTemplate({
  title,
  description,
  badge = "تقرير",
  icon,
  actions,
  preparedBy,
  xAccount,
  loading = false,
  error,
  onRetry,
  children,
}: ReportTemplateProps) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 p-4">
        <ErrorState
          title="تعذر تحميل التقرير"
          description={error}
          action={
            onRetry && (
              <button
                onClick={onRetry}
                className="rounded-2xl bg-[#15445a] px-4 py-2 text-sm font-bold text-white"
              >
                إعادة المحاولة
              </button>
            )
          }
        />
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 text-slate-900 print:bg-white"
    >
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <div className="print:hidden">
          <PageHeader
            title={title}
            description={description}
            badge={badge}
            icon={icon}
            actions={actions}
          />
        </div>

        <Section>
          <div className="mb-5 hidden border-b border-slate-100 pb-4 print:block">
            <h1 className="text-2xl font-black text-[#15445a]">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>

          {children}

          <div className="mt-6 flex flex-col gap-2 border-t border-slate-100 pt-4 text-xs font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>إعداد: {preparedBy || "غير متوفر"}</span>
            <span>حساب X: {xAccount || "غير متوفر"}</span>
          </div>
        </Section>
      </div>
    </main>
  );
}

import type { ReactNode } from "react";
import PageHeader from "@/components/ui/page/PageHeader";
import Section from "@/components/ui/page/Section";
import AIInsightCard from "@/components/ui/ai/AIInsightCard";
import LoadingSkeleton from "@/components/ui/feedback/LoadingSkeleton";
import ErrorState from "@/components/ui/feedback/ErrorState";

type AIPageTemplateProps = {
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  actions?: ReactNode;

  insightTitle?: string;
  insight: string;
  insightTone?: "info" | "success" | "warning" | "danger";

  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;

  children: ReactNode;
};

export default function AIPageTemplate({
  title,
  description,
  badge = "تحليل ذكي",
  icon,
  actions,
  insightTitle = "تحليل ذكي",
  insight,
  insightTone = "info",
  loading = false,
  error,
  onRetry,
  children,
}: AIPageTemplateProps) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 p-4">
        <ErrorState
          title="تعذر تشغيل التحليل"
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
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mx-auto w-full max-w-[1500px] space-y-5">
        <PageHeader
          title={title}
          description={description}
          badge={badge}
          icon={icon}
          actions={actions}
        />

        <AIInsightCard
          title={insightTitle}
          description={insight}
          tone={insightTone}
        />

        <Section>{children}</Section>
      </div>
    </main>
  );
}
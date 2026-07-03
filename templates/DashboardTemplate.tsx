import type { ReactNode } from "react";
import PageHeader from "@/components/ui/page/PageHeader";
import Section from "@/components/ui/page/Section";
import StatCard from "@/components/ui/cards/StatCard";
import LoadingSkeleton from "@/components/ui/feedback/LoadingSkeleton";
import ErrorState from "@/components/ui/feedback/ErrorState";
import AIInsightCard from "@/components/ui/ai/AIInsightCard";

type StatItem = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  color?: "emerald" | "blue" | "cyan" | "gold" | "rose" | "slate";
  subtitle?: string;
};

type DashboardTemplateProps = {
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  stats?: StatItem[];
  insight?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
};

export default function DashboardTemplate({
  title,
  description,
  badge = "لوحة تحكم",
  icon,
  actions,
  stats = [],
  insight,
  loading = false,
  error,
  onRetry,
  children,
}: DashboardTemplateProps) {
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 p-4">
        <ErrorState
          title="تعذر تحميل لوحة التحكم"
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

        {stats.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </div>
        )}

        {insight && (
          <AIInsightCard
            title="رؤية ذكية"
            description={insight}
            tone="info"
          />
        )}

        <Section>{children}</Section>
      </div>
    </main>
  );
}
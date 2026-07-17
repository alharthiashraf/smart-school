"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ClipboardList,
  MessageCircle,
  Route,
  ShieldCheck,
  UserRoundSearch,
  Users,
} from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import PageContainer from "@/components/layout/PageContainer";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";
import PageHeader from "@/components/ui/page/PageHeader";

type CounselorCardTone =
  | "primary"
  | "green"
  | "gold"
  | "neutral";

type CounselorCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: CounselorCardTone;
};

const COUNSELOR_CARDS: readonly CounselorCard[] = [
  {
    title: "الحالات الإرشادية",
    description: "متابعة الحالات وخطط الدعم.",
    href: "/counselor/cases",
    icon: UserRoundSearch,
    tone: "primary",
  },
  {
    title: "السلوك والانضباط",
    description: "متابعة المخالفات والإجراءات.",
    href: "/behavior",
    icon: AlertTriangle,
    tone: "gold",
  },
  {
    title: "التدخلات الإرشادية",
    description: "تسجيل خطط العلاج والمتابعة.",
    href: "/counselor/interventions",
    icon: ClipboardList,
    tone: "green",
  },
  {
    title: "التواصل مع أولياء الأمور",
    description: "توثيق التواصل والاجتماعات.",
    href: "/parent-communications",
    icon: MessageCircle,
    tone: "primary",
  },
  {
    title: "السجل الزمني",
    description: "عرض تاريخ متابعة الطالب.",
    href: "/student-timeline",
    icon: Route,
    tone: "neutral",
  },
  {
    title: "تقارير الإرشاد",
    description: "تقارير الحالات والتدخلات.",
    href: "/counselor/reports",
    icon: BarChart3,
    tone: "primary",
  },
] as const;

const TONE_CLASSES: Record<CounselorCardTone, string> = {
  primary:
    "bg-[color-mix(in_srgb,var(--app-primary)_12%,transparent)] text-[var(--app-primary)] group-hover:bg-[var(--app-primary)] group-hover:text-[var(--app-text-inverse)]",
  green:
    "bg-[color-mix(in_srgb,var(--app-success)_12%,transparent)] text-[var(--app-success)] group-hover:bg-[var(--app-success)] group-hover:text-[var(--app-text-inverse)]",
  gold:
    "bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] text-[var(--app-accent-foreground)] group-hover:bg-[var(--app-accent)] group-hover:text-[var(--app-accent-foreground)]",
  neutral:
    "bg-[var(--app-card-soft)] text-[var(--app-text-muted)] group-hover:bg-[var(--app-primary)] group-hover:text-[var(--app-text-inverse)]",
};

export default function CounselorPage() {
  return (
    <AppShell>
      <PageContainer size="wide" className="space-y-6">
        <PageHeader
          variant="hero"
          title="مركز الإرشاد الطلابي"
          description="متابعة الحالات والسلوك والتدخلات والتواصل."
          badge="بوابة الموجه الطلابي"
          icon={<ShieldCheck size={18} aria-hidden="true" />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الإرشاد الطلابي" },
          ]}
          stats={[
            {
              label: "الحالات",
              value: "متابعة",
              icon: <UserRoundSearch size={20} aria-hidden="true" />,
              tone: "primary",
            },
            {
              label: "السلوك",
              value: "نشط",
              icon: <AlertTriangle size={20} aria-hidden="true" />,
              tone: "gold",
            },
            {
              label: "التدخلات",
              value: "مستمرة",
              icon: <Activity size={20} aria-hidden="true" />,
              tone: "green",
            },
            {
              label: "التواصل",
              value: "موثق",
              icon: <Users size={20} aria-hidden="true" />,
              tone: "primary",
            },
          ]}
        />

        <section
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          aria-label="مؤشرات الإرشاد"
        >
          <ExecutiveCard
            title="الحالات"
            value="6"
            subtitle="مسارات متابعة"
            icon={<UserRoundSearch size={22} aria-hidden="true" />}
            tone="primary"
            progress={100}
          />

          <ExecutiveCard
            title="مسارات الدعم"
            value="4"
            subtitle="سلوكي وأكاديمي وأسري"
            icon={<ShieldCheck size={22} aria-hidden="true" />}
            tone="green"
            progress={80}
          />

          <ExecutiveCard
            title="التقارير"
            value="جاهزة"
            subtitle="مؤشرات المتابعة"
            icon={<BarChart3 size={22} aria-hidden="true" />}
            tone="primary"
            progress={75}
          />

          <ExecutiveCard
            title="التكامل"
            value="مرتبط"
            subtitle="الطلاب والسلوك والصحة"
            icon={<Route size={22} aria-hidden="true" />}
            tone="gold"
            progress={90}
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي"
          description="بوابة موحدة لأدوات الإرشاد الطلابي."
          tone="green"
          items={[
            { label: "الحالات", value: "متابعة" },
            { label: "السلوك", value: "مرتبط" },
            { label: "التدخلات", value: "موثقة" },
            { label: "ولي الأمر", value: "تواصل" },
            { label: "السجل الزمني", value: "متكامل" },
            { label: "التقارير", value: "جاهزة" },
          ]}
          footer="يمكن ربط المؤشرات لاحقًا ببيانات Supabase الفعلية."
        />

        <section
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          aria-label="أقسام الإرشاد الطلابي"
        >
          {COUNSELOR_CARDS.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.href}
                href={card.href}
                aria-label={`فتح ${card.title}`}
                className="group rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-[var(--app-shadow-sm)] transition duration-200 hover:-translate-y-1 hover:border-[var(--app-accent-border)] hover:shadow-[var(--app-shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-[var(--app-radius-lg)] transition ${TONE_CLASSES[card.tone]}`}
                    aria-hidden="true"
                  >
                    <Icon size={26} />
                  </span>

                  <ChevronLeft
                    size={22}
                    className="text-[var(--app-text-subtle)] transition group-hover:-translate-x-1 group-hover:text-[var(--app-primary)]"
                    aria-hidden="true"
                  />
                </div>

                <h2 className="text-xl font-black text-[var(--app-text)]">
                  {card.title}
                </h2>

                <p className="mt-3 leading-7 text-[var(--app-text-muted)]">
                  {card.description}
                </p>

                <span className="mt-5 inline-flex rounded-[var(--app-radius-lg)] bg-[var(--app-card-soft)] px-4 py-2 text-xs font-black text-[var(--app-text)] transition group-hover:bg-[var(--app-primary)] group-hover:text-[var(--app-text-inverse)]">
                  فتح
                </span>
              </Link>
            );
          })}
        </section>
      </PageContainer>
    </AppShell>
  );
}

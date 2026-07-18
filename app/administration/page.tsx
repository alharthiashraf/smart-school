"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Building2,
  GraduationCap,
  Layers3,
  School,
  UsersRound,
} from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";
import StatCard from "@/components/ui/cards/StatCard";
import PageHeader from "@/components/ui/page/PageHeader";
import Section from "@/components/ui/page/PageSection";

type AdminCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const ADMIN_CARDS: readonly AdminCard[] = [
  {
    title: "المدارس",
    description: "إدارة المدارس وربطها بالنظام.",
    href: "/schools",
    icon: School,
  },
  {
    title: "المراحل الدراسية",
    description: "إدارة المراحل والصفوف.",
    href: "/stages",
    icon: Layers3,
  },
  {
    title: "الفصول",
    description: "إدارة الفصول والشعب.",
    href: "/classrooms",
    icon: Building2,
  },
  {
    title: "المواد",
    description: "إدارة المواد الدراسية.",
    href: "/subjects",
    icon: BookOpen,
  },
  {
    title: "المعلمون",
    description: "إدارة بيانات المعلمين.",
    href: "/teachers",
    icon: GraduationCap,
  },
  {
    title: "الطلاب",
    description: "إدارة الطلاب والفصول.",
    href: "/students",
    icon: UsersRound,
  },
] as const;

const STATS = [
  {
    title: "المدارس",
    value: "1",
    icon: School,
    tone: "primary" as const,
  },
  {
    title: "المراحل",
    value: "1",
    icon: Layers3,
    tone: "primary" as const,
  },
  {
    title: "الفصول",
    value: "6",
    icon: Building2,
    tone: "gold" as const,
  },
  {
    title: "المواد",
    value: "8",
    icon: BookOpen,
    tone: "primary" as const,
  },
] as const;

export default function AdministrationPage() {
  return (
    <AuthGuard>
      <PageContainer className="space-y-5" size="wide">
        <Breadcrumb />

        <PageHeader
          title="الإدارة المدرسية"
          description="إدارة البنية الأكاديمية والبيانات الأساسية."
          badge="الإدارة الأكاديمية"
          icon={<School className="h-4 w-4" aria-hidden="true" />}
        />

        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="مؤشرات الإدارة"
        >
          {STATS.map((stat) => {
            const Icon = stat.icon;

            return (
              <StatCard
                key={stat.title}
                title={stat.title}
                value={stat.value}
                icon={<Icon className="h-5 w-5" aria-hidden="true" />}
                tone={stat.tone}
              />
            );
          })}
        </section>

        <Section
          title="أقسام الإدارة"
          description="اختر القسم المطلوب."
        >
          <div
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
            aria-label="روابط أقسام الإدارة"
          >
            {ADMIN_CARDS.map((card) => {
              const Icon = card.icon;

              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card-soft)] p-5 transition duration-200 hover:-translate-y-1 hover:border-[var(--app-accent-border)] hover:bg-[var(--app-card)] hover:shadow-[var(--app-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-background)]"
                  aria-label={`فتح قسم ${card.title}`}
                >
                  <span
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-text-inverse)] transition group-hover:bg-[var(--app-accent)] group-hover:text-[var(--app-accent-foreground)]"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  <h2 className="text-xl font-black text-[var(--app-text)]">
                    {card.title}
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
                    {card.description}
                  </p>

                  <span className="mt-4 inline-flex text-sm font-black text-[var(--app-primary)] transition group-hover:text-[var(--app-accent)]">
                    فتح القسم
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>
      </PageContainer>
    </AuthGuard>
  );
}


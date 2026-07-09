"use client";

import Link from "next/link";
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

import PageHeader from "@/components/ui/page/PageHeader";
import Section from "@/components/ui/page/PageSection";
import StatCard from "@/components/ui/cards/StatCard";

const adminCards = [
  {
    title: "المدارس",
    description: "إدارة بيانات المدارس وربطها بالنظام.",
    href: "/schools",
    icon: <School className="h-5 w-5" />,
  },
  {
    title: "المراحل الدراسية",
    description: "تنظيم المراحل مثل الابتدائي والمتوسط والثانوي.",
    href: "/stages",
    icon: <Layers3 className="h-5 w-5" />,
  },
  {
    title: "الفصول",
    description: "إدارة الشعب والفصول وربطها بالصفوف.",
    href: "/classrooms",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    title: "المواد",
    description: "إدارة المواد الدراسية لكل مدرسة.",
    href: "/subjects",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    title: "المعلمون",
    description: "إدارة بيانات المعلمين وتخصصاتهم.",
    href: "/teachers",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    title: "الطلاب",
    description: "إدارة بيانات الطلاب وربطهم بالفصول.",
    href: "/students",
    icon: <UsersRound className="h-5 w-5" />,
  },
];

export default function AdministrationPage() {
  return (
    <AuthGuard>
      <PageContainer className="space-y-5" size="wide">
        <Breadcrumb />

        <PageHeader
          title="لوحة الإدارة المدرسية"
          description="مركز التحكم في البنية الأكاديمية للمدرسة: المدارس، المراحل، الفصول، المواد، المعلمون والطلاب."
          badge="الإدارة الأكاديمية"
          icon={<School className="h-4 w-4" />}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="المدارس"
            value="1"
            icon={<School className="h-5 w-5" />}
            tone="blue"
          />

          <StatCard
            title="المراحل"
            value="1"
            icon={<Layers3 className="h-5 w-5" />}
            tone="teal"
          />

          <StatCard
            title="الفصول"
            value="6"
            icon={<Building2 className="h-5 w-5" />}
            tone="gold"
          />

          <StatCard
            title="المواد"
            value="8"
            icon={<BookOpen className="h-5 w-5" />}
            tone="primary"
          />
        </div>

        <Section
          title="أقسام الإدارة"
          description="اختر القسم الذي تريد العمل عليه."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {adminCards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-[#d4af37] hover:bg-white hover:shadow-sm"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f1f3d] text-white transition group-hover:bg-[#d4af37] group-hover:text-slate-950">
                  {card.icon}
                </div>

                <h2 className="text-xl font-black text-[#15445a]">
                  {card.title}
                </h2>

                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {card.description}
                </p>

                <div className="mt-4 text-sm font-black text-[#0da9a6]">
                  فتح القسم ←
                </div>
              </Link>
            ))}
          </div>
        </Section>
      </PageContainer>
    </AuthGuard>
  );
}
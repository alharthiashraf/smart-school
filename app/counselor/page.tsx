"use client";

import Link from "next/link";

import AppShell from "@/components/layout/AppShell";
import Breadcrumb from "@/components/layout/Breadcrumb";
import PageContainer from "@/components/layout/PageContainer";

import PageHeader from "@/components/ui/page/PageHeader";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

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

const cards = [
  {
    title: "الحالات الإرشادية",
    description:
      "متابعة الحالات الطلابية وخطط الدعم الإرشادي والملاحظات المرتبطة بكل طالب.",
    href: "/counselor/cases",
    icon: UserRoundSearch,
    tone: "blue",
  },
  {
    title: "السلوك والانضباط",
    description:
      "متابعة السلوك والمخالفات والإجراءات التصحيحية وربطها بملف الطالب.",
    href: "/behavior",
    icon: AlertTriangle,
    tone: "gold",
  },
  {
    title: "التدخلات الإرشادية",
    description:
      "تسجيل التدخلات والمتابعة الدورية للطلاب وخطط العلاج والتحسين.",
    href: "/counselor/interventions",
    icon: ClipboardList,
    tone: "green",
  },
  {
    title: "التواصل مع أولياء الأمور",
    description: "توثيق التواصل والملاحظات والاجتماعات مع ولي الأمر.",
    href: "/parent-communications",
    icon: MessageCircle,
    tone: "teal",
  },
  {
    title: "سجل الطالب الزمني",
    description:
      "عرض التسلسل الزمني لحالة الطالب ومتابعته أكاديميًا وسلوكيًا وصحيًا.",
    href: "/student-timeline",
    icon: Route,
    tone: "primary",
  },
  {
    title: "تقارير الإرشاد",
    description: "تقارير الحالات والتدخلات ومؤشرات المتابعة والاحتياج للدعم.",
    href: "/counselor/reports",
    icon: BarChart3,
    tone: "blue",
  },
] as const;

const toneClasses = {
  primary:
    "bg-[#15445A]/10 text-[#15445A] group-hover:bg-[#15445A] group-hover:text-white",
  teal:
    "bg-[#0DA9A6]/10 text-[#0DA9A6] group-hover:bg-[#0DA9A6] group-hover:text-white",
  green:
    "bg-[#07A869]/10 text-[#07A869] group-hover:bg-[#07A869] group-hover:text-white",
  blue:
    "bg-[#3D7EB9]/10 text-[#3D7EB9] group-hover:bg-[#3D7EB9] group-hover:text-white",
  gold:
    "bg-[#C1B489]/20 text-[#15445A] group-hover:bg-[#C1B489] group-hover:text-[#15445A]",
};

export default function CounselorPage() {
  return (
    <AppShell>
      <PageContainer size="wide" className="space-y-6">
        <Breadcrumb />

        <PageHeader
          variant="hero"
          title="مركز الرعاية والتوجيه الطلابي"
          description="بوابة موحدة للموجه الطلابي لمتابعة الحالات الإرشادية، السلوك، التدخلات، التواصل مع أولياء الأمور، والسجل الزمني للطالب."
          badge="بوابة الموجه الطلابي"
          icon={<ShieldCheck size={18} />}
          breadcrumbs={[
            { label: "لوحة التحكم", href: "/dashboard" },
            { label: "الإرشاد الطلابي" },
          ]}
          stats={[
            {
              label: "الحالات",
              value: "متابعة",
              icon: <UserRoundSearch size={20} />,
              tone: "blue",
            },
            {
              label: "السلوك",
              value: "نشط",
              icon: <AlertTriangle size={20} />,
              tone: "gold",
            },
            {
              label: "التدخلات",
              value: "مستمرة",
              icon: <Activity size={20} />,
              tone: "green",
            },
            {
              label: "التواصل",
              value: "موثق",
              icon: <Users size={20} />,
              tone: "teal",
            },
          ]}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ExecutiveCard
            title="الحالات الإرشادية"
            value="6"
            subtitle="وحدات متابعة رئيسية"
            icon={<UserRoundSearch size={22} />}
            tone="blue"
            progress={100}
          />

          <ExecutiveCard
            title="مسارات الدعم"
            value="4"
            subtitle="سلوكي، اجتماعي، أسري، أكاديمي"
            icon={<ShieldCheck size={22} />}
            tone="green"
            progress={80}
          />

          <ExecutiveCard
            title="التقارير"
            value="جاهزة"
            subtitle="مؤشرات ومخرجات متابعة"
            icon={<BarChart3 size={22} />}
            tone="teal"
            progress={75}
          />

          <ExecutiveCard
            title="التكامل"
            value="مرتبط"
            subtitle="الطلاب، السلوك، الصحة، ولي الأمر"
            icon={<Route size={22} />}
            tone="gold"
            progress={90}
          />
        </section>

        <SummaryCard
          title="الملخص التنفيذي للإرشاد الطلابي"
          description="هذه الصفحة تعمل كبوابة تشغيلية تجمع أهم أدوات الموجه الطلابي في مكان واحد."
          tone="green"
          items={[
            { label: "الحالات", value: "متابعة" },
            { label: "السلوك", value: "مرتبط" },
            { label: "التدخلات", value: "موثقة" },
            { label: "ولي الأمر", value: "تواصل" },
            { label: "السجل الزمني", value: "متكامل" },
            { label: "التقارير", value: "جاهزة" },
          ]}
          footer="يفضل لاحقًا ربط هذه البوابة بمؤشرات فعلية من Supabase لعرض عدد الحالات المفتوحة والمتابعات العاجلة."
        />

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#0DA9A6]/30 hover:shadow-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${toneClasses[card.tone]}`}
                  >
                    <Icon size={26} />
                  </div>

                  <ChevronLeft
                    size={22}
                    className="text-slate-400 transition group-hover:-translate-x-1 group-hover:text-[#0DA9A6]"
                  />
                </div>

                <h2 className="text-xl font-black text-[#15445A]">
                  {card.title}
                </h2>

                <p className="mt-3 leading-7 text-slate-600">
                  {card.description}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">
                  فتح الصفحة
                </div>
              </Link>
            );
          })}
        </section>
      </PageContainer>
    </AppShell>
  );
}
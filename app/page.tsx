"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Loader2,
  School,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import SummaryCard from "@/components/ui/cards/SummaryCard";

const platformStats = [
  {
    title: "متعدد المدارس",
    value: "جاهز",
    subtitle: "إدارة أكثر من مدرسة وصلاحية",
    icon: <School className="h-5 w-5" />,
    tone: "blue" as const,
    progress: 100,
  },
  {
    title: "الصلاحيات",
    value: "محكمة",
    subtitle: "مدير، وكيل، معلم، طالب، ولي أمر",
    icon: <ShieldCheck className="h-5 w-5" />,
    tone: "green" as const,
    progress: 95,
  },
  {
    title: "التقارير",
    value: "PDF / Excel",
    subtitle: "تصدير وتحليل وتشغيل يومي",
    icon: <BarChart3 className="h-5 w-5" />,
    tone: "teal" as const,
    progress: 90,
  },
  {
    title: "التكامل التعليمي",
    value: "موحد",
    subtitle: "الحضور، الدرجات، الإرشاد، الصحة",
    icon: <BookOpenCheck className="h-5 w-5" />,
    tone: "gold" as const,
    progress: 88,
  },
];

const portals = [
  {
    title: "لوحة المدرسة",
    description: "إدارة الطلاب والمعلمين والفصول والمواد والصلاحيات من مركز موحد.",
    icon: <School className="h-6 w-6" />,
  },
  {
    title: "بوابة المعلم",
    description: "الحضور، الدرجات، الجدول، التحضير، والمتابعة اليومية للطلاب.",
    icon: <GraduationCap className="h-6 w-6" />,
  },
  {
    title: "بوابة الطالب وولي الأمر",
    description: "متابعة الحضور والدرجات والسلوك وملف الإنجاز والتنبيهات.",
    icon: <UsersRound className="h-6 w-6" />,
  },
];

const externalSystems = [
  {
    title: "منصة مدرستي",
    description: "الدخول إلى منصة مدرستي الرسمية.",
    href: "https://schools.madrasati.sa",
  },
  {
    title: "نظام نور",
    description: "الدخول إلى نظام نور الرسمي.",
    href: "https://noor.moe.gov.sa",
  },
  {
    title: "نظام فارس",
    description: "الدخول إلى نظام فارس للخدمات الذاتية.",
    href: "https://sshr.moe.gov.sa",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 rounded-[28px] border border-white/10 bg-white/10 px-6 py-4 text-sm font-black shadow-xl backdrop-blur">
          <Loader2 className="h-5 w-5 animate-spin text-[#C1B489]" />
          جاري تحميل منصة المدرسة الذكية...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#F6F8FB] text-[#15445A]">
      <section className="relative border-b border-white/70 bg-gradient-to-br from-[#15445A] via-[#123A4E] to-[#0DA9A6] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(193,180,137,0.32),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.14),_transparent_35%)]" />

        <div className="relative mx-auto flex min-h-[640px] max-w-7xl flex-col justify-center px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-[#D8CC9A] shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                منصة المدرسة الذكية 2.0
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                تشغيل مدرسي ذكي بهوية سعودية موحدة
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-9 text-white/82 sm:text-lg">
                نظام مدرسي متكامل لإدارة الطلاب، المعلمين، الحضور، الدرجات،
                الإرشاد، الصحة، الأنشطة، التقارير، والصلاحيات من منصة واحدة.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#C1B489] px-6 text-sm font-black text-[#15445A] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  تسجيل الدخول
                  <ArrowLeft className="h-4 w-4" />
                </Link>

                <a
                  href="https://schools.madrasati.sa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 text-sm font-black text-white shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                >
                  منصة مدرستي
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
                {["متعدد المدارس", "صلاحيات حسب الدور", "تقارير PDF وExcel", "لوحات تشغيلية مباشرة"].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white/90 backdrop-blur"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#C1B489] text-[#15445A]">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[34px] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[28px] bg-white p-6 text-[#15445A] shadow-xl">
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C1B489] text-3xl font-black text-[#15445A]">
                    ذ
                  </div>

                  <div>
                    <h2 className="text-2xl font-black">منصة المدرسة الذكية</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      مركز تشغيل المدرسة اليومي
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {portals.map((portal) => (
                    <div
                      key={portal.title}
                      className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0DA9A6]">
                          {portal.icon}
                        </div>

                        <div>
                          <h3 className="font-black text-[#15445A]">{portal.title}</h3>
                          <p className="mt-1 text-sm leading-7 text-slate-500">
                            {portal.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {platformStats.map((item) => (
            <ExecutiveCard
              key={item.title}
              title={item.title}
              value={item.value}
              subtitle={item.subtitle}
              icon={item.icon}
              tone={item.tone}
              progress={item.progress}
            />
          ))}
        </div>

        <div className="mt-8">
          <SummaryCard
            title="ملخص منصة المدرسة الذكية"
            description="واجهة موحدة تجمع أهم أنظمة التشغيل المدرسي في مكان واحد، مع قابلية التوسع للمدارس المتعددة والصلاحيات الدقيقة."
            tone="green"
            items={[
              { label: "الطلاب", value: "إدارة ومتابعة" },
              { label: "المعلمون", value: "إسناد وجداول" },
              { label: "الحضور", value: "يومي" },
              { label: "الدرجات", value: "متكامل" },
              { label: "التقارير", value: "PDF / Excel" },
              { label: "الصلاحيات", value: "حسب الدور" },
            ]}
            footer="صُممت الصفحة لتكون مدخلًا عامًا للمنصة، بينما ينتقل المستخدم المسجل مباشرة إلى لوحة التحكم."
          />
        </div>

        <section className="mt-8 rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#15445A]">روابط الأنظمة التعليمية</h2>
              <p className="mt-1 text-sm leading-7 text-slate-500">
                روابط سريعة للأنظمة الرسمية التي تحتاجها المدرسة.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {externalSystems.map((system) => (
              <a
                key={system.href}
                href={system.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-[28px] border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#15445A]/10 text-[#15445A] transition group-hover:bg-[#15445A] group-hover:text-white">
                  <ExternalLink className="h-5 w-5" />
                </div>

                <h3 className="text-xl font-black text-[#15445A]">{system.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  {system.description}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-[#15445A] transition group-hover:bg-[#0DA9A6] group-hover:text-white">
                  فتح الرابط
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

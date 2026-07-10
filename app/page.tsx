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
  LayoutDashboard,
  Loader2,
  School,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    title: "إدارة مدرسية موحدة",
    description:
      "الطلاب والمعلمون والفصول والمواد والجداول في مساحة تشغيل واحدة واضحة.",
    icon: School,
  },
  {
    title: "حضور ودرجات متكاملة",
    description:
      "تسجيل الحضور، رصد الدرجات، متابعة السلوك والمواظبة، وإصدار التقارير.",
    icon: BookOpenCheck,
  },
  {
    title: "صلاحيات دقيقة",
    description:
      "تجربة مخصصة للمدير والوكيل والمعلم والطالب وولي الأمر حسب الصلاحيات.",
    icon: ShieldCheck,
  },
  {
    title: "تقارير وقرارات أفضل",
    description:
      "مؤشرات تشغيلية وتقارير PDF وExcel تساعد المدرسة على المتابعة واتخاذ القرار.",
    icon: BarChart3,
  },
];

const roles = [
  {
    title: "الإدارة المدرسية",
    description:
      "إدارة المدرسة ومتابعة الأداء والاعتمادات والتقارير من لوحة تنفيذية موحدة.",
    icon: LayoutDashboard,
  },
  {
    title: "المعلم",
    description:
      "الوصول السريع إلى الجدول والحضور والدرجات والتحضير والمتابعة اليومية.",
    icon: GraduationCap,
  },
  {
    title: "الطالب وولي الأمر",
    description:
      "متابعة الحضور والدرجات والسلوك والتنبيهات والملف الدراسي بسهولة.",
    icon: UsersRound,
  },
];

const externalSystems = [
  {
    title: "منصة مدرستي",
    href: "https://schools.madrasati.sa",
  },
  {
    title: "نظام نور",
    href: "https://noor.moe.gov.sa",
  },
  {
    title: "نظام فارس",
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
      <main className="flex min-h-screen items-center justify-center bg-[#0F2D3A] text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-bold backdrop-blur">
          <Loader2 className="h-5 w-5 animate-spin text-[#D6C58D]" />
          جاري تحميل منصة المدرسة الذكية...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#F7F9FB] text-[#123B4A]"
    >
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D6C58D] text-xl font-black text-[#123B4A] shadow-lg">
              ذ
            </span>
            <div>
              <p className="text-base font-black text-white">
                منصة المدرسة الذكية
              </p>
              <p className="text-xs font-medium text-white/60">
                تشغيل مدرسي أكثر وضوحًا
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
          >
            تسجيل الدخول
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative isolate bg-[#123B4A] text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_18%,rgba(214,197,141,0.22),transparent_26%),radial-gradient(circle_at_15%_85%,rgba(18,169,166,0.20),transparent_30%)]" />

        <div className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-6 pb-20 pt-32 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-[#E4D8AA] backdrop-blur">
              <Sparkles className="h-4 w-4" />
              منصة تعليمية بهوية سعودية
            </div>

            <h1 className="text-4xl font-black leading-[1.25] sm:text-5xl lg:text-6xl">
              مدرستك في منصة واحدة
              <span className="mt-2 block text-[#D6C58D]">
                أسرع، أوضح، وأكثر ذكاءً
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-9 text-white/72 sm:text-lg">
              منصة متكاملة تساعد المدرسة على إدارة الطلاب والمعلمين والحضور
              والدرجات والجداول والتقارير، مع تجربة مخصصة لكل مستخدم حسب دوره.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#D6C58D] px-7 py-3.5 text-sm font-black text-[#123B4A] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl"
              >
                الدخول إلى المنصة
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <a
                href="#features"
                className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-black text-white transition hover:bg-white/10"
              >
                استكشف المميزات
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white/72">
              {[
                "متعدد المدارس",
                "صلاحيات حسب الدور",
                "تقارير PDF وExcel",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#D6C58D]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[42px] bg-white/5 blur-2xl" />

            <div className="relative rounded-[36px] border border-white/12 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[30px] bg-white p-6 text-[#123B4A]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-xs font-bold text-[#0DA9A6]">
                      نظرة سريعة
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      مركز تشغيل المدرسة
                    </h2>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123B4A] text-xl font-black text-[#D6C58D]">
                    ذ
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    "إدارة الطلاب والمعلمين والفصول",
                    "تسجيل الحضور ورصد الدرجات",
                    "متابعة السلوك والمواظبة",
                    "تقارير وتحليلات قابلة للتصدير",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 rounded-2xl bg-[#F7F9FB] px-4 py-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0DA9A6]/10 text-sm font-black text-[#0B8E8B]">
                        {index + 1}
                      </span>
                      <p className="text-sm font-black text-[#123B4A]">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/login"
                  className="mt-6 flex items-center justify-between rounded-2xl bg-[#123B4A] px-5 py-4 text-sm font-black text-white transition hover:bg-[#0E303D]"
                >
                  ابدأ باستخدام المنصة
                  <ArrowLeft className="h-4 w-4 text-[#D6C58D]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-[#0B8E8B]">لماذا المنصة؟</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            كل ما تحتاجه المدرسة دون تعقيد
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-500">
            صُممت لتقليل التشتت، وتسريع الأعمال اليومية، وإظهار المعلومات المهمة
            للمستخدم في الوقت المناسب.
          </p>
        </div>

        <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="flex gap-5">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#123B4A] text-[#D6C58D] shadow-sm">
                  <Icon className="h-6 w-6" />
                </div>

                <div>
                  <h3 className="text-xl font-black">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-8 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-black text-[#0B8E8B]">
                تجربة حسب الدور
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                لكل مستخدم واجهته المناسبة
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-500">
                لا نعرض للجميع كل شيء. تظهر الأدوات والبيانات والإجراءات بحسب
                الدور والصلاحية، لتبقى التجربة واضحة وسريعة.
              </p>
            </div>

            <div className="divide-y divide-slate-100 rounded-[28px] border border-slate-100 bg-[#FBFCFD] px-6 shadow-sm">
              {roles.map((role) => {
                const Icon = role.icon;

                return (
                  <article
                    key={role.title}
                    className="flex gap-5 py-7 first:pt-6 last:pb-6"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0DA9A6]/10 text-[#0B8E8B]">
                      <Icon className="h-6 w-6" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black">{role.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        {role.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-6 rounded-[32px] bg-[#123B4A] px-7 py-9 text-white sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#D6C58D]">
              الأنظمة التعليمية الرسمية
            </p>
            <h2 className="mt-2 text-2xl font-black">
              روابط سريعة دون بطاقات زائدة
            </h2>
          </div>

          <div className="flex flex-wrap gap-3">
            {externalSystems.map((system) => (
              <a
                key={system.href}
                href={system.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/14"
              >
                {system.title}
                <ExternalLink className="h-4 w-4 text-[#D6C58D]" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#D6C58D] text-3xl font-black text-[#123B4A]">
            ذ
          </span>

          <h2 className="mt-6 text-3xl font-black sm:text-4xl">
            ابدأ يومك المدرسي من مكان واحد
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-500">
            دخول موحد إلى الأدوات والبيانات التي تحتاجها المدرسة، بتجربة عربية
            واضحة ومتوافقة مع مختلف الأدوار.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#123B4A] px-7 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            تسجيل الدخول
            <ArrowLeft className="h-4 w-4 text-[#D6C58D]" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#F7F9FB]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-[#123B4A]">منصة المدرسة الذكية</p>
          <p>منصة تشغيل وإدارة مدرسية متكاملة</p>
        </div>
      </footer>
    </main>
  );
}

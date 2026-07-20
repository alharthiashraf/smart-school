"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
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

type FeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type RoleItem = FeatureItem;

type ExternalSystem = {
  title: string;
  href: string;
};

const features: FeatureItem[] = [
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

const roles: RoleItem[] = [
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

const externalSystems: ExternalSystem[] = [
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

const highlights = [
  "متعدد المدارس",
  "صلاحيات حسب الدور",
  "تقارير PDF وExcel",
];

const operations = [
  "إدارة الطلاب والمعلمين والفصول",
  "تسجيل الحضور ورصد الدرجات",
  "متابعة السلوك والمواظبة",
  "تقارير وتحليلات قابلة للتصدير",
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[var(--app-primary)] text-[var(--app-primary-foreground)]"
      >
        <div
          className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-overlay)] px-5 py-3 text-sm font-bold shadow-lg backdrop-blur"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="h-5 w-5 animate-spin text-[var(--app-accent)]"
            aria-hidden="true"
          />
          جاري تحميل منصة المدرسة الذكية...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)] transition-colors"
    >
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
            aria-label="العودة إلى الصفحة الرئيسية"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-accent)] text-xl font-black text-[var(--app-accent-foreground)] shadow-lg">
              ذ
            </span>

            <div>
              <p className="text-base font-black text-white">
                منصة المدرسة الذكية
              </p>
              <p className="text-xs font-medium text-white/70">
                تشغيل مدرسي أكثر وضوحًا
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white backdrop-blur transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            تسجيل الدخول
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="relative isolate bg-[var(--app-primary)] text-[var(--app-primary-foreground)]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_18%,color-mix(in_srgb,var(--app-accent)_22%,transparent),transparent_26%),radial-gradient(circle_at_15%_85%,color-mix(in_srgb,var(--app-primary-soft)_30%,transparent),transparent_30%)]" />

        <div className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-14 px-6 pb-20 pt-32 lg:grid-cols-[1.06fr_0.94fr]">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-[var(--app-accent)] backdrop-blur">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              منصة تعليمية بهوية سعودية
            </div>

            <h1 className="text-4xl font-black leading-[1.25] sm:text-5xl lg:text-6xl">
              مدرستك في منصة واحدة
              <span className="mt-2 block text-[var(--app-accent)]">
                أسرع، أوضح، وأكثر ذكاءً
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-9 text-white/80 sm:text-lg">
              منصة متكاملة تساعد المدرسة على إدارة الطلاب والمعلمين والحضور
              والدرجات والجداول والتقارير، مع تجربة مخصصة لكل مستخدم حسب دوره.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--app-accent)] px-7 py-3.5 text-sm font-black text-[var(--app-accent-foreground)] shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                الدخول إلى المنصة
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </Link>

              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-black text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                استكشف المميزات
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-white/80">
              {highlights.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 text-[var(--app-accent)]"
                    aria-hidden="true"
                  />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[42px] bg-white/5 blur-2xl" />

            <div className="relative rounded-[36px] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[30px] bg-[var(--app-card)] p-6 text-[var(--app-text)]">
                <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-5">
                  <div>
                    <p className="text-xs font-bold text-[var(--app-primary)]">
                      نظرة سريعة
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      مركز تشغيل المدرسة
                    </h2>
                  </div>

                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-xl font-black text-[var(--app-accent)]">
                    ذ
                  </span>
                </div>

                <div className="mt-6 space-y-3">
                  {operations.map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 rounded-2xl bg-[var(--app-card-soft)] px-4 py-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-primary-soft)] text-sm font-black text-[var(--app-primary)]">
                        {index + 1}
                      </span>

                      <p className="text-sm font-black">{item}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href="/login"
                  className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--app-primary)] px-5 py-4 text-sm font-black text-[var(--app-primary-foreground)] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
                >
                  ابدأ باستخدام المنصة
                  <ArrowLeft
                    className="h-4 w-4 text-[var(--app-accent)]"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black text-[var(--app-primary)]">
            لماذا المنصة؟
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            كل ما تحتاجه المدرسة دون تعقيد
          </h2>
          <p className="mt-4 text-base leading-8 text-[var(--app-text-muted)]">
            صُممت لتقليل التشتت، وتسريع الأعمال اليومية، وإظهار المعلومات المهمة
            للمستخدم في الوقت المناسب.
          </p>
        </div>

        <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className="flex gap-5">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary)] text-[var(--app-accent)] shadow-sm">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>

                <div>
                  <h3 className="text-xl font-black">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-8 text-[var(--app-text-muted)]">
                    {feature.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[var(--app-border)] bg-[var(--app-card)]">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-black text-[var(--app-primary)]">
                تجربة حسب الدور
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                لكل مستخدم واجهته المناسبة
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[var(--app-text-muted)]">
                لا نعرض للجميع كل شيء. تظهر الأدوات والبيانات والإجراءات بحسب
                الدور والصلاحية، لتبقى التجربة واضحة وسريعة.
              </p>
            </div>

            <div className="divide-y divide-[var(--app-border)] rounded-[28px] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-6 shadow-sm">
              {roles.map((role) => {
                const Icon = role.icon;

                return (
                  <article
                    key={role.title}
                    className="flex gap-5 py-7 first:pt-6 last:pb-6"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black">{role.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[var(--app-text-muted)]">
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
        <div className="flex flex-col gap-6 rounded-[32px] bg-[var(--app-primary)] px-7 py-9 text-[var(--app-primary-foreground)] shadow-lg sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[var(--app-accent)]">
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
                aria-label={`فتح ${system.title} في نافذة جديدة`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
              >
                {system.title}
                <ExternalLink
                  className="h-4 w-4 text-[var(--app-accent)]"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--app-card)]">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--app-accent)] text-3xl font-black text-[var(--app-accent-foreground)]">
            ذ
          </span>

          <h2 className="mt-6 text-3xl font-black sm:text-4xl">
            ابدأ يومك المدرسي من مكان واحد
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[var(--app-text-muted)]">
            دخول موحد إلى الأدوات والبيانات التي تحتاجها المدرسة، بتجربة عربية
            واضحة ومتوافقة مع مختلف الأدوار.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--app-primary)] px-7 py-4 text-sm font-black text-[var(--app-primary-foreground)] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]"
          >
            تسجيل الدخول
            <ArrowLeft
              className="h-4 w-4 text-[var(--app-accent)]"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--app-border)] bg-[var(--app-card-soft)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-7 text-sm text-[var(--app-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p className="font-bold text-[var(--app-text)]">
            منصة المدرسة الذكية
          </p>
          <p>منصة تشغيل وإدارة مدرسية متكاملة</p>
        </div>
      </footer>
    </main>
  );
}

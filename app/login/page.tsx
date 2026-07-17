"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  School,
  ShieldCheck,
} from "lucide-react";

import PrimaryButton from "@/components/ui/buttons/PrimaryButton";
import { supabase } from "@/lib/supabase";

const FEATURES = [
  "إدارة متعددة المدارس",
  "صلاحيات حسب الدور",
  "تقارير قابلة للتصدير",
] as const;

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage("بيانات الدخول غير صحيحة.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("تعذر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[var(--app-background)] text-[var(--app-text)]"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-44 -top-44 h-[520px] w-[520px] rounded-full bg-[color-mix(in_srgb,var(--app-primary)_10%,transparent)] blur-3xl" />
        <div className="absolute -bottom-56 -left-44 h-[560px] w-[560px] rounded-full bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-8 sm:px-8 lg:px-12">
        <section className="grid w-full overflow-hidden rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-card)_94%,transparent)] shadow-[var(--app-shadow-xl)] backdrop-blur lg:grid-cols-[0.88fr_1.12fr]">
          <aside className="relative hidden overflow-hidden bg-[var(--app-primary)] px-12 py-14 text-[var(--app-text-inverse)] lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--app-accent)_18%,transparent)] blur-3xl" />
              <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--app-card)_10%,transparent)] blur-3xl" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-accent)] text-[var(--app-accent-foreground)] shadow-[var(--app-shadow-md)]">
                  <School className="h-6 w-6" aria-hidden="true" />
                </span>

                <div>
                  <p className="text-lg font-black">منصة المدرسة الذكية</p>
                  <p className="mt-0.5 text-xs font-medium text-[color-mix(in_srgb,var(--app-text-inverse)_58%,transparent)]">
                    إدارة مدرسية موحدة
                  </p>
                </div>
              </div>

              <div className="mt-20 max-w-xl">
                <p className="text-sm font-black text-[var(--app-accent)]">
                  منصة واحدة
                </p>

                <h1 className="mt-4 text-4xl font-black leading-[1.45]">
                  أعمال المدرسة
                  <span className="block text-[var(--app-accent)]">
                    في مكان واحد
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-sm leading-8 text-[color-mix(in_srgb,var(--app-text-inverse)_68%,transparent)]">
                  الطلاب والمعلمون والحضور والدرجات والتقارير.
                </p>
              </div>
            </div>

            <div className="relative space-y-4">
              {FEATURES.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-[var(--app-accent)]"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-bold text-[color-mix(in_srgb,var(--app-text-inverse)_78%,transparent)]">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <div className="flex min-h-[680px] items-center px-6 py-10 sm:px-10 lg:px-16">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-10">
                <div className="mb-7 inline-flex h-14 w-14 items-center justify-center rounded-[var(--app-radius-lg)] bg-[var(--app-primary)] text-[var(--app-accent)] shadow-[var(--app-shadow-md)] lg:hidden">
                  <School className="h-7 w-7" aria-hidden="true" />
                </div>

                <p className="text-sm font-black text-[var(--app-primary)]">
                  مرحبًا
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--app-text)] sm:text-4xl">
                  تسجيل الدخول
                </h2>

                <p className="mt-4 text-sm leading-7 text-[var(--app-text-muted)]">
                  أدخل بيانات حسابك.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <Field
                  id="email"
                  label="البريد الإلكتروني"
                  icon={<Mail className="h-5 w-5" aria-hidden="true" />}
                >
                  <input
                    id="email"
                    type="email"
                    required
                    dir="ltr"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@example.com"
                    className="h-full w-full bg-transparent text-left text-sm font-bold text-[var(--app-text)] outline-none placeholder:font-medium placeholder:text-[var(--app-text-subtle)]"
                  />
                </Field>

                <Field
                  id="password"
                  label="كلمة المرور"
                  icon={<LockKeyhole className="h-5 w-5" aria-hidden="true" />}
                  action={
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--app-radius-md)] text-[var(--app-text-subtle)] transition hover:bg-[var(--app-card)] hover:text-[var(--app-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
                      aria-label={
                        showPassword
                          ? "إخفاء كلمة المرور"
                          : "إظهار كلمة المرور"
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  }
                >
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    dir="ltr"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-full w-full bg-transparent text-left text-sm font-bold text-[var(--app-text)] outline-none placeholder:font-medium placeholder:text-[var(--app-text-subtle)]"
                  />
                </Field>

                {message ? (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-[var(--app-radius-lg)] border border-[color-mix(in_srgb,var(--app-danger)_22%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-danger)_9%,transparent)] px-4 py-3.5 text-sm font-bold leading-6 text-[var(--app-danger)]"
                  >
                    {message}
                  </div>
                ) : null}

                <PrimaryButton
                  type="submit"
                  loading={loading}
                  size="lg"
                  className="mt-2 w-full"
                >
                  تسجيل الدخول
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </PrimaryButton>
              </form>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-[var(--app-text-subtle)]">
                <ShieldCheck
                  className="h-4 w-4 text-[var(--app-primary)]"
                  aria-hidden="true"
                />
                دخول آمن
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  icon,
  action,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2.5 block text-sm font-black text-[var(--app-text)]"
      >
        {label}
      </label>

      <div className="group flex h-14 items-center gap-3 rounded-[var(--app-radius-lg)] border border-[var(--app-border)] bg-[var(--app-card-soft)] px-4 transition focus-within:border-[var(--app-primary)] focus-within:bg-[var(--app-card)] focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--app-primary)_12%,transparent)]">
        <span className="shrink-0 text-[var(--app-text-subtle)] transition group-focus-within:text-[var(--app-primary)]">
          {icon}
        </span>

        {children}
        {action}
      </div>
    </div>
  );
}

"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  School,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

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
        setMessage("بيانات الدخول غير صحيحة أو أن الحساب غير مفعّل.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("تعذر تسجيل الدخول حاليًا. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#F4F7F8] text-[#123B4A]"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-44 -top-44 h-[520px] w-[520px] rounded-full bg-[#0DA9A6]/10 blur-3xl" />
        <div className="absolute -bottom-56 -left-44 h-[560px] w-[560px] rounded-full bg-[#D6C58D]/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-5 py-8 sm:px-8 lg:px-12">
        <section className="grid w-full overflow-hidden rounded-[32px] border border-white/80 bg-white/90 shadow-[0_30px_100px_rgba(15,45,58,0.14)] backdrop-blur lg:grid-cols-[0.88fr_1.12fr]">
          <aside className="relative hidden overflow-hidden bg-[#123B4A] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#0DA9A6]/25 blur-3xl" />
              <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#D6C58D]/15 blur-3xl" />
            </div>

            <div className="relative">
              <div className="inline-flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D6C58D] text-[#123B4A] shadow-lg">
                  <School className="h-6 w-6" />
                </span>

                <div>
                  <p className="text-lg font-black">منصة المدرسة الذكية</p>
                  <p className="mt-0.5 text-xs font-medium text-white/55">
                    إدارة مدرسية أكثر وضوحًا
                  </p>
                </div>
              </div>

              <div className="mt-20 max-w-xl">
                <p className="text-sm font-black text-[#D6C58D]">
                  تجربة مدرسية موحدة
                </p>

                <h1 className="mt-4 text-4xl font-black leading-[1.45]">
                  كل أعمال المدرسة
                  <span className="block text-[#D6C58D]">في مكان واحد</span>
                </h1>

                <p className="mt-6 max-w-lg text-sm leading-8 text-white/65">
                  وصول منظم إلى الطلاب والمعلمين والحضور والدرجات والجداول
                  والتقارير، بحسب دور المستخدم وصلاحياته.
                </p>
              </div>
            </div>

            <div className="relative space-y-4">
              {[
                "إدارة متعددة المدارس",
                "صلاحيات دقيقة حسب الدور",
                "تقارير وتحليلات قابلة للتصدير",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#D6C58D]" />
                  <span className="text-sm font-bold text-white/75">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          <div className="flex min-h-[680px] items-center px-6 py-10 sm:px-10 lg:px-16">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-10">
                <div className="mb-7 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#123B4A] text-[#D6C58D] shadow-lg lg:hidden">
                  <School className="h-7 w-7" />
                </div>

                <p className="text-sm font-black text-[#0B8E8B]">
                  مرحبًا بعودتك
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight text-[#123B4A] sm:text-4xl">
                  تسجيل الدخول
                </h2>

                <p className="mt-4 text-sm leading-7 text-slate-500">
                  أدخل بيانات حسابك للوصول إلى مساحة العمل الخاصة بك.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2.5 block text-sm font-black text-[#123B4A]"
                  >
                    البريد الإلكتروني
                  </label>

                  <div className="group flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFB] px-4 transition focus-within:border-[#0DA9A6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0DA9A6]/10">
                    <Mail className="h-5 w-5 shrink-0 text-slate-400 transition group-focus-within:text-[#0DA9A6]" />

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
                      className="h-full w-full bg-transparent text-left text-sm font-bold text-[#123B4A] outline-none placeholder:font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2.5 block text-sm font-black text-[#123B4A]"
                  >
                    كلمة المرور
                  </label>

                  <div className="group flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFB] px-4 transition focus-within:border-[#0DA9A6] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0DA9A6]/10">
                    <LockKeyhole className="h-5 w-5 shrink-0 text-slate-400 transition group-focus-within:text-[#0DA9A6]" />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      dir="ltr"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      className="h-full w-full bg-transparent text-left text-sm font-bold text-[#123B4A] outline-none placeholder:font-medium placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-[#123B4A] focus:outline-none focus:ring-4 focus:ring-[#0DA9A6]/10"
                      aria-label={
                        showPassword
                          ? "إخفاء كلمة المرور"
                          : "إظهار كلمة المرور"
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {message && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold leading-6 text-red-700"
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#123B4A] px-5 text-sm font-black text-white shadow-[0_12px_30px_rgba(18,59,74,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0E303D] hover:shadow-[0_16px_34px_rgba(18,59,74,0.28)] focus:outline-none focus:ring-4 focus:ring-[#0DA9A6]/20 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      تسجيل الدخول
                      <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                <ShieldCheck className="h-4 w-4 text-[#0B8E8B]" />
                دخول آمن وصلاحيات مخصصة حسب الحساب
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
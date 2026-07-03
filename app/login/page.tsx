"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

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

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage("بيانات الدخول غير صحيحة أو أن الحساب غير مفعل.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
  };

  return (
    <main
      dir="rtl"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F6F8FB] p-4 text-[#15445A]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(13,169,166,0.18),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(193,180,137,0.22),_transparent_35%)]" />

      <section className="relative grid w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/70 bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-gradient-to-br from-[#15445A] via-[#15445A] to-[#0DA9A6] p-10 text-white lg:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-[#D8CC9A]">
                <ShieldCheck size={18} />
                منصة المدرسة الذكية 2.0
              </div>

              <h1 className="max-w-xl text-5xl font-black leading-tight">
                إدارة مدرسية ذكية بهوية احترافية موحدة
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-8 text-white/80">
                سجّل الدخول للوصول إلى لوحة التحكم، الحضور، الدرجات، التقارير،
                الإعدادات، وبوابات المدرسة حسب صلاحياتك.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                "إدارة متعددة المدارس",
                "صلاحيات حسب الدور",
                "تقارير PDF وExcel",
                "تحليلات تنفيذية مباشرة",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#C1B489] text-[#15445A]">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#C1B489] text-3xl font-black text-[#15445A] shadow-sm">
                ذ
              </div>

              <h2 className="text-3xl font-black text-[#15445A]">
                تسجيل الدخول
              </h2>

              <p className="mt-2 text-sm leading-7 text-slate-500">
                أدخل بيانات حسابك للوصول إلى منصة المدرسة الذكية.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#15445A]">
                  البريد الإلكتروني
                </span>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-[#0DA9A6] focus-within:bg-white">
                  <Mail className="h-5 w-5 text-[#0DA9A6]" />
                  <input
                    type="email"
                    required
                    dir="ltr"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent text-left text-sm font-bold text-[#15445A] outline-none placeholder:text-slate-400"
                    placeholder="admin@example.com"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#15445A]">
                  كلمة المرور
                </span>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-[#0DA9A6] focus-within:bg-white">
                  <LockKeyhole className="h-5 w-5 text-[#0DA9A6]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    dir="ltr"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent text-left text-sm font-bold text-[#15445A] outline-none placeholder:text-slate-400"
                    placeholder="••••••••"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-[#15445A]"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {message && (
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#15445A] px-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#0DA9A6] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-[#C1B489]/30 bg-[#C1B489]/10 p-4 text-center text-xs font-bold leading-6 text-[#15445A]">
              سيتم تحويلك تلقائيًا إلى لوحة التحكم حسب صلاحيات حسابك بعد نجاح تسجيل الدخول.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

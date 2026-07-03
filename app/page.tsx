"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        جاري التحميل...
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white"
    >
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#D4AF37] text-4xl font-bold text-slate-950 shadow-2xl">
            ذ
          </div>

          <h1 className="text-5xl font-extrabold">
            منصة المدرسة الذكية
          </h1>

          <p className="mt-4 text-xl text-slate-300">
            نظام موحد يخدم منسوبي المدارس السعودية
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <Link
            href="/login"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:scale-105 hover:border-[#D4AF37]"
          >
            <h2 className="mb-3 text-2xl font-bold">
              تسجيل الدخول
            </h2>

            <p className="text-slate-300">
              دخول المدير والمعلمين والإداريين
            </p>
          </Link>

          <a
            href="https://schools.madrasati.sa"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:scale-105 hover:border-[#D4AF37]"
          >
            <h2 className="mb-3 text-2xl font-bold">
              منصة مدرستي
            </h2>

            <p className="text-slate-300">
              الدخول إلى منصة مدرستي
            </p>
          </a>

          <a
            href="https://noor.moe.gov.sa"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:scale-105 hover:border-[#D4AF37]"
          >
            <h2 className="mb-3 text-2xl font-bold">
              نظام نور
            </h2>

            <p className="text-slate-300">
              الدخول إلى نظام نور
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}
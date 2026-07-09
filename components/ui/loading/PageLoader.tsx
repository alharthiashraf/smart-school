import { Loader2 } from "lucide-react";

type PageLoaderProps = {
  text?: string;
};

export default function PageLoader({
  text = "جاري التحميل...",
}: PageLoaderProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />

      <p className="mt-4 text-sm font-black text-slate-600">
        {text}
      </p>
    </div>
  );
}
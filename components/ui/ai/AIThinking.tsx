import { BrainCircuit } from "lucide-react";

type AIThinkingProps = {
  text?: string;
};

export default function AIThinking({
  text = "يقوم الذكاء الاصطناعي بتحليل البيانات...",
}: AIThinkingProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white text-center shadow-sm">
      <BrainCircuit className="h-10 w-10 animate-pulse text-emerald-600" />

      <p className="mt-5 text-sm font-black text-slate-600">
        {text}
      </p>
    </div>
  );
}
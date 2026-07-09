import type { ReactNode } from "react";
import ExecutiveCard from "@/components/ui/cards/ExecutiveCard";
import KpiCard from "@/components/ui/cards/KpiCard";

type ExecutiveStatItem = {
  title: string;
  value: string | number;
  subtitle?: string;
  caption?: string;
  icon?: ReactNode;
  tone?: "primary" | "teal" | "green" | "blue" | "gold" | "red";
  large?: boolean;
  progress?: number;
  loading?: boolean;
};

type ExecutiveStatsProps = {
  items: ExecutiveStatItem[];
};

export default function ExecutiveStats({ items }: ExecutiveStatsProps) {
  const largeItems = items.filter((item) => item.large).slice(0, 2);
  const smallItems = items.filter((item) => !item.large);

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {largeItems.map((item) => (
          <ExecutiveCard
            key={item.title}
            title={item.title}
            value={item.value}
            subtitle={item.subtitle}
            icon={item.icon}
            tone={item.tone || "teal"}
            progress={item.progress}
            loading={item.loading}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
        {smallItems.map((item) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={item.value}
            caption={item.caption || item.subtitle}
            icon={item.icon}
            tone={item.tone || "teal"}
            loading={item.loading}
          />
        ))}
      </div>
    </section>
  );
}

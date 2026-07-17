"use client";

import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type PieChartItem = {
  name: string;
  value: number;
};

export type PieChartProps = {
  data: PieChartItem[];
  height?: number;
  className?: string;
};

const COLORS = [
  "var(--app-primary)",
  "var(--app-accent)",
  "var(--app-blue)",
  "var(--app-green)",
  "var(--app-destructive)",
];

export default function PieChart({
  data,
  height = 280,
  className,
}: PieChartProps) {
  return (
    <div
      className={[
        "w-full rounded-[var(--app-radius-xl)] border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
            stroke="var(--app-card)"
            strokeWidth={3}
          >
            {data.map((item, index) => (
              <Cell
                key={`${item.name}-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              background: "var(--app-card)",
              border: "1px solid var(--app-border)",
              borderRadius: "16px",
              color: "var(--app-text)",
              boxShadow: "var(--app-shadow-soft)",
            }}
            labelStyle={{
              color: "var(--app-text)",
              fontWeight: 800,
            }}
            itemStyle={{
              color: "var(--app-text)",
              fontWeight: 700,
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
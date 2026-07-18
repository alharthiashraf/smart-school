"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartData = Record<string, string | number>;

export type BarChartProps = {
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  height?: number;
  className?: string;
};

export default function BarChart({
  data,
  xKey = "name",
  yKey = "value",
  height = 280,
  className,
}: BarChartProps) {
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
        <RechartsBarChart
          data={data}
          margin={{
            top: 8,
            right: 8,
            left: 8,
            bottom: 0,
          }}
        >
          <CartesianGrid
            stroke="var(--app-border)"
            strokeDasharray="3 3"
            vertical={false}
          />

          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "var(--app-text-muted)",
              fontSize: 12,
              fontWeight: 700,
            }}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "var(--app-text-muted)",
              fontSize: 12,
              fontWeight: 700,
            }}
          />

          <Tooltip
            cursor={{
              fill: "var(--app-card-soft)",
            }}
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
              color: "var(--app-primary)",
              fontWeight: 700,
            }}
          />

          <Bar
            dataKey={yKey}
            radius={[12, 12, 0, 0]}
            fill="var(--app-primary)"
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

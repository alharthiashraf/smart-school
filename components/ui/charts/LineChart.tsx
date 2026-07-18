"use client";

import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartData = Record<string, string | number>;

export type LineChartProps = {
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  height?: number;
  className?: string;
};

export default function LineChart({
  data,
  xKey = "name",
  yKey = "value",
  height = 280,
  className,
}: LineChartProps) {
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
        <RechartsLineChart
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
              stroke: "var(--app-border)",
              strokeDasharray: "4 4",
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

          <Line
            type="monotone"
            dataKey={yKey}
            stroke="var(--app-primary)"
            strokeWidth={3}
            dot={{
              r: 4,
              fill: "var(--app-primary)",
              stroke: "var(--app-card)",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "var(--app-accent)",
              stroke: "var(--app-card)",
              strokeWidth: 2,
            }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

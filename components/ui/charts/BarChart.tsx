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

type BarChartProps = {
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  height?: number;
};

export default function BarChart({
  data,
  xKey = "name",
  yKey = "value",
  height = 280,
}: BarChartProps) {
  return (
    <div className="w-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey={yKey} radius={[12, 12, 0, 0]} fill="#07A869" />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
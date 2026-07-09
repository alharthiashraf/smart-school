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

type LineChartProps = {
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  height?: number;
};

export default function LineChart({
  data,
  xKey = "name",
  yKey = "value",
  height = 280,
}: LineChartProps) {
  return (
    <div className="w-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke="#07A869"
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
"use client";

import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type PieChartItem = {
  name: string;
  value: number;
};

type PieChartProps = {
  data: PieChartItem[];
  height?: number;
};

const COLORS = ["#07A869", "#15445A", "#C1B489", "#3D7EB9", "#EF4444"];

export default function PieChart({
  data,
  height = 280,
}: PieChartProps) {
  return (
    <div className="w-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={4}
          >
            {data.map((item, index) => (
              <Cell
                key={item.name}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
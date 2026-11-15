"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PerformancePoint {
  fy: string;
  utilisation: number | null;
  yieldPct: number | null;
  fails: boolean | null;
}

export function PerformanceChart({
  data,
  utilThreshold,
  yieldThreshold,
}: {
  data: PerformancePoint[];
  utilThreshold: number;
  yieldThreshold: number;
}) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="fy"
            tick={{ fill: "var(--chart-axis)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
          />
          <YAxis
            yAxisId="left"
            domain={[0, 100]}
            tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, Math.max(3, yieldThreshold * 2)]}
            tick={{ fill: "var(--chart-axis)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--ink)",
              boxShadow: "var(--shadow-md)",
            }}
            formatter={(value: unknown, name: unknown) => [
              `${Number(value ?? 0).toFixed(name === "Monthly yield" ? 2 : 1)}%`,
              String(name ?? ""),
            ]}
          />
          <ReferenceLine
            yAxisId="left"
            y={utilThreshold}
            stroke="var(--nrg)"
            strokeDasharray="5 4"
            label={{
              value: `Utilisation ${utilThreshold}%`,
              position: "insideTopLeft",
              fill: "var(--nrg)",
              fontSize: 9.5,
            }}
          />
          <ReferenceLine
            yAxisId="right"
            y={yieldThreshold}
            stroke="var(--old)"
            strokeDasharray="5 4"
            label={{
              value: `Yield ${yieldThreshold}%`,
              position: "insideTopRight",
              fill: "var(--old)",
              fontSize: 9.5,
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="utilisation"
            name="Utilisation"
            fill="var(--brand)"
            fillOpacity={0.72}
            radius={[4, 4, 0, 0]}
            maxBarSize={46}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="yieldPct"
            name="Monthly yield"
            stroke="var(--old)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--old)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

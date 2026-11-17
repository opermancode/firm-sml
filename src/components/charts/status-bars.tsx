"use client";

import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const TYPE_COLOR: Record<string, string> = {
  Active: "#1d4ed8",
  Approval: "#d97706",
  "On Hold": "#dc2626",
  Locked: "#16a34a",
  Closed: "#8792a6",
};

export function StatusBars({
  data,
}: {
  data: { code: string; name: string; count: number; type: string }[];
}) {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#8792a6" }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="code"
            width={34}
            tick={{ fontSize: 10, fill: "#55617a", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(29,78,216,0.06)" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: "var(--panel)",
              color: "var(--ink)",
              fontSize: 11,
            }}
            formatter={(value, _name, entry) => [
              `${Number(value)} crane${Number(value) === 1 ? "" : "s"}`,
              String(entry?.payload?.name ?? "Status"),
            ]}
          />
          <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={12}>
            {data.map((entry) => (
              <Cell key={entry.code} fill={TYPE_COLOR[entry.type] ?? "#8792a6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap gap-3 text-[9.5px] text-muted">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {type}
          </span>
        ))}
      </div>
    </div>
  );
}

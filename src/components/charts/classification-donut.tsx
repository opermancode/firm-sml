"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const CLASS_META: Record<string, { label: string; color: string }> = {
  NON_DEPLOYABLE: { label: "Non-Deployable", color: "var(--nd)" },
  NRG: { label: "NRG", color: "var(--nrg)" },
  NRG_REVIEW: { label: "NRG Review", color: "var(--nrg-review)" },
  OLD_FLEET: { label: "Old Fleet", color: "var(--old)" },
  HEALTHY: { label: "Healthy", color: "var(--healthy)" },
};

const ORDER = ["NON_DEPLOYABLE", "NRG", "NRG_REVIEW", "OLD_FLEET", "HEALTHY"];

export function ClassificationDonut({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const data = ORDER.map((key) => ({
    key,
    name: CLASS_META[key].label,
    value: counts[key] ?? 0,
    color: CLASS_META[key].color,
  })).filter((entry) => entry.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[12px] text-muted">
        No classified assets yet.
      </div>
    );
  }

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[200px_1fr]">
      <div className="relative h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={82}
              paddingAngle={2}
              stroke="var(--panel)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                fontSize: 12,
                color: "var(--ink)",
                boxShadow: "var(--shadow-md)",
              }}
              itemStyle={{ color: "var(--ink)" }}
              formatter={(value: unknown, name: unknown) => {
                const count = Number(value ?? 0);
                return [
                  `${count} (${total ? Math.round((count / total) * 100) : 0}%)`,
                  String(name ?? ""),
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[24px] font-semibold leading-none text-ink tnum">
            {total}
          </span>
          <span className="mt-1 text-[9.5px] uppercase tracking-[0.1em] text-faint">Assets</span>
        </div>
      </div>

      <ul className="space-y-2">
        {ORDER.map((key) => {
          const value = counts[key] ?? 0;
          const pct = total ? Math.round((value / total) * 100) : 0;
          return (
            <li key={key} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: CLASS_META[key].color }}
              />
              <span className="flex-1 truncate text-[11.5px] text-muted">
                {CLASS_META[key].label}
              </span>
              <span className="tnum text-[11.5px] font-semibold text-ink">{value}</span>
              <span className="tnum w-9 text-right text-[10.5px] text-faint">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

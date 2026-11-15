"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2 } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { InrAmount } from "@/components/inr-amount";

export interface ModelTableRow {
  model: string;
  threshold: number;
  total: number;
  oldFleet: number;
  nonDeployable: number;
  nrg: number;
  capex: number;
}

export function ModelTable({
  rows,
  csvFilename,
}: {
  rows: ModelTableRow[];
  csvFilename: string;
}) {
  const columns: ColumnDef<ModelTableRow, unknown>[] = [
    {
      accessorKey: "model",
      header: "Model",
      cell: ({ row }) => (
        <span className="font-medium text-ink">{row.original.model}</span>
      ),
    },
    {
      accessorKey: "threshold",
      header: "Threshold",
      cell: ({ row }) => (
        <span className="mono text-[11.5px] text-muted">{row.original.threshold} yrs</span>
      ),
    },
    {
      accessorKey: "total",
      header: "Cranes",
      cell: ({ row }) => <span className="mono">{row.original.total}</span>,
    },
    {
      accessorKey: "oldFleet",
      header: "Old Fleet",
      cell: ({ row }) =>
        row.original.oldFleet > 0 ? (
          <span className="badge badge-old">{row.original.oldFleet}</span>
        ) : (
          <span className="text-faint">0</span>
        ),
    },
    {
      accessorKey: "nonDeployable",
      header: "Non-Deployable",
      cell: ({ row }) =>
        row.original.nonDeployable > 0 ? (
          <span className="badge badge-nd">{row.original.nonDeployable}</span>
        ) : (
          <span className="text-faint">0</span>
        ),
    },
    {
      accessorKey: "nrg",
      header: "NRG",
      cell: ({ row }) =>
        row.original.nrg > 0 ? (
          <span className="badge badge-nrg">{row.original.nrg}</span>
        ) : (
          <span className="text-faint">0</span>
        ),
    },
    {
      accessorKey: "capex",
      header: "Capex",
      cell: ({ row }) => <InrAmount value={row.original.capex} compact />,
    },
    {
      id: "inFleet",
      header: "In fleet",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.total > 0 ? (
          <span className="badge badge-healthy">
            <CheckCircle2 size={10} /> {row.original.total}
          </span>
        ) : (
          <span className="text-[11px] text-faint">Not in fleet</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Search model name…"
      csvFilename={csvFilename}
      emptyMessage="No models match the search."
      pageSize={15}
    />
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";

function headerLabel(header: unknown, fallback: string): string {
  if (typeof header === "string") return header;
  if (typeof header === "number") return String(header);
  return fallback;
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = "Search…",
  initialSorting = [],
  pageSize = 25,
  csvFilename,
  emptyMessage = "No records match the current filters.",
  toolbar,
  getRowHref,
  rowClassName,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  initialSorting?: SortingState;
  pageSize?: number;
  csvFilename?: string;
  emptyMessage?: string;
  toolbar?: React.ReactNode;
  getRowHref?: (row: T) => string;
  rowClassName?: (row: T) => string;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  const csv = useMemo(() => {
    if (!csvFilename) return null;
    return () => {
      const leafColumns = table.getVisibleLeafColumns();
      const head = leafColumns
        .map((column) => `"${headerLabel(column.columnDef.header, column.id).replace(/"/g, '""')}"`)
        .join(",");
      const body = table
        .getFilteredRowModel()
        .rows.map((row) =>
          row
            .getAllCells()
            .filter((cell) => leafColumns.some((column) => column.id === cell.column.id))
            .map((cell) => `"${String(cell.getValue() ?? "").replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");

      const blob = new Blob([`${head}\n${body}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = csvFilename;
      link.click();
      URL.revokeObjectURL(url);
    };
  }, [csvFilename, table]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-[320px]">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="input h-9 pl-9 text-[12.5px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {csv && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={csv}>
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="table-wrap scroll-thin">
        <table className="data">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th key={header.id} scope="col">
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 uppercase tracking-[0.07em] hover:text-ink"
                          aria-label={`Sort by ${headerLabel(header.column.columnDef.header, header.id)}`}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? (
                            <ArrowUp size={11} />
                          ) : sorted === "desc" ? (
                            <ArrowDown size={11} />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-[12.5px] text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const href = getRowHref?.(row.original);
                return (
                  <tr
                    key={row.id}
                    className={`${href ? "cursor-pointer" : ""} ${rowClassName?.(row.original) ?? ""}`}
                    onClick={
                      href
                        ? (event) => {
                            const target = event.target as HTMLElement;
                            if (target.closest("a,button,input,select")) return;
                            window.location.href = href;
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 border-t border-line px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11px] text-faint">
          {filteredCount} record{filteredCount === 1 ? "" : "s"}
          {filteredCount !== data.length ? ` · filtered from ${data.length}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm btn-icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

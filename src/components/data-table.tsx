"use client";

import { useMemo, useState } from "react";

export type DataTableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
};

export type DataTableRow = {
  id: string;
  /** Valores planos (string/number) usados só pra ordenação — não pode conter JSX/funções. */
  sortValues?: Record<string, string | number>;
  /** Células já renderizadas pelo server component (JSX puro atravessa a fronteira server/client). */
  cells: Record<string, React.ReactNode>;
};

export function DataTable({ columns, rows }: { columns: DataTableColumn[]; rows: DataTableRow[] }) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const withValue = rows.map((row) => ({ row, value: row.sortValues?.[sort.key] ?? "" }));
    withValue.sort((a, b) => {
      if (a.value < b.value) return sort.dir === "asc" ? -1 : 1;
      if (a.value > b.value) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return withValue.map((w) => w.row);
  }, [rows, sort]);

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div
        className="grid gap-3 border-b border-border px-5 py-3 text-[10.5px] font-extrabold uppercase text-text-3"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((col) => (
          <button
            key={col.key}
            type="button"
            disabled={!col.sortable}
            onClick={() => col.sortable && toggleSort(col.key)}
            className={`flex items-center gap-1 text-left uppercase ${
              col.align === "right" ? "justify-end text-right" : ""
            } ${col.sortable ? "cursor-pointer hover:text-text-2" : "cursor-default"}`}
          >
            {col.label}
            {col.sortable && (
              <span className="text-[9px] text-text-3/70">
                {sort?.key === col.key ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
              </span>
            )}
          </button>
        ))}
      </div>
      {sorted.map((row) => (
        <div
          key={row.id}
          className="grid items-center gap-3 border-b border-border px-5 py-3 text-[12px] last:border-none"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          {columns.map((col) => (
            <div key={col.key} className={col.align === "right" ? "text-right" : ""}>
              {row.cells[col.key]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

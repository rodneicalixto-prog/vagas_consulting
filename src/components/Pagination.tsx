"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function Pagination({ currentPage, totalPages, baseUrl }: PaginationProps) {
  const searchParams = useSearchParams();

  const createUrl = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `${baseUrl}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {currentPage > 1 && (
        <Link
          href={createUrl(1)}
          className="rounded px-2 py-1 text-sm hover:bg-surface"
        >
          ← Primeira
        </Link>
      )}

      {currentPage > 1 && (
        <Link
          href={createUrl(currentPage - 1)}
          className="rounded px-2 py-1 text-sm hover:bg-surface"
        >
          ← Anterior
        </Link>
      )}

      <div className="flex gap-1">
        {start > 1 && <span className="px-2 py-1 text-sm">...</span>}

        {Array.from({ length: end - start + 1 }, (_, i) => {
          const page = start + i;
          return (
            <Link
              key={page}
              href={createUrl(page)}
              className={`rounded px-2 py-1 text-sm ${
                page === currentPage
                  ? "bg-navy text-white font-bold"
                  : "hover:bg-surface"
              }`}
            >
              {page}
            </Link>
          );
        })}

        {end < totalPages && <span className="px-2 py-1 text-sm">...</span>}
      </div>

      {currentPage < totalPages && (
        <Link
          href={createUrl(currentPage + 1)}
          className="rounded px-2 py-1 text-sm hover:bg-surface"
        >
          Próxima →
        </Link>
      )}

      {currentPage < totalPages && (
        <Link
          href={createUrl(totalPages)}
          className="rounded px-2 py-1 text-sm hover:bg-surface"
        >
          Última →
        </Link>
      )}
    </div>
  );
}

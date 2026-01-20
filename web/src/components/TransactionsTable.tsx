"use client";

import { useMemo, useRef, useState } from "react";
import { AnalysisResponse, Transaction } from "@/types/analysis";
import { useVirtualizer } from "@tanstack/react-virtual";

export default function TransactionsTable({ data }: { data: AnalysisResponse }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const set = new Set(data.transactions.map((t) => t.category));
    return ["All", ...Array.from(set).sort()];
  }, [data.transactions]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return data.transactions
      .filter((t) => (category === "All" ? true : t.category === category))
      .filter((t) => {
        if (!needle) return true;
        return (
          t.description.toLowerCase().includes(needle) ||
          t.merchant.toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.transactions, q, category]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Transactions</div>
          <div className="text-xs text-zinc-400">
            Search + filter • {rows.length.toLocaleString()} rows
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search merchant..."
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950/40 px-3 py-2 text-sm outline-none sm:w-56"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-950/40 px-3 py-2 text-sm outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <VirtualTable rows={rows} />
    </div>
  );
}

function VirtualTable({ rows }: { rows: Transaction[] }) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 46,
    overscan: 12
  });

  const items = rowVirtualizer.getVirtualItems();

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <div className="grid grid-cols-12 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
        <div className="col-span-2">Date</div>
        <div className="col-span-6">Description</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2 text-right">Amount</div>
      </div>

      <div className="h-[420px] overflow-auto" ref={parentRef}>
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            position: "relative"
          }}
        >
          {items.map((v) => {
            const t = rows[v.index]!;
            return (
              <div
                key={t.id}
                className="absolute left-0 right-0 grid grid-cols-12 items-center border-b border-zinc-800 px-3 text-sm"
                style={{ transform: `translateY(${v.start}px)`, height: v.size }}
              >
                <div className="col-span-2 text-xs text-zinc-400">{t.date}</div>
                <div className="col-span-6 truncate">{t.description}</div>
                <div className="col-span-2 text-xs text-zinc-400">{t.category}</div>
                <div className="col-span-2 text-right font-medium">
                  ₱{Math.abs(t.amount).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

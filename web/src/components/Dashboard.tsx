"use client";

import { useMemo, useState } from "react";
import { analyzeCsvFile, fetchDemo } from "@/lib/api";
import { AnalysisResponse } from "@/types/analysis";
import FileDropzone from "./FileDropzone";
import SummaryCards from "./SummaryCards";
import Charts from "./Charts";
import InsightsPanel from "./InsightsPanel";
import TransactionsTable from "./TransactionsTable";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    if (!data) return "Upload CSV to analyze, or use demo data.";
    return `${data.meta.rows.toLocaleString()} transactions • ${
      data.summary.dateFrom ?? "?"
    } → ${data.summary.dateTo ?? "?"}`;
  }, [data]);

  async function onDemo() {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetchDemo();
      setData(res);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function onFile(file: File) {
    setErr(null);
    setLoading(true);
    try {
      const res = await analyzeCsvFile(file);
      setData(res);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dashboard</h2>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>

          <button
            onClick={onDemo}
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-60"
            disabled={loading}
          >
            Try demo
          </button>
        </div>

        <div className="mt-4">
          <FileDropzone onFile={onFile} loading={loading} />
          {err && (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </p>
          )}
        </div>
      </div>

      {data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          <SummaryCards data={data} />
          <Charts data={data} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TransactionsTable data={data} />
            </div>
            <InsightsPanel data={data} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

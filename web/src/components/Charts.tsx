"use client";

import { AnalysisResponse } from "@/types/analysis";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar
} from "recharts";

export default function Charts({ data }: { data: AnalysisResponse }) {
  const topCats = data.byCategory.slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold">Daily Spend Trend</div>
          <div className="text-xs text-zinc-400">Total out per day</div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyOut}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Area dataKey="totalOut" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold">Categories</div>
          <div className="text-xs text-zinc-400">Top expense categories</div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topCats}>
              <XAxis dataKey="category" hide />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="totalOut" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

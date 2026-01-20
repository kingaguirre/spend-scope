import { AnalysisResponse } from "@/types/analysis";

function fmt(n: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP"
  }).format(n);
}

export default function SummaryCards({ data }: { data: AnalysisResponse }) {
  const s = data.summary;

  const cards = [
    { label: "Total Out", value: fmt(s.totalOut), hint: "Expenses" },
    { label: "Total In", value: fmt(s.totalIn), hint: "Income / inflow" },
    { label: "Net", value: fmt(s.net), hint: "In - Out" },
    { label: "Avg Daily Out", value: fmt(s.avgDailyOut), hint: "Daily burn" }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
        >
          <div className="text-xs text-zinc-400">{c.label}</div>
          <div className="mt-2 text-xl font-semibold">{c.value}</div>
          <div className="mt-1 text-xs text-zinc-500">{c.hint}</div>
        </div>
      ))}
    </div>
  );
}

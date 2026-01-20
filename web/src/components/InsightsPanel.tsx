import { AnalysisResponse } from "@/types/analysis";

export default function InsightsPanel({ data }: { data: AnalysisResponse }) {
  const biggest = data.summary.biggestOut;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold">Insights</div>
        <div className="text-xs text-zinc-400">Anomalies + recurring</div>
      </div>

      {biggest && (
        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-xs text-zinc-400">Biggest expense</div>
          <div className="mt-1 text-sm font-medium">{biggest.description}</div>
          <div className="mt-1 text-xs text-zinc-500">
            {biggest.date} • ₱{biggest.amount.toLocaleString()}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold text-zinc-300">
            Recurring Subscriptions
          </div>
          <div className="mt-2 space-y-2">
            {data.recurring.length === 0 ? (
              <p className="text-xs text-zinc-500">No recurring patterns found.</p>
            ) : (
              data.recurring.map((r) => (
                <div
                  key={r.merchant}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                >
                  <div className="text-sm font-medium">{r.merchant}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    ~{r.approxPeriodDays}d • {r.count}x • avg ₱
                    {r.averageAmount.toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-zinc-300">Anomalies</div>
          <div className="mt-2 space-y-2">
            {data.anomalies.length === 0 ? (
              <p className="text-xs text-zinc-500">No anomalies detected.</p>
            ) : (
              data.anomalies.slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
                >
                  <div className="text-sm font-medium">{a.merchant}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {a.date} • ₱{Math.abs(a.amount).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

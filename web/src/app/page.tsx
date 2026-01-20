import Dashboard from "@/components/Dashboard";

export default function Page() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Next.js + Express | CSV Insights
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">SpendScope</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Upload a bank/credit CSV and get instant categories, trends,
            anomalies, and recurring subscription detection.
          </p>
        </header>

        <Dashboard />
      </div>
    </main>
  );
}

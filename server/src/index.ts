import express from "express";
import cors from "cors";
import helmetImport from "helmet";
import compression from "compression";
import multer from "multer";
import { z } from "zod";

// =======================
// ✅ Analyze logic inline
// =======================
import { parse } from "csv-parse/sync";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { nanoid } from "nanoid";

dayjs.extend(customParseFormat);

type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  category: string;
  merchant: string;
};

type AnalysisResponse = {
  meta: {
    rows: number;
    currency: string;
    detected: {
      date?: string;
      description?: string;
      amount?: string;
      debit?: string;
      credit?: string;
    };
    interpretation: "signed" | "allPositiveSpend";
  };
  summary: {
    totalIn: number;
    totalOut: number;
    net: number;
    avgDailyOut: number;
    dateFrom?: string;
    dateTo?: string;
    biggestOut?: { amount: number; date: string; description: string };
  };
  byCategory: { category: string; totalOut: number; count: number }[];
  dailyOut: { date: string; totalOut: number }[];
  topMerchants: { merchant: string; totalOut: number; count: number }[];
  anomalies: Transaction[];
  recurring: {
    merchant: string;
    approxPeriodDays: number;
    count: number;
    averageAmount: number;
    lastDate: string;
  }[];
  transactions: Transaction[];
};

const DATE_FORMATS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY", "YYYY/MM/DD", "MMM D, YYYY"];

function toNumber(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeDate(raw: any): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  for (const fmt of DATE_FORMATS) {
    const d = dayjs(s, fmt, true);
    if (d.isValid()) return d.format("YYYY-MM-DD");
  }

  const fallback = dayjs(s);
  if (fallback.isValid()) return fallback.format("YYYY-MM-DD");
  return null;
}

function normKey(s: string) {
  return s.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
}

function detectColumns(headers: string[]) {
  const h = headers.map((x) => ({ raw: x, key: normKey(x) }));

  const pick = (candidates: string[]) =>
    h.find((x) => candidates.some((c) => x.key.includes(c)))?.raw;

  const date = pick(["date", "transactiondate", "posteddate"]);
  const description = pick(["description", "details", "merchant", "narration", "memo"]);
  const amount = pick(["amount", "amt", "value"]);
  const debit = pick(["debit", "withdrawal", "dr"]);
  const credit = pick(["credit", "deposit", "cr"]);

  return { date, description, amount, debit, credit };
}

function merchantFromDescription(desc: string) {
  const cleaned = desc
    .toUpperCase()
    .replace(/[0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ").filter(Boolean);
  return parts.slice(0, 3).join(" ");
}

function categorize(desc: string, amount: number): string {
  const d = desc.toLowerCase();

  if (amount > 0 && /salary|payroll|income|transfer in|cash in/.test(d)) return "Income";

  const rules: { cat: string; rx: RegExp }[] = [
    { cat: "Food", rx: /foodpanda|grabfood|restaurant|jollibee|mcdo|starbucks|coffee|milktea/ },
    { cat: "Transport", rx: /grab|uber|angkas|joyride|gas|petrol|shell|caltex|toll/ },
    { cat: "Bills", rx: /meralco|pldt|globe|converge|water|electric|internet|bill/ },
    { cat: "Shopping", rx: /shopee|lazada|amazon|mall|department store/ },
    { cat: "Groceries", rx: /supermarket|grocery|savemore|sm supermarket|waltermart/ },
    { cat: "Entertainment", rx: /netflix|spotify|steam|disney|youtube/ },
    { cat: "Health", rx: /pharmacy|hospital|clinic|drug/ }
  ];

  const match = rules.find((r) => r.rx.test(d));
  return match?.cat ?? "Other";
}

function groupSum<T extends string>(
  rows: Transaction[],
  keyer: (t: Transaction) => T,
  amountGetter: (t: Transaction) => number
) {
  const map = new Map<T, { total: number; count: number }>();
  for (const r of rows) {
    const k = keyer(r);
    const prev = map.get(k) ?? { total: 0, count: 0 };
    prev.total += amountGetter(r);
    prev.count += 1;
    map.set(k, prev);
  }
  return map;
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx] ?? 0;
}

function recurringCandidates(txns: Transaction[]) {
  const byMerchant = new Map<string, Transaction[]>();
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const list = byMerchant.get(t.merchant) ?? [];
    list.push(t);
    byMerchant.set(t.merchant, list);
  }

  const results: AnalysisResponse["recurring"] = [];

  for (const [merchant, list] of byMerchant.entries()) {
    if (list.length < 3) continue;

    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = sorted.map((t) => Math.abs(t.amount));
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;

    const similar = amounts.filter((a) => Math.abs(a - avg) <= avg * 0.15).length >= 3;
    if (!similar) continue;

    const diffs: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const a = dayjs(sorted[i - 1].date);
      const b = dayjs(sorted[i].date);
      diffs.push(b.diff(a, "day"));
    }

    const nearMonthly = diffs.filter((d) => d >= 26 && d <= 35).length >= 2;
    if (!nearMonthly) continue;

    const approx = Math.round(diffs.reduce((x, y) => x + y, 0) / diffs.length);
    results.push({
      merchant,
      approxPeriodDays: approx,
      count: sorted.length,
      averageAmount: Number(avg.toFixed(2)),
      lastDate: sorted[sorted.length - 1]!.date
    });
  }

  return results.sort((a, b) => b.count - a.count).slice(0, 8);
}

function analyzeCsvText(csvText: string): AnalysisResponse {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true
  }) as Record<string, any>[];

  const headers = records.length ? Object.keys(records[0]!) : [];
  const detected = detectColumns(headers);

  const txns: Transaction[] = [];

  for (const row of records) {
    const rawDate = detected.date ? row[detected.date] : row[headers[0] ?? ""];
    const rawDesc = detected.description ? row[detected.description] : row[headers[1] ?? ""];
    const date = normalizeDate(rawDate);
    const description = String(rawDesc ?? "").trim();

    if (!date || !description) continue;

    let amount: number | null = null;

    if (detected.amount) {
      amount = toNumber(row[detected.amount]);
    } else if (detected.debit || detected.credit) {
      const debit = detected.debit ? Math.abs(toNumber(row[detected.debit]) ?? 0) : 0;
      const credit = detected.credit ? Math.abs(toNumber(row[detected.credit]) ?? 0) : 0;
      amount = credit - debit;
    }

    if (amount === null) continue;

    const merchant = merchantFromDescription(description);
    const category = categorize(description, amount);

    txns.push({
      id: nanoid(10),
      date,
      description,
      amount,
      category,
      merchant
    });
  }

  const hasNegative = txns.some((t) => t.amount < 0);
  const interpretation: AnalysisResponse["meta"]["interpretation"] = hasNegative
    ? "signed"
    : "allPositiveSpend";

  const signedTxns = txns.map((t) => {
    if (interpretation === "allPositiveSpend") {
      return { ...t, amount: -Math.abs(t.amount) };
    }
    return t;
  });

  let totalIn = 0;
  let totalOut = 0;

  for (const t of signedTxns) {
    if (t.amount >= 0) totalIn += t.amount;
    else totalOut += Math.abs(t.amount);
  }

  const net = totalIn - totalOut;

  const dates = signedTxns.map((t) => t.date).sort();
  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];

  const dayCount =
    dateFrom && dateTo ? Math.max(1, dayjs(dateTo).diff(dayjs(dateFrom), "day") + 1) : 1;
  const avgDailyOut = totalOut / dayCount;

  const biggest = signedTxns
    .filter((t) => t.amount < 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

  const outTxns = signedTxns.filter((t) => t.amount < 0);
  const outAmounts = outTxns.map((t) => Math.abs(t.amount));
  const p95 = percentile(outAmounts, 0.95);

  const anomalies = outTxns
    .filter((t) => Math.abs(t.amount) >= p95 && Math.abs(t.amount) > 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10);

  const byCat = groupSum(outTxns, (t) => t.category, (t) => Math.abs(t.amount));
  const byCategory = [...byCat.entries()]
    .map(([category, v]) => ({
      category,
      totalOut: Number(v.total.toFixed(2)),
      count: v.count
    }))
    .sort((a, b) => b.totalOut - a.totalOut);

  const byDay = groupSum(outTxns, (t) => t.date, (t) => Math.abs(t.amount));
  const dailyOut = [...byDay.entries()]
    .map(([date, v]) => ({ date, totalOut: Number(v.total.toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byMerch = groupSum(outTxns, (t) => t.merchant, (t) => Math.abs(t.amount));
  const topMerchants = [...byMerch.entries()]
    .map(([merchant, v]) => ({
      merchant,
      totalOut: Number(v.total.toFixed(2)),
      count: v.count
    }))
    .sort((a, b) => b.totalOut - a.totalOut)
    .slice(0, 8);

  const recurring = recurringCandidates(signedTxns);

  return {
    meta: {
      rows: signedTxns.length,
      currency: "PHP",
      detected,
      interpretation
    },
    summary: {
      totalIn: Number(totalIn.toFixed(2)),
      totalOut: Number(totalOut.toFixed(2)),
      net: Number(net.toFixed(2)),
      avgDailyOut: Number(avgDailyOut.toFixed(2)),
      dateFrom,
      dateTo,
      biggestOut: biggest
        ? {
            amount: Number(Math.abs(biggest.amount).toFixed(2)),
            date: biggest.date,
            description: biggest.description
          }
        : undefined
    },
    byCategory,
    dailyOut,
    topMerchants,
    anomalies,
    recurring,
    transactions: signedTxns
  };
}

// =======================
// ✅ Express app
// =======================
const helmet = (helmetImport as any).default ?? helmetImport;

const app = express();

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:3000";

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "5mb" }));

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true
  })
);

const upload = multer({ storage: multer.memoryStorage() });

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "SpendScope API" });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "spendscope-api" });
});

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let csvText = "";

    if (req.file?.buffer) {
      csvText = req.file.buffer.toString("utf-8");
    } else if ((req.body as any)?.csv) {
      const schema = z.object({ csv: z.string().min(1) });
      csvText = schema.parse(req.body).csv;
    } else {
      return res.status(400).json({ error: "Missing CSV. Upload a file or send { csv: string }." });
    }

    const result: AnalysisResponse = analyzeCsvText(csvText);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: "Failed to analyze CSV",
      message: err?.message ?? "Unknown error"
    });
  }
});

app.get("/api/demo", (_req, res) => {
  try {
    const demoCsv = `date,description,amount
2026-01-01,STARBUCKS,-190
2026-01-01,GRAB RIDE,-240
2026-01-02,NETFLIX,-549
2026-01-03,SALARY,45000
2026-01-03,SHOPEE,-1299
2026-01-10,MERALCO BILL,-2150
2026-01-15,NETFLIX,-549
2026-01-18,FOODPANDA,-420
2026-01-18,FOODPANDA,-390
2026-01-20,SM SUPERMARKET,-2380`;

    res.json(analyzeCsvText(demoCsv));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed demo" });
  }
});

const isVercel = !!process.env.VERCEL;
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`SpendScope API running on http://localhost:${PORT}`);
  });
}

export default app;

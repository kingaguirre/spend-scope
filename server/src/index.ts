import express from "express";
import cors from "cors";
import helmetImport from "helmet";
import compression from "compression";
import multer from "multer";
import { z } from "zod";
import { analyzeCsvText, type AnalysisResponse } from "./analyze"; // ✅ FIX: no .js

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

// ✅ Add root route (helps testing)
app.get("/", (_req, res) => {
  res.status(200).json({ ok: true, service: "SpendScope API" });
});

const upload = multer({ storage: multer.memoryStorage() });

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
      return res
        .status(400)
        .json({ error: "Missing CSV. Upload a file or send { csv: string }." });
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

// Local dev: listen on a port.
// Vercel: export default app.
const isVercel = !!process.env.VERCEL;
if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`SpendScope API running on http://localhost:${PORT}`);
  });
}

export default app;

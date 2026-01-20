import { AnalysisResponse } from "@/types/analysis";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function fetchDemo(): Promise<AnalysisResponse> {
  const res = await fetch(`${BASE}/api/demo`);
  if (!res.ok) throw new Error("Failed to load demo");
  return res.json();
}

export async function analyzeCsvFile(file: File): Promise<AnalysisResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    body: form
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "Failed to analyze CSV");
  }

  return res.json();
}

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  merchant: string;
};

export type AnalysisResponse = {
  meta: {
    rows: number;
    currency: string;
    detected: Record<string, string | undefined>;
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

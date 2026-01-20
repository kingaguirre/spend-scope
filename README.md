# SpendScope (CSV Expense Insight Dashboard)

Upload a bank/credit card CSV and get instant charts, categories, anomalies, and recurring subscription detection.

## Requirements
- Node.js >= 20.9

## Local Dev

```bash
npm install
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:3000

## Environment Variables

Create these files locally:

### `web/.env.local`
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

### `server/.env`
```env
CLIENT_ORIGIN=http://localhost:3000
```

## CSV Format
Works best if your CSV has columns like:
- `date` (or `transaction date`)
- `description` (or `details` / `memo`)
- `amount` (signed is best: +income / -expense)

If your CSV has only positive amounts (spend-only), the app will automatically treat them as expenses.

## Deploy (Vercel)
Deploy as 2 Vercel projects (recommended):

1) **Backend**: `server` directory
   - Env: `CLIENT_ORIGIN=https://<your-web>.vercel.app`

2) **Frontend**: `web` directory
   - Env: `NEXT_PUBLIC_API_BASE_URL=https://<your-server>.vercel.app`


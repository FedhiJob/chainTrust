# ChainTrust MVP

ChainTrust is a pharmaceutical supply chain traceability platform that records batch custody transfers, verification, and public QR lookup.

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env` (example)

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/chainTrust
JWT_SECRET=your-long-random-secret
APP_BASE_URL=http://localhost:3000
```

3. Run migrations + seed demo data

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

4. Start dev server

```bash
npm run dev
```

Open http://localhost:3000

## Seeded Demo Accounts

- `admin@chaintrust.et` / `Password123!`
- `distributor@chaintrust.et` / `Password123!`
- `receiver@chaintrust.et` / `Password123!`

## User Roles

- **Admin**: oversight only, no transfers
- **Distributor**: create batches + transfer custody
- **Receiver**: verify receipts + confirm delivery

## End‑to‑End QA Checklist

1. Login as distributor.
2. Create a batch.
3. Transfer to a receiver.
4. Login as receiver.
5. Verify receipt.
6. Scan QR and confirm public verification page.
7. Confirm dashboards reflect updated statuses.

## Deployment (Vercel + Neon/Supabase)

1. Provision a Postgres database (Neon or Supabase).
2. Set environment variables in Vercel:

```env
DATABASE_URL=your-production-connection-string
JWT_SECRET=your-long-random-secret
APP_BASE_URL=https://yourdomain.com
```

3. Deploy the repo to Vercel.
4. Run migrations in production:

```bash
npx prisma migrate deploy
```

## QR Absolute URL

QR generation uses `APP_BASE_URL` (preferred), then falls back to request headers.
Set `APP_BASE_URL` in production so QR codes always resolve publicly.

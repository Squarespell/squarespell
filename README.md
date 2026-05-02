# Squarespell — AI Quiz Funnel SaaS for Squarespace

## Stack
- Frontend: Next.js 14 → Vercel
- Backend: Express → Railway
- Database: Supabase (PostgreSQL)
- Auth: Clerk
- AI: Claude API (claude-sonnet-4-20250514)
- Payments: Stripe

## Quick Start

### 1. Supabase — run SUPABASE_SCHEMA.sql in SQL Editor
### 2. Backend
```
cd backend
cp .env.example .env   ← fill in all values
npm install
npm run dev
```
### 3. Frontend
```
cd frontend
cp .env.example .env.local   ← fill in all values
npm install
npm run dev
```

## Deploy
- Backend → Railway (set root directory to /backend)
- Frontend → Vercel (set root directory to /frontend)

## Pricing
- Trial: 14-day free trial with Pro-level features
- Core: $12/mo ($9/mo annual) — 5 quizzes, 1,000 leads/mo, 1,000 emails/mo
- Pro: $19/mo ($16/mo annual) — Unlimited quizzes, 3,000 leads/mo, 3,000 emails/mo
- Business: $35/mo ($29/mo annual) — Unlimited everything, white-label, custom domain, team seats

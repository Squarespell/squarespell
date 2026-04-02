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
- Free: 1 quiz, 50 leads/month
- Starter: $19/mo — 5 quizzes, 500 leads
- Pro: $39/mo — 20 quizzes, 5,000 leads
- Agency: $79/mo — unlimited

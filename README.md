# Blindfold Chess

A web app for practicing blindfold chess — play games, solve puzzles, run drills, and study openings, all without seeing the board.

Built with React + TypeScript + Vite, styled with Tailwind CSS and shadcn/ui, backed by Supabase (auth, database) and Firebase (analytics).

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm (comes with Node)
- A [Supabase](https://supabase.com/) project (for auth and database)
- A [Firebase](https://firebase.google.com/) project (for analytics)
- A [MailerSend](https://www.mailersend.com/) account (for OTP emails during signup/password reset)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

At a minimum you need:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |
| `VITE_FIREBASE_API_KEY` | Firebase API key (analytics) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `SUPABASE_URL` | Supabase URL (for the OTP server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for the OTP server) |
| `MAILERSEND_API_TOKEN` | MailerSend API token |
| `MAILERSEND_FROM_EMAIL` | Sender email for OTP codes |
| `OTP_HASH_SECRET` | A long random secret for hashing OTP codes |

See `.env.example` for the full list with descriptions.

### 3. Start the dev server

```bash
npm run dev
```

This starts Vite on **http://localhost:8080**. The dev server proxies `/auth` requests to the OTP server at `localhost:8787`.

### 4. Start the OTP auth server (separate terminal)

The signup and password-reset flows require this server:

```bash
npm run auth:dev
```

This starts the OTP auth server on **http://localhost:8787**. It reads env vars from `.env.local`.

## Available scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server (port 8080) |
| `npm run auth:dev` | Start the OTP auth server (port 8787) |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Development build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |
| `npm run deploy:docs` | Build and copy output to `docs/` for GitHub Pages |

## Project structure

```
src/
  pages/          # Route-level page components
  components/     # Reusable UI and feature components
  components/ui/  # shadcn/ui primitives
  hooks/          # Custom React hooks
  lib/            # Utility functions and service clients
  data/           # Static data files
  theme/          # Theme configuration
server/           # OTP auth server (Node.js)
supabase/         # Supabase config and migrations
scripts/          # Data import and build scripts
public/           # Static assets
```

## Tech stack

- **Framework:** React 18 + TypeScript
- **Build tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI)
- **Database & auth:** Supabase
- **Analytics:** Firebase
- **Chess logic:** chess.js + Stockfish
- **3D board:** Three.js
- **State management:** TanStack React Query
- **Routing:** React Router v6

## Deployment

The site is deployed via GitHub Pages from the `docs/` folder. See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions, including:

- How the `docs/` deploy process works
- OTP auth server deployment and env vars
- Troubleshooting blank-page issues

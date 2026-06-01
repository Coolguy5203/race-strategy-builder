# Race Strategy Builder

An interactive lap-by-lap pit stop strategy planner for circuit racing. Generate and compare 1-, 2-, 3-, and 4-stop strategies, visualize stint breakdowns, and analyze projected lap times — all in a dark racing aesthetic.

**Live app:** https://race-strategy-builder.vercel.app

## Features

- **Strategy generation** — auto-calculates optimal pit windows and compound selections for 1–4 stop strategies
- **Tire compound editor** — customize name, baseline lap time, degradation rate, and max life for each compound
- **Stint visualization** — horizontal bar showing each stint as a proportional colored block with pit markers
- **Lap time chart** — Recharts line chart projecting lap times per lap across all active strategies
- **Undercut detector** — highlights laps where pitting 1 lap early gains time
- **Cloud save/load** — save and load strategies to/from Supabase (requires env vars)

## Tech Stack

- React + Vite
- Recharts (lap time chart)
- Tailwind CSS v3 (dark racing theme)
- Supabase (strategy persistence)
- Vercel (deployment)

## Setup

```bash
git clone https://github.com/Coolguy5203/race-strategy-builder.git
cd race-strategy-builder
npm install
cp .env.example .env
# Fill in your Supabase credentials in .env
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (e.g. `https://abc123.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase project anon/public key |

The app works fully without Supabase credentials — save/load will show a warning but all strategy calculations and visualizations work client-side.

## Supabase Schema

```sql
create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  race_laps int,
  pit_loss_seconds numeric,
  compounds jsonb,
  stints jsonb,
  total_time numeric
);
alter table strategies enable row level security;
create policy "Allow all" on strategies for all using (true);
```

## Development

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
```

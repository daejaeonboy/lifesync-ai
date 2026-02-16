# Server AI Automation Setup

This project now supports server-side AI diary generation so posts can be created even when the browser is closed.

## What was added

- DB queue: `ai_trigger_queue`
- Persona storage table: `ai_agents`
- Rotation state table: `ai_agent_rotations`
- DB triggers:
  - `calendar_events` insert -> `event_added`
  - `todos` insert -> `todo_added`
  - `todos` update `completed=false -> true` -> `todo_completed`
  - `journal_entries` insert -> `journal_added`
- Edge Function worker:
  - `supabase/functions/process-ai-triggers/index.ts`
  - claims queued jobs
  - generates community diary posts via Gemini
  - rotates personas by trigger chain key
  - enqueues 4-hour `scheduled_digest` jobs when recent activity exists

## Required setup

1. Run migration

```sql
-- In Supabase SQL Editor:
-- copy and run the file below
-- supabase/migrations/20260215_server_ai_triggers.sql
```

2. Set function secret (recommended)

```bash
supabase secrets set LS_AI_WORKER_SECRET=your_long_random_secret
```

3. Deploy function

```bash
supabase functions deploy process-ai-triggers --no-verify-jwt
```

4. Schedule execution (every minute)

Run in SQL editor after replacing placeholders:

```sql
select cron.schedule(
  'lifesync-ai-trigger-worker',
  '* * * * *',
  $$
  select
    net.http_post(
      url := 'https://<PROJECT-REF>.supabase.co/functions/v1/process-ai-triggers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-ls-ai-secret', '<LS_AI_WORKER_SECRET>'
      ),
      body := jsonb_build_object('maxJobs', 20, 'runDigestSweep', true)
    );
  $$
);
```

If you need to remove it later:

```sql
select cron.unschedule('lifesync-ai-trigger-worker');
```

## Runtime behavior

- Signed-in users now rely on server processing for AI community diary triggers.
- Local in-browser trigger path remains for non-auth/local-only usage.
- `profiles` now stores server automation settings:
  - `gemini_api_key`
  - `auto_ai_reactions`
  - `active_gemini_model`

## Quick health check

Call worker manually:

```bash
curl -X POST \
  "https://<PROJECT-REF>.supabase.co/functions/v1/process-ai-triggers" \
  -H "Content-Type: application/json" \
  -H "x-ls-ai-secret: <LS_AI_WORKER_SECRET>" \
  -d '{"maxJobs":10,"runDigestSweep":true}'
```

Then verify:

- `ai_trigger_queue` rows move to `completed`/`retry`/`failed`
- `community_posts` receives new AI diary rows

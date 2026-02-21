-- user_data: JSONB blob for settings, chat sessions, activity log, etc.
-- These are data types that change structure frequently and don't need
-- relational queries, so we store them as JSONB.

create table if not exists user_data (
  user_id uuid references auth.users on delete cascade primary key,
  settings jsonb default '{}',
  chat_sessions jsonb default '[]',
  activity_log jsonb default '[]',
  calendar_tags jsonb default '[]',
  updated_at timestamptz default now()
);

alter table user_data enable row level security;

create policy "Users can manage own user_data"
  on user_data for all
  using (auth.uid() = user_id);

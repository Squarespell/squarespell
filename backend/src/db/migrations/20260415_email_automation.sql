create table if not exists email_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  name text not null,
  subject text not null,
  from_name text not null,
  from_email text not null,
  html text not null,
  status text not null default 'draft',
  scheduled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references email_campaigns(id) on delete cascade,
  tenant_id text not null,
  lead_id uuid,
  to_email text not null,
  provider_message_id text,
  status text not null default 'queued',
  sent_at timestamptz,
  created_at timestamptz default now()
);
create table if not exists email_events (
  id bigserial primary key,
  send_id uuid references email_sends(id) on delete cascade,
  type text not null,
  meta jsonb,
  occurred_at timestamptz default now()
);
create table if not exists email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  email text not null,
  reason text,
  created_at timestamptz default now(),
  unique (tenant_id, email)
);
create table if not exists email_quota_usage (
  tenant_id text not null,
  period_start date not null,
  sends int not null default 0,
  primary key (tenant_id, period_start)
);
create index if not exists idx_sends_tenant on email_sends(tenant_id);
create index if not exists idx_events_send on email_events(send_id);

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references users(id) on delete restrict,
  action text not null check (action in ('price_approved', 'price_rejected', 'price_deleted', 'market_created', 'market_updated', 'market_deleted')),
  entity_type text not null check (entity_type in ('price', 'market')),
  entity_id uuid not null,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_idx on admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_entity_idx on admin_audit_logs (entity_type, entity_id);
create index if not exists admin_audit_logs_admin_idx on admin_audit_logs (admin_user_id, created_at desc);

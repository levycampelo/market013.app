alter table prices
  add column if not exists status text not null default 'aprovado'
  check (status in ('pendente', 'aprovado', 'rejeitado', 'expirado'));

create index if not exists prices_status_idx on prices (status, product_id, supermarket_id);
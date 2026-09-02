create extension if not exists postgis;

create table if not exists users (
  id uuid primary key,
  name text not null,
  email text unique not null,
  score_contribuicoes integer not null default 0,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key,
  name text not null,
  brand text,
  category text,
  barcode text,
  created_at timestamptz not null default now()
);

create table if not exists supermarkets (
  id uuid primary key,
  name text not null,
  address text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location geography(point, 4326) generated always as
    (st_setsrid(st_makepoint(longitude, latitude), 4326)::geography) stored,
  created_at timestamptz not null default now()
);

create table if not exists prices (
  id uuid primary key,
  product_id uuid not null references products(id) on delete cascade,
  supermarket_id uuid not null references supermarkets(id) on delete cascade,
  price numeric(10, 2) not null check (price >= 0),
  source text not null check (source in ('encarte', 'colaborativo')),
  user_id uuid references users(id) on delete set null,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key,
  price_id uuid not null references prices(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  reason text not null check (reason in ('preco_desatualizado', 'produto_incorreto', 'outro')),
  status text not null default 'pendente' check (status in ('pendente', 'resolvido')),
  created_at timestamptz not null default now(),
  unique (price_id, user_id, reason)
);

create index if not exists supermarkets_location_idx on supermarkets using gist (location);
create index if not exists prices_product_idx on prices (product_id);
create index if not exists prices_supermarket_idx on prices (supermarket_id);

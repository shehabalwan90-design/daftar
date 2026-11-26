create extension if not exists pgcrypto;

create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  owner_name text not null,
  phone text not null,
  type text not null,
  custom_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  phone text not null,
  credit_limit numeric(14,2) not null default 0,
  cycle text not null check (cycle in ('weekly', 'monthly')),
  opening_balance numeric(14,2) not null default 0,
  cycle_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  category text not null,
  price numeric(14,2) not null check (price >= 0),
  unit text not null,
  stock numeric(14,2),
  barcode text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type text not null check (type in ('debt', 'payment')),
  items jsonb not null default '[]'::jsonb,
  amount numeric(14,2) not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.archives (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  from_at timestamptz not null,
  to_at timestamptz not null,
  debt numeric(14,2) not null,
  paid numeric(14,2) not null,
  remaining numeric(14,2) not null,
  closed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_shop_id_idx on public.customers(shop_id);
create index if not exists products_shop_id_idx on public.products(shop_id);
create index if not exists transactions_shop_customer_idx on public.transactions(shop_id, customer_id);
create index if not exists archives_shop_customer_idx on public.archives(shop_id, customer_id);

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['shops', 'customers', 'products', 'transactions', 'archives'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;

create or replace function public.keep_latest_record()
returns trigger
language plpgsql
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

create trigger shops_last_write_wins before update on public.shops
  for each row execute function public.keep_latest_record();
create trigger customers_last_write_wins before update on public.customers
  for each row execute function public.keep_latest_record();
create trigger products_last_write_wins before update on public.products
  for each row execute function public.keep_latest_record();
create trigger transactions_last_write_wins before update on public.transactions
  for each row execute function public.keep_latest_record();
create trigger archives_last_write_wins before update on public.archives
  for each row execute function public.keep_latest_record();

alter table public.shops enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.archives enable row level security;

create policy "Owners manage their shops" on public.shops for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owners manage shop customers" on public.customers for all
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Owners manage shop products" on public.products for all
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Owners manage shop transactions" on public.transactions for all
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "Owners manage shop archives" on public.archives for all
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));

create or replace function public.customer_portal_data(p_shop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  authenticated_phone text;
  result jsonb;
begin
  authenticated_phone := regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g');
  if auth.uid() is null or authenticated_phone = '' then
    raise exception 'Phone verification required';
  end if;

  select jsonb_build_object(
    'customer', to_jsonb(c),
    'shopName', (select s.name from public.shops s where s.id = c.shop_id),
    'transactions', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at desc)
      from public.transactions t
      where t.customer_id = c.id and t.shop_id = c.shop_id
    ), '[]'::jsonb)
  )
  into result
  from public.customers c
  where c.shop_id = p_shop_id
    and regexp_replace(c.phone, '\D', '', 'g') = authenticated_phone
  limit 1;

  if result is null then
    raise exception 'Customer account not found';
  end if;
  return result;
end;
$$;

revoke all on function public.customer_portal_data(uuid) from public;
grant execute on function public.customer_portal_data(uuid) to authenticated;

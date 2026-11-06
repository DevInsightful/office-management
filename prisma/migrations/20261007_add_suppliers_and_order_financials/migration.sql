create table if not exists suppliers (
  id serial primary key,
  name text not null unique,
  contact_details text not null default '',
  created_at timestamptz not null default now()
);

alter table orders
  add column if not exists supplier_id integer references suppliers(id) on delete set null,
  add column if not exists vendor_name text not null default '',
  add column if not exists vendor_amount numeric(12, 2) not null default 0,
  add column if not exists profit numeric(12, 2) not null default 0;

create index if not exists orders_supplier_id_idx on orders (supplier_id);

create table if not exists staff_payments (
  id serial primary key,
  recipient_user_id integer not null references users(id) on delete cascade,
  paid_by_user_id integer not null references users(id) on delete cascade,
  recipient_name text not null,
  recipient_role text not null check (recipient_role in ('admin', 'employee')),
  primary_email text not null,
  secondary_email text,
  account_title text,
  bank_account_no text,
  bank_iban text,
  bank_name text,
  amount_paid numeric(12, 2) not null,
  paid_on date not null default current_date,
  purpose text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists staff_payments_recipient_paid_on_idx
on staff_payments (recipient_user_id, paid_on desc, id desc);

alter table orders
add column if not exists commission_amount numeric(12, 2) not null default 0;

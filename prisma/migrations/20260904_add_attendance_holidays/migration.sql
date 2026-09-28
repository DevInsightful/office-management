create table if not exists attendance_holidays (
  id serial primary key,
  title text not null,
  holiday_date date not null unique,
  created_by integer references users(id) on delete set null,
  created_at timestamptz not null default now()
);

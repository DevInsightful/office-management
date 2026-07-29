create table if not exists attendance_records (
  id serial primary key,
  employee_id integer not null references users(id) on delete cascade,
  check_in_time timestamptz not null default now(),
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  accuracy numeric(8, 2),
  distance_from_office numeric(8, 2),
  office_radius integer,
  ip_address varchar(128),
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists attendance_records_employee_check_in_idx
  on attendance_records (employee_id, check_in_time desc);

create table if not exists attendance_attempts (
  id serial primary key,
  employee_id integer references users(id) on delete set null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  accuracy numeric(8, 2),
  distance_from_office numeric(8, 2),
  office_radius integer,
  ip_address varchar(128),
  user_agent text,
  result text not null,
  message text not null default '',
  requested_at timestamptz not null default now()
);

create index if not exists attendance_attempts_employee_requested_idx
  on attendance_attempts (employee_id, requested_at desc);

create index if not exists attendance_attempts_ip_requested_idx
  on attendance_attempts (ip_address, requested_at desc);

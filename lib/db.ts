import postgres from "postgres";

declare global {
  var __officeSql: ReturnType<typeof postgres> | undefined;
}

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  return connectionString;
}

function getSqlClient() {
  if (!global.__officeSql) {
    global.__officeSql = postgres(getConnectionString(), {
      ssl: "require",
      max: 10,
    });
  }

  return global.__officeSql;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql: any = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) =>
  (getSqlClient() as unknown as (
    template: TemplateStringsArray,
    ...parameters: unknown[]
  ) => unknown)(strings, ...values);

export async function ensureDb() {
  await bootstrap();
}

async function bootstrap() {
  await sql`
    create table if not exists users (
      id serial primary key,
      full_name text not null,
      email text not null unique,
      password_hash text not null,
      role text not null check (role in ('super_admin', 'admin', 'employee')),
      joined_on date not null default current_date,
      salary numeric(12, 2) not null default 0,
      active boolean not null default true,
      created_by integer references users(id) on delete set null,
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists sessions (
      id text primary key,
      user_id integer not null references users(id) on delete cascade,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists finance_entries (
      id serial primary key,
      type text not null check (type in ('income', 'expense')),
      title text not null,
      category text not null,
      amount numeric(12, 2) not null,
      entry_date date not null,
      notes text not null default '',
      created_by integer references users(id) on delete set null,
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists attendance (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      attendance_date date not null,
      check_in_at timestamptz not null default now(),
      notes text not null default '',
      unique (user_id, attendance_date)
    );
  `;

  await sql`
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
  `;

  await sql`
    create index if not exists attendance_records_employee_check_in_idx
    on attendance_records (employee_id, check_in_time desc);
  `;

  await sql`
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
  `;

  await sql`
    create index if not exists attendance_attempts_employee_requested_idx
    on attendance_attempts (employee_id, requested_at desc);
  `;

  await sql`
    create index if not exists attendance_attempts_ip_requested_idx
    on attendance_attempts (ip_address, requested_at desc);
  `;

  await sql`
    create table if not exists tasks (
      id serial primary key,
      assigned_to integer not null references users(id) on delete cascade,
      assigned_by integer references users(id) on delete set null,
      title text not null,
      details text not null default '',
      priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
      status text not null default 'pending' check (status in ('pending', 'working', 'completed')),
      timer_started_at timestamptz,
      timer_total_minutes integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      completed_at timestamptz
    );
  `;

  await sql`
    create table if not exists task_logs (
      id serial primary key,
      task_id integer not null references tasks(id) on delete cascade,
      user_id integer not null references users(id) on delete cascade,
      work_date date not null default current_date,
      minutes_spent integer not null default 0,
      description text not null default '',
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists salary_payments (
      id serial primary key,
      user_id integer not null references users(id) on delete cascade,
      cycle_month date not null,
      due_date date not null,
      paid_on date,
      amount numeric(12, 2) not null,
      status text not null default 'due' check (status in ('due', 'paid')),
      created_at timestamptz not null default now(),
      unique (user_id, cycle_month)
    );
  `;

  await sql`
    create table if not exists orders (
      id serial primary key,
      csr_user_id integer not null references users(id) on delete cascade,
      note text not null,
      id_name text not null,
      booking_date date not null,
      delivery_date date not null,
      customer_name text not null,
      address text not null,
      phone_number text not null,
      order_details text not null,
      color text not null,
      price numeric(12, 2) not null,
      free_delivery boolean not null default false,
      delivery_price numeric(12, 2) not null default 0,
      free_parking boolean not null default false,
      total numeric(12, 2) not null,
      payment_method text not null,
      description text not null default '',
      image_url text not null,
      status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'delivered')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    alter table orders
    add column if not exists delivery_price numeric(12, 2) not null default 0;
  `;

  await sql`
    create table if not exists app_settings (
      key text primary key,
      value text not null,
      updated_at timestamptz not null default now()
    );
  `;
}

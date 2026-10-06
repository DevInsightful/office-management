import postgres from "postgres";

declare global {
  var __officeSql: ReturnType<typeof postgres> | undefined;
  var __officeBootstrap: Promise<void> | undefined;
  var __officeBootstrapVersion: number | undefined;
}

const DB_SCHEMA_VERSION = 3;

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

function isTransientDnsError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EAI_AGAIN";
}

function waitForRetry(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runSqlQuery(strings: TemplateStringsArray, values: unknown[]) {
  // EAI_AGAIN means DNS did not answer in time, before a SQL statement can reach Neon.
  // Retrying only this error is safe for reads and writes alike.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await (getSqlClient() as unknown as (
        template: TemplateStringsArray,
        ...parameters: unknown[]
      ) => Promise<unknown>)(strings, ...values);
    } catch (error) {
      if (!isTransientDnsError(error) || attempt === 2) {
        throw error;
      }

      await waitForRetry(150 * (attempt + 1));
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sql: any = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => runSqlQuery(strings, values);

export async function ensureDb() {
  if (!global.__officeBootstrap || global.__officeBootstrapVersion !== DB_SCHEMA_VERSION) {
    global.__officeBootstrapVersion = DB_SCHEMA_VERSION;
    global.__officeBootstrap = bootstrap().catch((error: unknown) => {
      global.__officeBootstrap = undefined;
      global.__officeBootstrapVersion = undefined;
      throw error;
    });
  }

  await global.__officeBootstrap;
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
      status text not null default 'present' check (status in ('present', 'half_day')),
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    alter table attendance_records
    add column if not exists status text not null default 'present';
  `;

  await sql`
    update attendance_records
    set status = 'present'
    where status is null;
  `;

  await sql`
    do $$
    begin
      if not exists (
        select 1
        from pg_constraint
        where conname = 'attendance_records_status_check'
          and conrelid = 'attendance_records'::regclass
      ) then
        alter table attendance_records
        add constraint attendance_records_status_check
        check (status in ('present', 'half_day'));
      end if;
    end
    $$;
  `;

  await sql`
    create index if not exists attendance_records_employee_check_in_idx
    on attendance_records (employee_id, check_in_time desc);
  `;

  await sql`
    create table if not exists attendance_holidays (
      id serial primary key,
      title text not null,
      holiday_date date not null unique,
      created_by integer references users(id) on delete set null,
      created_at timestamptz not null default now()
    );
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
  `;

  await sql`
    create index if not exists staff_payments_recipient_paid_on_idx
    on staff_payments (recipient_user_id, paid_on desc, id desc);
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
      postcode text not null default '',
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
      commission_amount numeric(12, 2) not null default 0,
      status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'delivered')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    alter table orders
    add column if not exists postcode text not null default '';
  `;

  await sql`
    alter table orders
    add column if not exists delivery_price numeric(12, 2) not null default 0;
  `;

  await sql`
    alter table orders
    add column if not exists commission_amount numeric(12, 2) not null default 0;
  `;

  await sql`
    create table if not exists app_settings (
      key text primary key,
      value text not null,
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    alter table users
    add column if not exists can_manage_pages boolean not null default false;
  `;

  await sql`
    alter table users
    add column if not exists personal_email text;
  `;

  await sql`
    alter table users
    add column if not exists bank_account_no text;
  `;

  await sql`
    alter table users
    add column if not exists bank_iban text;
  `;

  await sql`
    alter table users
    add column if not exists bank_name text;
  `;

  await sql`
    alter table users
    add column if not exists account_title text;
  `;

  await sql`
    alter table users
    add column if not exists profile_details_updated_at timestamptz;
  `;

  await sql`
    create table if not exists facebook_ids (
      id serial primary key,
      email text not null unique,
      facebook_password text,
      email_password text,
      assigned_to integer references users(id) on delete set null,
      date_created date not null default current_date,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    alter table facebook_ids
    add column if not exists status text[] not null default '{}';
  `;

  await sql`
    create index if not exists facebook_ids_assigned_to_idx
    on facebook_ids (assigned_to);
  `;

  await sql`
    create index if not exists facebook_ids_email_idx
    on facebook_ids (lower(email));
  `;

  await sql`
    create table if not exists facebook_id_pages (
      id serial primary key,
      facebook_id_id integer not null references facebook_ids(id) on delete cascade,
      name text not null,
      password text not null,
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create index if not exists facebook_id_pages_facebook_id_idx
    on facebook_id_pages (facebook_id_id);
  `;
}

import { SessionUser } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import { seedIfEmpty } from "@/lib/seed";

export {
  FACEBOOK_ID_STATUS_OPTIONS,
  validateFacebookIdRow,
  type FacebookIdRowInput,
  type FacebookIdRowValidation,
} from "@/lib/facebook-id-validation";

export type FacebookPage = {
  id: number;
  name: string;
  password: string;
};

export type FacebookIdRecord = {
  id: number;
  email: string;
  facebookPassword: string | null;
  emailPassword: string | null;
  assignedTo: number | null;
  assignedToName: string | null;
  status: string[];
  dateCreated: string;
  createdAt: string;
  pages: FacebookPage[] | null;
};

export type FacebookIdsData = {
  records: FacebookIdRecord[];
  employees: { id: number; fullName: string; role: string }[];
};

type FacebookIdRow = {
  id: number;
  email: string;
  facebook_password: string | null;
  email_password: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  status: string[] | null;
  date_created: string;
  created_at: string;
};

type FacebookPageRow = {
  id: number;
  facebook_id_id: number;
  name: string;
  password: string;
};

export async function getFacebookIdsData(user: SessionUser): Promise<FacebookIdsData> {
  await ensureDb();
  await seedIfEmpty();

  const recordsPromise =
    user.role === "employee"
      ? sql<FacebookIdRow[]>`
          select
            fi.id,
            fi.email,
            fi.facebook_password,
            fi.email_password,
            fi.assigned_to,
            u.full_name as assigned_to_name,
            fi.status,
            fi.date_created::text,
            fi.created_at::text
          from facebook_ids fi
          left join users u on u.id = fi.assigned_to
          where fi.assigned_to = ${user.id}
          order by fi.created_at desc
        `
      : sql<FacebookIdRow[]>`
          select
            fi.id,
            fi.email,
            fi.facebook_password,
            fi.email_password,
            fi.assigned_to,
            u.full_name as assigned_to_name,
            fi.status,
            fi.date_created::text,
            fi.created_at::text
          from facebook_ids fi
          left join users u on u.id = fi.assigned_to
          order by fi.created_at desc
        `;

  const employeesPromise = sql<{ id: number; full_name: string; role: string }[]>`
    select id, full_name, role
    from users
    where active = true and role in ('admin', 'employee')
    order by full_name asc
  `;

  const [records, employees] = await Promise.all([recordsPromise, employeesPromise]);

  const recordIds = records.map((row: FacebookIdRow) => row.id);

  const pageRows = recordIds.length
    ? await sql<FacebookPageRow[]>`
        select id, facebook_id_id, name, password
        from facebook_id_pages
        where facebook_id_id in ${sql(recordIds)}
        order by id asc
      `
    : [];

  const pagesByRecord = new Map<number, FacebookPage[]>();

  for (const page of pageRows) {
    const existing = pagesByRecord.get(page.facebook_id_id) ?? [];
    existing.push({ id: page.id, name: page.name, password: page.password });
    pagesByRecord.set(page.facebook_id_id, existing);
  }

  return {
    records: records.map((row: FacebookIdRow) => ({
      id: row.id,
      email: row.email,
      facebookPassword: row.facebook_password,
      emailPassword: row.email_password,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      status: row.status ?? [],
      dateCreated: row.date_created,
      createdAt: row.created_at,
      pages: pagesByRecord.get(row.id) ?? null,
    })),
    employees: employees.map((row: { id: number; full_name: string; role: string }) => ({
      id: row.id,
      fullName: row.full_name,
      role: row.role,
    })),
  };
}

export async function consumeImportResult(ref: string) {
  await ensureDb();

  const rows = await sql<{ value: string }[]>`
    select value from app_settings where key = ${`import_result:${ref}`} limit 1
  `;

  const stored = rows[0]?.value;

  if (!stored) {
    return null;
  }

  return JSON.parse(stored) as {
    totalRows: number;
    successCount: number;
    duplicateCount: number;
    invalidCount: number;
    failedRows: { row: number; email: string; reason: string }[];
    duplicateRows: { row: number; email: string; reason: string }[];
  };
}

export async function assertFacebookIdAccess(user: SessionUser, facebookIdId: number) {
  const rows = await sql<{ id: number; assigned_to: number | null }[]>`
    select id, assigned_to
    from facebook_ids
    where id = ${facebookIdId}
    limit 1
  `;

  const record = rows[0];

  if (!record) {
    return null;
  }

  if (user.role === "employee" && record.assigned_to !== user.id) {
    return null;
  }

  return record;
}


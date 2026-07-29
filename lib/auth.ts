import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ensureDb, sql } from "@/lib/db";

const SESSION_COOKIE = "office_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

export type AppRole = "super_admin" | "admin" | "employee";

export type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  role: AppRole;
  joinedOn: string;
  salary: number;
};

type SessionRow = {
  id: string;
  user_id: number;
  expires_at: Date;
  full_name: string;
  email: string;
  role: AppRole;
  joined_on: string;
  salary: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number) {
  await ensureDb();

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await sql`
    insert into sessions (id, user_id, expires_at)
    values (${sessionId}, ${userId}, ${expiresAt.toISOString()})
  `;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await ensureDb();
    await sql`delete from sessions where id = ${sessionId}`;
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  await ensureDb();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionId) {
    return null;
  }

  const rows = await sql<SessionRow[]>`
    select
      s.id,
      s.user_id,
      s.expires_at,
      u.full_name,
      u.email,
      u.role,
      u.joined_on::text,
      u.salary::text
    from sessions s
    join users u on u.id = s.user_id
    where s.id = ${sessionId}
      and s.expires_at > now()
      and u.active = true
    limit 1
  `;

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    joinedOn: row.joined_on,
    salary: Number(row.salary),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role === "employee") {
    redirect("/");
  }

  return user;
}

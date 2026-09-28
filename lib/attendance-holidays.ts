import { ensureDb, sql } from "@/lib/db";

export type AttendanceHoliday = { id: number; title: string; holidayDate: string };

export async function getAttendanceHolidays(): Promise<AttendanceHoliday[]> {
  await ensureDb();
  const rows = await sql<{ id: number; title: string; holiday_date: string }[]>`
    select id, title, holiday_date::text from attendance_holidays order by holiday_date desc, id desc
  `;
  return rows.map((row: { id: number; title: string; holiday_date: string }) => ({ id: row.id, title: row.title, holidayDate: row.holiday_date }));
}

export async function getAttendanceHoliday(holidayDate: string) {
  await ensureDb();
  const rows = await sql<{ title: string }[]>`
    select title from attendance_holidays where holiday_date = ${holidayDate}::date limit 1
  `;
  return rows[0] ?? null;
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { ensureDb, sql } from "@/lib/db";
import type { FacebookImportResult } from "@/app/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCsvField(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role === "employee") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const ref = new URL(request.url).searchParams.get("ref");

  if (!ref) {
    return NextResponse.json({ message: "Missing ref." }, { status: 400 });
  }

  await ensureDb();

  const rows = await sql<{ value: string }[]>`
    select value from app_settings where key = ${`import_result:${ref}`} limit 1
  `;

  const stored = rows[0]?.value;

  if (!stored) {
    return NextResponse.json({ message: "Import result not found." }, { status: 404 });
  }

  const result = JSON.parse(stored) as FacebookImportResult;
  const combined = [
    ...result.failedRows.map((row) => ({ ...row, type: "invalid" })),
    ...result.duplicateRows.map((row) => ({ ...row, type: "duplicate" })),
  ].sort((left, right) => left.row - right.row);

  const lines = ["Row,Email,Type,Reason"];

  for (const row of combined) {
    lines.push(
      [String(row.row), escapeCsvField(row.email), row.type, escapeCsvField(row.reason)].join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="facebook-ids-import-errors.csv"',
    },
  });
}

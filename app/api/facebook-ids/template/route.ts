import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMPLATE_CSV = [
  "Email *,Facebook Password *,Email/Gmail Password",
  "user1@gmail.com,facebook123,gmail123",
  "user2@gmail.com,facebook456,",
  "user3@gmail.com,,gmail789",
].join("\n");

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role === "employee") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  return new NextResponse(TEMPLATE_CSV, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="facebook-ids-template.csv"',
    },
  });
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { checkInAttendance } from "@/lib/attendance-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel forwards the originating client IP in proxy headers.
function getClientIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Authentication is required.",
      },
      { status: 401 },
    );
  }

  if (user.role !== "employee") {
    return NextResponse.json(
      {
        success: false,
        message: "Only employees can mark attendance.",
      },
      { status: 403 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid JSON payload.",
      },
      { status: 400 },
    );
  }

  const latitude = typeof body === "object" && body !== null ? (body as { latitude?: unknown }).latitude : undefined;
  const longitude =
    typeof body === "object" && body !== null ? (body as { longitude?: unknown }).longitude : undefined;
  const accuracy =
    typeof body === "object" && body !== null ? (body as { accuracy?: unknown }).accuracy : undefined;

  if (latitude === undefined || longitude === undefined || accuracy === undefined) {
    return NextResponse.json(
      {
        success: false,
        message: "Latitude, longitude, and accuracy are required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await checkInAttendance({
      employeeId: user.id,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: Number(accuracy),
      ipAddress: getClientIpAddress(request),
      userAgent: request.headers.get("user-agent"),
    });

    // Business-rule rejections still return structured JSON for the client UX.
    return NextResponse.json(
      {
        success: result.success,
        distance: result.distance,
        message: result.message,
      },
      { status: result.status },
    );
  } catch (error) {
    console.error("Attendance check-in failed.", error);

    const message =
      error instanceof Error &&
      /OFFICE_LATITUDE|OFFICE_LONGITUDE|OFFICE_RADIUS_METERS/.test(error.message)
        ? "Office geofence is not configured on the server."
        : "Unable to mark attendance right now.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

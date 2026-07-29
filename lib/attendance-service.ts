import { prisma } from "@/lib/prisma";
import { getAttendanceConfig } from "@/lib/config";
import { calculateDistanceMeters } from "@/lib/haversine";

type CheckInPayload = {
  employeeId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  ipAddress: string | null;
  userAgent: string | null;
};

export type AttendanceCheckInResult = {
  success: boolean;
  distance?: number;
  message: string;
  status: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

// Every attempt is audited so rejected requests still leave a trail for abuse review.
async function logAttempt(
  payload: Partial<CheckInPayload> & {
    distance?: number;
    officeRadius?: number;
    result: string;
    message: string;
  },
) {
  await prisma.attendanceAttempt.create({
    data: {
      employeeId: payload.employeeId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      distanceFromOffice: payload.distance,
      officeRadius: payload.officeRadius,
      ipAddress: payload.ipAddress ?? undefined,
      userAgent: payload.userAgent ?? undefined,
      result: payload.result,
      message: payload.message,
    },
  });
}

export async function checkInAttendance(
  payload: CheckInPayload,
): Promise<AttendanceCheckInResult> {
  const config = getAttendanceConfig();

  // Validate numeric input on the server before any business logic runs.
  if (!Number.isInteger(payload.employeeId) || payload.employeeId <= 0) {
    return {
      success: false,
      message: "Invalid employee.",
      status: 400,
    };
  }

  if (!isFiniteNumber(payload.latitude) || payload.latitude < -90 || payload.latitude > 90) {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_validation",
      message: "Latitude is invalid.",
    });

    return {
      success: false,
      message: "Latitude is invalid.",
      status: 400,
    };
  }

  if (!isFiniteNumber(payload.longitude) || payload.longitude < -180 || payload.longitude > 180) {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_validation",
      message: "Longitude is invalid.",
    });

    return {
      success: false,
      message: "Longitude is invalid.",
      status: 400,
    };
  }

  if (!isFiniteNumber(payload.accuracy) || payload.accuracy <= 0) {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_validation",
      message: "Accuracy is required.",
    });

    return {
      success: false,
      message: "Accuracy is required.",
      status: 400,
    };
  }

  if (payload.accuracy > config.maxGpsAccuracyMeters) {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_validation",
      message: `GPS accuracy is too low (${payload.accuracy.toFixed(1)} m). Required: ${config.maxGpsAccuracyMeters} m or better.`,
    });

    return {
      success: false,
      message: `GPS accuracy is too low (${payload.accuracy.toFixed(1)} m). Required: ${config.maxGpsAccuracyMeters} m or better.`,
      status: 400,
    };
  }

  // The employee lookup prevents attendance for deleted, disabled, or non-employee accounts.
  const employee = await prisma.user.findUnique({
    where: { id: payload.employeeId },
    select: { id: true, active: true, role: true },
  });

  if (!employee || !employee.active || employee.role !== "employee") {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_validation",
      message: "Employee account not found.",
    });

    return {
      success: false,
      message: "Employee account not found.",
      status: 404,
    };
  }

  const now = new Date();
  const duplicateCutoff = new Date(now.getTime() - config.duplicateWindowMinutes * 60_000);
  const rateLimitCutoff = new Date(now.getTime() - config.rateLimitWindowMinutes * 60_000);

  // Rate limiting and duplicate-window checks happen before distance computation.
  const [recentAttemptCount, recentAttendance] = await Promise.all([
    prisma.attendanceAttempt.count({
      where: {
        OR: [
          { employeeId: payload.employeeId },
          ...(payload.ipAddress ? [{ ipAddress: payload.ipAddress }] : []),
        ],
        requestedAt: {
          gte: rateLimitCutoff,
        },
      },
    }),
    prisma.attendance.findFirst({
      where: {
        employeeId: payload.employeeId,
        checkInTime: {
          gte: duplicateCutoff,
        },
      },
      orderBy: {
        checkInTime: "desc",
      },
    }),
  ]);

  if (recentAttemptCount >= config.rateLimitMaxRequests) {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_rate_limit",
      message: "Too many attendance requests. Please wait and try again.",
    });

    return {
      success: false,
      message: "Too many attendance requests. Please wait and try again.",
      status: 429,
    };
  }

  if (recentAttendance) {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_duplicate",
      message: "Attendance has already been marked in the current check-in window.",
    });

    return {
      success: false,
      message: "Attendance has already been marked in the current check-in window.",
      status: 409,
    };
  }

  // Distance is always calculated on the backend; the frontend is advisory only.
  const distance = roundToSingleDecimal(
    calculateDistanceMeters(
      payload.latitude,
      payload.longitude,
      config.officeLatitude,
      config.officeLongitude,
    ),
  );

  if (distance > config.officeRadiusMeters) {
    await logAttempt({
      ...payload,
      distance,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_outside",
      message: "You are outside the office premises.",
    });

    return {
      success: false,
      distance,
      message: "You are outside the office premises.",
      status: 200,
    };
  }

  // The successful transaction writes both the audit record and the approved attendance row.
  await prisma.$transaction([
    prisma.attendance.create({
      data: {
        employeeId: payload.employeeId,
        checkInTime: now,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        distanceFromOffice: distance,
        officeRadius: config.officeRadiusMeters,
        ipAddress: payload.ipAddress ?? undefined,
        userAgent: payload.userAgent ?? undefined,
      },
    }),
    prisma.attendanceAttempt.create({
      data: {
        employeeId: payload.employeeId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        distanceFromOffice: distance,
        officeRadius: config.officeRadiusMeters,
        ipAddress: payload.ipAddress ?? undefined,
        userAgent: payload.userAgent ?? undefined,
        result: "allowed",
        message: "Attendance marked successfully.",
      },
    }),
  ]);

  return {
    success: true,
    distance,
    message: "Attendance marked successfully.",
    status: 200,
  };
}

import { prisma } from "@/lib/prisma";
import { getAttendanceDecision, getOfficeTodayIsoDate, getNonWorkingDayStatus, OFFICE_TIME_ZONE } from "@/lib/attendance-policy";
import { getAttendanceHoliday } from "@/lib/attendance-holidays";
import { getAttendanceConfig } from "@/lib/config";
import { calculateDistanceMeters } from "@/lib/haversine";
import { distanceToPolygonMeters, isPointInsidePolygon } from "@/lib/geofence";

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

function getOfficeDayBounds(date: Date) {
  const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: OFFICE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const lookup = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12));
  const zoneName = new Intl.DateTimeFormat("en-US", { timeZone: OFFICE_TIME_ZONE, timeZoneName: "longOffset" }).formatToParts(noonUtc).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const offset = zoneName.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  const offsetMinutes = offset ? (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === "+" ? 1 : -1) : 0;
  const start = new Date(Date.UTC(year, month - 1, day) - offsetMinutes * 60_000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
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

  // Attendance is tracked for active admins and employees; super admins are excluded.
  const employee = await prisma.user.findUnique({
    where: { id: payload.employeeId },
    select: { id: true, active: true, role: true },
  });

  if (!employee || !employee.active || employee.role === "super_admin") {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_validation",
      message: "Attendance is available only for active admins and employees.",
    });

    return {
      success: false,
      message: "Attendance is available only for active admins and employees.",
      status: 403,
    };
  }

  const now = new Date();
  const todayInOffice = getOfficeTodayIsoDate(now);
  const holiday = await getAttendanceHoliday(todayInOffice);
  const nonWorkingStatus = getNonWorkingDayStatus(todayInOffice, holiday ? [todayInOffice] : []);

  if (nonWorkingStatus) {
    const message = nonWorkingStatus === "holiday"
      ? `${holiday?.title ?? "Today"} is a holiday. Attendance is not required.`
      : "Today is the weekly off day. Attendance is not required.";
    await logAttempt({ ...payload, officeRadius: config.officeRadiusMeters, result: `blocked_${nonWorkingStatus}`, message });
    return { success: false, message, status: 403 };
  }

  const rateLimitCutoff = new Date(now.getTime() - config.rateLimitWindowMinutes * 60_000);
  const attendanceDay = getOfficeDayBounds(now);

  // Rate limiting and duplicate-day checks happen before distance computation.
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
          gte: attendanceDay.start,
          lt: attendanceDay.end,
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
      message: "Attendance has already been marked for today.",
    });

    return {
      success: false,
      message: "Attendance has already been marked for today.",
      status: 409,
    };
  }

  const attendanceDecision = getAttendanceDecision(now);

  if (!attendanceDecision.allowed) {
    await logAttempt({
      ...payload,
      officeRadius: config.officeRadiusMeters,
      result: "blocked_cutoff",
      message: attendanceDecision.message,
    });

    return {
      success: false,
      message: attendanceDecision.message,
      status: 403,
    };
  }

  // Distance is always calculated on the backend; the frontend is advisory only.
  const point = {
    latitude: payload.latitude,
    longitude: payload.longitude,
  };

  const polygonDistance = config.officePolygon.length >= 3
    ? roundToSingleDecimal(distanceToPolygonMeters(point, config.officePolygon))
    : null;
  const centroidDistance =
    polygonDistance === null
      ? roundToSingleDecimal(
          calculateDistanceMeters(
            payload.latitude,
            payload.longitude,
            config.officeLatitude,
            config.officeLongitude,
          ),
        )
      : null;
  const isInsideGeofence =
    config.officePolygon.length >= 3
      ? isPointInsidePolygon(point, config.officePolygon) ||
        (polygonDistance !== null && polygonDistance <= config.geofenceBufferMeters)
      : centroidDistance !== null && centroidDistance <= config.officeRadiusMeters;
  const distance =
    polygonDistance !== null
      ? polygonDistance
      : centroidDistance ?? Number.POSITIVE_INFINITY;
  const allowedBoundaryMeters =
    config.officePolygon.length >= 3 ? config.geofenceBufferMeters : config.officeRadiusMeters;

  if (!isInsideGeofence) {
    await logAttempt({
      ...payload,
      distance,
      officeRadius: allowedBoundaryMeters,
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
    prisma.$executeRaw`
      insert into attendance_records (
        employee_id,
        check_in_time,
        latitude,
        longitude,
        accuracy,
        distance_from_office,
        office_radius,
        ip_address,
        user_agent,
        status
      )
      values (
        ${payload.employeeId},
        ${now},
        ${payload.latitude},
        ${payload.longitude},
        ${payload.accuracy},
        ${distance},
        ${allowedBoundaryMeters},
        ${payload.ipAddress},
        ${payload.userAgent},
        ${attendanceDecision.attendanceStatus}
      )
    `,
    prisma.attendanceAttempt.create({
      data: {
        employeeId: payload.employeeId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        distanceFromOffice: distance,
        officeRadius: allowedBoundaryMeters,
        ipAddress: payload.ipAddress ?? undefined,
        userAgent: payload.userAgent ?? undefined,
        result: attendanceDecision.attendanceStatus === "half_day" ? "allowed_half_day" : "allowed",
        message: attendanceDecision.message,
      },
    }),
  ]);

  return {
    success: true,
    distance,
    message: attendanceDecision.message,
    status: 200,
  };
}

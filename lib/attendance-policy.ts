export type AttendanceStatus = "present" | "half_day";

function getKarachiDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    isoDate: `${lookup.year}-${lookup.month}-${lookup.day}`,
    weekday: lookup.weekday,
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
  };
}

export function getKarachiTodayIsoDate(date: Date) {
  return getKarachiDateParts(date).isoDate;
}

export function getAttendanceDecision(date: Date) {
  const karachi = getKarachiDateParts(date);
  const totalMinutes = karachi.hour * 60 + karachi.minute;
  const isFriday = karachi.weekday === "Fri";
  const fullDayLimitMinutes = 15 * 60 + 15;
  const halfDayLimitMinutes = isFriday ? 16 * 60 + 15 : 16 * 60;
  const absentLimitMinutes = isFriday ? 17 * 60 : 16 * 60;

  if (totalMinutes <= fullDayLimitMinutes) {
    return {
      allowed: true,
      attendanceStatus: "present" as AttendanceStatus,
      message: "Attendance marked successfully.",
    };
  }

  if (totalMinutes <= halfDayLimitMinutes) {
    return {
      allowed: true,
      attendanceStatus: "half_day" as AttendanceStatus,
      message: "Attendance marked as half day due to late check-in.",
    };
  }

  return {
    allowed: false,
    cutoffMinutes: absentLimitMinutes,
    message: `Attendance cannot be marked after ${isFriday ? "5:00 PM PKT on Friday" : "4:00 PM PKT on working days"}. You are marked absent for today.`,
  };
}

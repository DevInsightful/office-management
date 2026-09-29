// Attendance follows the office's local calendar day.
export const OFFICE_TIME_ZONE = "America/Los_Angeles";
export const DEFAULT_WEEKEND_DAY = "Sun";

export type AttendanceStatus = "present" | "half_day";
export type AttendanceDisplayStatus = AttendanceStatus | "absent" | "weekend" | "holiday";

function getOfficeDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: OFFICE_TIME_ZONE,
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const lookup = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { isoDate: `${lookup.year}-${lookup.month}-${lookup.day}`, weekday: lookup.weekday, hour: Number(lookup.hour), minute: Number(lookup.minute) };
}

export function getOfficeTodayIsoDate(date: Date) { return getOfficeDateParts(date).isoDate; }

export function getAttendanceDecision(date: Date) {
  const office = getOfficeDateParts(date);
  const totalMinutes = office.hour * 60 + office.minute;
  const presentLimitMinutes = 16 * 60 + 30;
  const halfDayLimitMinutes = 16 * 60 + 59;

  if (totalMinutes <= presentLimitMinutes) return { allowed: true, attendanceStatus: "present" as AttendanceStatus, message: "Attendance marked successfully." };
  if (totalMinutes <= halfDayLimitMinutes) return { allowed: true, attendanceStatus: "half_day" as AttendanceStatus, message: "Attendance marked as half day due to late check-in." };
  return { allowed: false, cutoffMinutes: halfDayLimitMinutes, message: "Attendance cannot be marked after 4:59 PM. You are marked absent for today." };
}

export function getNonWorkingDayStatus(isoDate: string, holidayDates: Iterable<string>): "weekend" | "holiday" | null {
  if (new Set(holidayDates).has(isoDate)) return "holiday";
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay() === 0 ? "weekend" : null;
}

export function formatAttendanceDate(isoDate: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "2-digit", weekday: "short" }).formatToParts(new Date(`${isoDate}T00:00:00Z`));
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${[lookup.day, lookup.month, lookup.year].join("/")} - ${lookup.weekday}`;
}

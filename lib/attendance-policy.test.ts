import assert from "node:assert/strict";
import test from "node:test";

import { getAttendanceDecision, getNonWorkingDayStatus } from "./attendance-policy.ts";

function karachiTime(isoDate: string, hour: number, minute: number) {
  return new Date(`${isoDate}T${String(hour - 5).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`);
}

function statusAt(isoDate: string, hour: number, minute: number) {
  const decision = getAttendanceDecision(karachiTime(isoDate, hour, minute));
  assert.equal(decision.allowed, true);
  return decision.attendanceStatus;
}

test("Friday boundaries", () => {
  assert.equal(statusAt("2026-09-04", 16, 29), "present");
  assert.equal(statusAt("2026-09-04", 16, 30), "present");
  assert.equal(statusAt("2026-09-04", 16, 31), "half_day");
  assert.equal(statusAt("2026-09-04", 17, 0), "half_day");
  assert.equal(getAttendanceDecision(karachiTime("2026-09-04", 17, 1)).allowed, false);
});

test("normal working-day boundaries", () => {
  assert.equal(statusAt("2026-09-03", 15, 20), "present");
  assert.equal(statusAt("2026-09-03", 15, 21), "half_day");
  assert.equal(statusAt("2026-09-03", 16, 0), "half_day");
  assert.equal(getAttendanceDecision(karachiTime("2026-09-03", 16, 1)).allowed, false);
});

test("non-working day priority", () => {
  assert.equal(getNonWorkingDayStatus("2026-09-06", []), "weekend");
  assert.equal(getNonWorkingDayStatus("2026-12-25", ["2026-12-25"]), "holiday");
});

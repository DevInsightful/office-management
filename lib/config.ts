type ParsedNumberOptions = {
  envName: string;
  fallback?: number;
  min?: number;
  max?: number;
};

function parseNumber({ envName, fallback, min, max }: ParsedNumberOptions) {
  const raw = process.env[envName];

  if (!raw || raw.trim() === "") {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`${envName} is not set.`);
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${envName} must be a valid number.`);
  }

  if (min !== undefined && parsed < min) {
    throw new Error(`${envName} must be >= ${min}.`);
  }

  if (max !== undefined && parsed > max) {
    throw new Error(`${envName} must be <= ${max}.`);
  }

  return parsed;
}

export function getAttendanceConfig() {
  return {
    officeLatitude: parseNumber({
      envName: "OFFICE_LATITUDE",
      min: -90,
      max: 90,
    }),
    officeLongitude: parseNumber({
      envName: "OFFICE_LONGITUDE",
      min: -180,
      max: 180,
    }),
    officeRadiusMeters: parseNumber({
      envName: "OFFICE_RADIUS_METERS",
      fallback: 75,
      min: 1,
      max: 5000,
    }),
    maxGpsAccuracyMeters: parseNumber({
      envName: "ATTENDANCE_MAX_ACCURACY_METERS",
      fallback: 250,
      min: 1,
      max: 500,
    }),
    duplicateWindowMinutes: parseNumber({
      envName: "ATTENDANCE_DUPLICATE_WINDOW_MINUTES",
      fallback: 1440,
      min: 1,
      max: 10080,
    }),
    rateLimitWindowMinutes: parseNumber({
      envName: "ATTENDANCE_RATE_LIMIT_WINDOW_MINUTES",
      fallback: 5,
      min: 1,
      max: 120,
    }),
    rateLimitMaxRequests: parseNumber({
      envName: "ATTENDANCE_RATE_LIMIT_MAX_REQUESTS",
      fallback: 5,
      min: 1,
      max: 50,
    }),
  };
}

export function getPublicAttendanceConfig() {
  return {
    maxGpsAccuracyMeters: parseNumber({
      envName: "NEXT_PUBLIC_ATTENDANCE_MAX_ACCURACY_METERS",
      fallback: 250,
      min: 1,
      max: 500,
    }),
  };
}

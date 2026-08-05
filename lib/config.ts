type ParsedNumberOptions = {
  envName: string;
  fallback?: number;
  min?: number;
  max?: number;
};

type PolygonPoint = {
  latitude: number;
  longitude: number;
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

function parsePolygon(envName: string): PolygonPoint[] {
  const raw = process.env[envName];

  if (!raw || raw.trim() === "") {
    return [];
  }

  const points = raw
    .split(";")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [latitudeRaw, longitudeRaw] = pair.split(",").map((value) => value.trim());
      const latitude = Number(latitudeRaw);
      const longitude = Number(longitudeRaw);

      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        throw new Error(`${envName} contains an invalid latitude.`);
      }

      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new Error(`${envName} contains an invalid longitude.`);
      }

      return { latitude, longitude };
    });

  if (points.length > 0 && points.length < 3) {
    throw new Error(`${envName} must contain at least three coordinate pairs.`);
  }

  if (points.length < 3) {
    return points;
  }

  const centroid = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude / points.length,
      longitude: acc.longitude + point.longitude / points.length,
    }),
    { latitude: 0, longitude: 0 },
  );

  return [...points].sort((left, right) => {
    const leftAngle = Math.atan2(left.latitude - centroid.latitude, left.longitude - centroid.longitude);
    const rightAngle = Math.atan2(right.latitude - centroid.latitude, right.longitude - centroid.longitude);
    return leftAngle - rightAngle;
  });
}

export function getAttendanceConfig() {
  const polygon = parsePolygon("OFFICE_POLYGON");

  return {
    officePolygon: polygon,
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
    geofenceBufferMeters: parseNumber({
      envName: "ATTENDANCE_GEOFENCE_BUFFER_METERS",
      fallback: 25,
      min: 0,
      max: 500,
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

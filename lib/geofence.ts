type Coordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toProjectedPoint(point: Coordinate, origin: Coordinate) {
  const latitude = toRadians(point.latitude);
  const longitude = toRadians(point.longitude);
  const originLatitude = toRadians(origin.latitude);
  const originLongitude = toRadians(origin.longitude);

  return {
    x: (longitude - originLongitude) * Math.cos((latitude + originLatitude) / 2) * EARTH_RADIUS_METERS,
    y: (latitude - originLatitude) * EARTH_RADIUS_METERS,
  };
}

function squaredDistanceToSegment(
  point: { x: number; y: number },
  segmentStart: { x: number; y: number },
  segmentEnd: { x: number; y: number },
) {
  const segmentX = segmentEnd.x - segmentStart.x;
  const segmentY = segmentEnd.y - segmentStart.y;
  const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

  if (segmentLengthSquared === 0) {
    return (point.x - segmentStart.x) ** 2 + (point.y - segmentStart.y) ** 2;
  }

  const projection =
    ((point.x - segmentStart.x) * segmentX + (point.y - segmentStart.y) * segmentY) /
    segmentLengthSquared;
  const clampedProjection = Math.max(0, Math.min(1, projection));

  const closestPoint = {
    x: segmentStart.x + clampedProjection * segmentX,
    y: segmentStart.y + clampedProjection * segmentY,
  };

  return (point.x - closestPoint.x) ** 2 + (point.y - closestPoint.y) ** 2;
}

export function isPointInsidePolygon(point: Coordinate, polygon: Coordinate[]) {
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];

    const intersects =
      current.longitude > point.longitude !== prior.longitude > point.longitude &&
      point.latitude <
        ((prior.latitude - current.latitude) * (point.longitude - current.longitude)) /
          (prior.longitude - current.longitude) +
          current.latitude;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function distanceToPolygonMeters(point: Coordinate, polygon: Coordinate[]) {
  if (polygon.length < 3) {
    return Number.POSITIVE_INFINITY;
  }

  if (isPointInsidePolygon(point, polygon)) {
    return 0;
  }

  const projectedPoint = toProjectedPoint(point, point);
  let minimumSquaredDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polygon.length; index += 1) {
    const nextIndex = (index + 1) % polygon.length;
    const start = toProjectedPoint(polygon[index], point);
    const end = toProjectedPoint(polygon[nextIndex], point);
    minimumSquaredDistance = Math.min(
      minimumSquaredDistance,
      squaredDistanceToSegment(projectedPoint, start, end),
    );
  }

  return Math.sqrt(minimumSquaredDistance);
}

"use client";

import { useCallback, useMemo, useState } from "react";

export type GeolocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

type PermissionStateLike = "granted" | "prompt" | "denied" | "unsupported" | "unknown";

export function useGeolocation() {
  const [location, setLocation] = useState<GeolocationSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionStateLike>("unknown");

  // This explicitly requests a fresh, high-accuracy location fix for attendance.
  const requestLocation = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      setError("GPS is not available on this device.");
      return null;
    }

    setIsLoading(true);
    setError(null);

    if ("permissions" in navigator && navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({
          name: "geolocation",
        });
        setPermission(status.state);
      } catch {
        setPermission("unknown");
      }
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0,
        });
      });

      const snapshot = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };

      setLocation(snapshot);
      setPermission("granted");
      return snapshot;
    } catch (caughtError) {
      // Browser geolocation errors are mapped to user-facing attendance messages here.
      const geolocationError = caughtError as GeolocationPositionError;

      if (geolocationError?.code === geolocationError.PERMISSION_DENIED) {
        setPermission("denied");
        setError("Location permission is required.");
      } else if (geolocationError?.code === geolocationError.TIMEOUT) {
        setError("Location request timed out. Please try again.");
      } else {
        setError("Unable to get your current GPS location.");
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLocation(null);
  }, []);

  return useMemo(
    () => ({
      location,
      isLoading,
      error,
      permission,
      requestLocation,
      retry: requestLocation,
      reset,
    }),
    [error, isLoading, location, permission, requestLocation, reset],
  );
}

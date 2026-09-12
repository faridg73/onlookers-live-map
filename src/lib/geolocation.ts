export type GeolocationFailureCode =
  | "unsupported"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unknown";

export class GeolocationFailure extends Error {
  readonly code: GeolocationFailureCode;

  constructor(code: GeolocationFailureCode, message: string) {
    super(message);
    this.name = "GeolocationFailure";
    this.code = code;
  }
}

function positionErrorCode(error: GeolocationPositionError): GeolocationFailureCode {
  if (error.code === error.PERMISSION_DENIED) return "denied";
  if (error.code === error.POSITION_UNAVAILABLE) return "unavailable";
  if (error.code === error.TIMEOUT) return "timeout";
  return "unknown";
}

function getPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/** Requests browser/device permission and returns the freshest available GPS fix. */
export async function requestCurrentPosition(): Promise<GeolocationPosition> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    const failure = new GeolocationFailure(
      "unsupported",
      "Location services are not available in this browser.",
    );
    console.error("[Onlooker location] Geolocation API unavailable", { code: failure.code });
    throw failure;
  }

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      console.info("[Onlooker location] Permission state", { state: permission.state });
      if (permission.state === "denied") {
        const failure = new GeolocationFailure(
          "denied",
          "Location permission is blocked. Enable it in your device settings and try again.",
        );
        console.error("[Onlooker location] Permission denied", { code: failure.code });
        throw failure;
      }
    } catch (error) {
      if (error instanceof GeolocationFailure) throw error;
      // Some Android WebViews expose Permissions API but reject this query.
      // Calling getCurrentPosition below still opens the native permission prompt.
      console.warn("[Onlooker location] Permission state could not be read; requesting GPS directly");
    }
  }

  try {
    return await getPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  } catch (error) {
    const positionError = error as GeolocationPositionError;
    const code = positionErrorCode(positionError);
    console.warn("[Onlooker location] Precise GPS attempt failed", {
      code,
      numericCode: positionError.code,
    });
    if (code === "denied") {
      throw new GeolocationFailure(
        code,
        "Location permission is blocked. Enable it in your device settings and try again.",
      );
    }
  }

  try {
    return await getPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 120000 });
  } catch (error) {
    const positionError = error as GeolocationPositionError;
    const code = positionErrorCode(positionError);
    console.error("[Onlooker location] GPS request failed", {
      code,
      numericCode: positionError.code,
    });
    throw new GeolocationFailure(
      code,
      code === "timeout"
        ? "Your location timed out. Move near a window and try again."
        : "Your location could not be found. Check device location settings and try again.",
    );
  }
}
const CITY_SPEED_KMPH = 24;
const BUFFER_MINUTES = 15;

type Coordinates = {
  latitude: number;
  longitude: number;
};

export type TravelEstimateInput = {
  destination: string;
  origin?: Coordinates;
  destinationCoordinates?: Coordinates;
  manualDistanceKm?: number;
};

export type TravelEstimateResult = {
  distanceKm: number | null;
  etaMinutes: number | null;
  source: "openrouteservice" | "osrm" | "manual" | "unavailable";
};

export function estimateManualTravel(distanceKm: number): TravelEstimateResult {
  const etaMinutes = Math.max(5, Math.ceil((distanceKm / CITY_SPEED_KMPH) * 60));
  return { distanceKm: Math.round(distanceKm), etaMinutes, source: "manual" };
}

export function getRecommendedLeaveAt(date: string, startTime: string, etaMinutes: number): string | null {
  const startDate = new Date(`${date}T${startTime}:00`);
  if (Number.isNaN(startDate.getTime())) return null;
  return new Date(startDate.getTime() - (etaMinutes + BUFFER_MINUTES) * 60_000).toISOString();
}

function toKilometers(meters: number): number {
  return Math.max(1, Math.round(meters / 1000));
}

function toMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}

function getOpenRouteServiceApiKey(): string | undefined {
  return process.env.OPENROUTESERVICE_API_KEY || process.env.ORS_API_KEY;
}

async function geocodeWithOpenRouteService(destination: string, apiKey: string): Promise<Coordinates | null> {
  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      text: destination,
      size: "1",
    });

    const response = await fetch(`https://api.openrouteservice.org/geocode/search?${params.toString()}`);
    if (!response.ok) return null;

    const data = await response.json() as any;
    const coordinates = data?.features?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

    return { longitude: Number(coordinates[0]), latitude: Number(coordinates[1]) };
  } catch {
    return null;
  }
}

async function geocodeWithNominatim(destination: string): Promise<Coordinates | null> {
  try {
    const params = new URLSearchParams({
      q: destination,
      format: "json",
      limit: "1",
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "QuickTurf/1.0 travel-estimate",
        "Accept": "application/json",
      },
    });
    if (!response.ok) return null;

    const data = await response.json() as any;
    const result = data?.[0];
    if (!result?.lat || !result?.lon) return null;

    return { latitude: Number(result.lat), longitude: Number(result.lon) };
  } catch {
    return null;
  }
}

async function estimateWithOpenRouteService(origin: Coordinates, destination: Coordinates, apiKey: string): Promise<TravelEstimateResult | null> {
  try {
    const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ],
      }),
    });
    if (!response.ok) return null;

    const data = await response.json() as any;
    const summary = data?.routes?.[0]?.summary ?? data?.features?.[0]?.properties?.summary;
    if (!summary?.distance || !summary?.duration) return null;

    return {
      distanceKm: toKilometers(Number(summary.distance)),
      etaMinutes: toMinutes(Number(summary.duration)),
      source: "openrouteservice",
    };
  } catch {
    return null;
  }
}

async function estimateWithOsrm(origin: Coordinates, destination: Coordinates): Promise<TravelEstimateResult | null> {
  try {
    const coordinates = [
      `${origin.longitude},${origin.latitude}`,
      `${destination.longitude},${destination.latitude}`,
    ].join(";");
    const params = new URLSearchParams({ overview: "false" });

    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`);
    if (!response.ok) return null;

    const data = await response.json() as any;
    const route = data?.routes?.[0];
    if (data?.code !== "Ok" || !route?.distance || !route?.duration) return null;

    return {
      distanceKm: toKilometers(Number(route.distance)),
      etaMinutes: toMinutes(Number(route.duration)),
      source: "osrm",
    };
  } catch {
    return null;
  }
}

async function resolveDestinationCoordinates(input: TravelEstimateInput, apiKey?: string): Promise<Coordinates | null> {
  if (input.destinationCoordinates) return input.destinationCoordinates;
  if (apiKey) {
    const openRouteServiceLocation = await geocodeWithOpenRouteService(input.destination, apiKey);
    if (openRouteServiceLocation) return openRouteServiceLocation;
  }
  return geocodeWithNominatim(input.destination);
}

export async function estimateTravel(input: TravelEstimateInput): Promise<TravelEstimateResult> {
  const apiKey = getOpenRouteServiceApiKey();

  if (!input.origin) {
    if (input.manualDistanceKm && input.manualDistanceKm > 0) {
      return estimateManualTravel(input.manualDistanceKm);
    }
    return { distanceKm: null, etaMinutes: null, source: "unavailable" };
  }

  const destination = await resolveDestinationCoordinates(input, apiKey);
  if (!destination) {
    if (input.manualDistanceKm && input.manualDistanceKm > 0) {
      return estimateManualTravel(input.manualDistanceKm);
    }
    return { distanceKm: null, etaMinutes: null, source: "unavailable" };
  }

  if (apiKey) {
    const openRouteServiceEstimate = await estimateWithOpenRouteService(input.origin, destination, apiKey);
    if (openRouteServiceEstimate) return openRouteServiceEstimate;
  }

  const osrmEstimate = await estimateWithOsrm(input.origin, destination);
  if (osrmEstimate) return osrmEstimate;

  if (input.manualDistanceKm && input.manualDistanceKm > 0) {
    return estimateManualTravel(input.manualDistanceKm);
  }

  return { distanceKm: null, etaMinutes: null, source: "unavailable" };
}

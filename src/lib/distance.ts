/**
 * Distance Calculation Utilities using the Haversine Formula
 * Earth radius = 6371 km
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Calculates great-circle distance between two coordinates in kilometers.
 */
export function calculateDistanceKm(
  coord1: LatLng,
  coord2: LatLng
): number {
  if (
    coord1.latitude == null ||
    coord1.longitude == null ||
    coord2.latitude == null ||
    coord2.longitude == null
  ) {
    return Infinity;
  }

  const R = 6371; // Earth's radius in km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats a numeric distance into human-readable representation.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm === Infinity || isNaN(distanceKm)) {
    return '-- km';
  }
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

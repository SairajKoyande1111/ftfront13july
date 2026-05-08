const BASE = "https://nominatim.openstreetmap.org";
const HEADERS = { "Accept-Language": "en", "User-Agent": "FishTokri/1.0" };

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    postcode?: string;
    suburb?: string;
    city_district?: string;
    neighbourhood?: string;
    locality?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
  };
}

export async function nominatimSearch(query: string): Promise<NominatimResult[]> {
  try {
    const url = `${BASE}/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&addressdetails=1&limit=6`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function nominatimReverse(lat: number, lon: number): Promise<NominatimResult | null> {
  try {
    const url = `${BASE}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function extractPincode(result: NominatimResult): string | null {
  return result.address?.postcode ?? null;
}

export function extractAreaName(result: NominatimResult): string {
  const a = result.address;
  return (
    a.suburb ||
    a.city_district ||
    a.neighbourhood ||
    a.locality ||
    a.town ||
    a.village ||
    a.city ||
    a.county ||
    ""
  );
}

export function getResultMainText(result: NominatimResult): string {
  const parts = result.display_name.split(",");
  return parts[0]?.trim() ?? result.display_name;
}

export function getResultSecondaryText(result: NominatimResult): string {
  const parts = result.display_name.split(",");
  return parts.slice(1, 4).join(",").trim();
}

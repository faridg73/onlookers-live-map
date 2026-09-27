/** Built-in coordinates for major US cities so city search still works when map lookups are paused. */
const CITIES: Array<[string, string, number, number]> = [
  ["los angeles", "Los Angeles, CA", 34.0522, -118.2437],
  ["austin", "Austin, TX", 30.2672, -97.7431],
  ["new york", "New York, NY", 40.7128, -74.006],
  ["san francisco", "San Francisco, CA", 37.7749, -122.4194],
  ["san diego", "San Diego, CA", 32.7157, -117.1611],
  ["chicago", "Chicago, IL", 41.8781, -87.6298],
  ["houston", "Houston, TX", 29.7604, -95.3698],
  ["dallas", "Dallas, TX", 32.7767, -96.797],
  ["miami", "Miami, FL", 25.7617, -80.1918],
  ["las vegas", "Las Vegas, NV", 36.1699, -115.1398],
  ["seattle", "Seattle, WA", 47.6062, -122.3321],
  ["atlanta", "Atlanta, GA", 33.749, -84.388],
  ["phoenix", "Phoenix, AZ", 33.4484, -112.074],
  ["denver", "Denver, CO", 39.7392, -104.9903],
  ["boston", "Boston, MA", 42.3601, -71.0589],
  ["nashville", "Nashville, TN", 36.1627, -86.7816],
  ["washington", "Washington, DC", 38.9072, -77.0369],
  ["philadelphia", "Philadelphia, PA", 39.9526, -75.1652],
  ["orlando", "Orlando, FL", 28.5383, -81.3792],
  ["portland", "Portland, OR", 45.5152, -122.6784],
];

export function findKnownCity(query: string) {
  const q = (query.toLowerCase().split(",")[0] ?? "").replace(/\s+/g, " ").trim();
  const hit = CITIES.find(([key]) => key === q);
  return hit ? { label: hit[1], latitude: hit[2], longitude: hit[3] } : null;
}

import { Request, Response } from "express";

/**
 * In-memory cache for reverse geocode results.
 * Key: "lat,lon" (rounded to 4 decimal places), Value: display_name string.
 * This prevents duplicate calls for the same coordinates across page loads.
 */
const geocodeCache = new Map<string, string>();

/**
 * Simple queue to enforce Nominatim's max 1 req/sec policy.
 * Server-side requests don't have CORS issues, and a single queue
 * across all users keeps us within the free tier limits.
 */
let lastRequestTime = 0;

const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const minInterval = 1100; // 1.1 seconds between requests
  if (elapsed < minInterval) {
    await new Promise((r) => setTimeout(r, minInterval - elapsed));
  }
  lastRequestTime = Date.now();
};

export const reverseGeocode = async (req: Request, res: Response) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      res.status(400).json({ message: "lat and lon query parameters are required." });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({ message: "Invalid lat or lon values." });
      return;
    }

    // Round to 4 decimal places for cache key (~11m precision, good enough)
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    // Check cache first
    if (geocodeCache.has(cacheKey)) {
      res.status(200).json({ display_name: geocodeCache.get(cacheKey) });
      return;
    }

    // Wait for rate limit
    await waitForRateLimit();

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "SajiloSahayata/1.0 (sajilo-sahayata emergency app)",
        "Accept-Language": "en",
      },
    });

    if (!response.ok) {
      // If rate limited, return a 503 so the frontend knows to retry later
      if (response.status === 429) {
        res.status(503).json({ message: "Geocoding service temporarily unavailable. Try again later." });
        return;
      }
      res.status(502).json({ message: "Geocoding service returned an error." });
      return;
    }

    const data = await response.json();
    const displayName = data.display_name || "Unknown location";

    // Cache the result
    geocodeCache.set(cacheKey, displayName);

    res.status(200).json({ display_name: displayName });
  } catch (error) {
    console.error("Reverse geocode error:", error);
    res.status(500).json({ message: "Internal server error during geocoding." });
  }
};

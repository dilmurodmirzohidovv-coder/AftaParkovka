import { parkingLots } from "../models/parkingModel.js";
import { getBookedCount } from "../models/bookingModel.js";

const UA = { "User-Agent": "ParkTop/2.0 (local development)" };

export const distanceKm = (aLat, aLng, bLat, bLng) => {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) *
      Math.cos(toRad(bLat)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const geocode = async (q) => {
  const text = String(q || "").trim();

  const coords = text.match(
    /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
  );

  if (coords) {
    const lat = Number(coords[1]);
    const lng = Number(coords[2]);

    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        lat,
        lng,
        displayName: "Sizning joylashuvingiz"
      };
    }
  }

  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1` +
    `&countrycodes=uz&q=${encodeURIComponent(text)}`;

  const response = await fetch(url, { headers: UA });

  if (!response.ok) {
    throw new Error("Geocoding service error");
  }

  const data = await response.json();

  if (!data.length) {
    return null;
  }

  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
    displayName: data[0].display_name
  };
};

export const reverseGeocode = async (lat, lng) => {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${lat}&lon=${lng}`;

  const response = await fetch(url, { headers: UA });

  if (!response.ok) {
    throw new Error("Reverse geocoding service error");
  }

  const data = await response.json();

  return {
    lat,
    lng,
    displayName: data.display_name || `${lat}, ${lng}`
  };
};

// Band qilingan joylar sonini "available" dan ayirib, natijani moslashtiradi.
const applyBookings = (lot) => {
  const booked = getBookedCount(lot.id);
  if (!booked) return { ...lot, booked: 0 };

  const nextAvailable =
    lot.available == null ? null : Math.max(0, lot.available - booked);

  return { ...lot, available: nextAvailable, booked };
};

const dynamicParkings = async (lat, lng) => {
  const query = `
[out:json][timeout:12];
(
  nwr[amenity=parking](around:5000,${lat},${lng});
  nwr[parking=surface](around:5000,${lat},${lng});
);
out center tags;
`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain", ...UA },
    body: query
  });

  if (!response.ok) {
    throw new Error("Parking map service error");
  }

  const data = await response.json();
  const seen = new Set();

  return data.elements
    .map((item, index) => {
      const pLat = item.lat ?? item.center?.lat;
      const pLng = item.lon ?? item.center?.lon;

      if (pLat == null || pLng == null) {
        return null;
      }

      const key = `${Number(pLat).toFixed(5)}:${Number(pLng).toFixed(5)}`;

      if (seen.has(key)) {
        return null;
      }

      seen.add(key);

      const tags = item.tags || {};
      const name =
        tags.name ||
        tags["name:uz"] ||
        tags["name:en"] ||
        `Parkovka #${index + 1}`;

      const capacity = Number(tags.capacity) || 0;
      const feeText = String(tags.fee || "").toLowerCase();

      let price = 0;
      if (/^\d+$/.test(feeText)) {
        price = Number(feeText);
      }

      const lot = {
        id: `osm-${item.type}-${item.id}`,
        name,
        address: tags["addr:street"]
          ? `${tags["addr:street"]} ${tags["addr:housenumber"] || ""}`.trim()
          : "OpenStreetMap hududi",
        lat: Number(pLat),
        lng: Number(pLng),
        total: capacity,
        available: capacity
          ? Math.max(0, Math.floor(capacity * 0.35))
          : null,
        price,
        distance: distanceKm(lat, lng, Number(pLat), Number(pLng)),
        source: "OpenStreetMap"
      };

      return applyBookings(lot);
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 12);
};

export const searchNear = async (lat, lng, displayName) => {
  let results = [];

  try {
    results = await dynamicParkings(lat, lng);
  } catch (error) {
    console.warn("OSM parking ishlamadi:", error.message);
  }

  if (!results.length) {
    results = parkingLots
      .map((parking) =>
        applyBookings({
          ...parking,
          distance: distanceKm(lat, lng, parking.lat, parking.lng),
          source: "ParkTop demo"
        })
      )
      .sort((a, b) => a.distance - b.distance);
  }

  return {
    destination: { lat, lng, displayName },
    parkings: results
  };
};

export const findParkingsByQuery = async (q) => {
  const destination = await geocode(q);
  if (!destination) return null;
  return searchNear(destination.lat, destination.lng, destination.displayName);
};

export const calculateRoute = async (fromLat, fromLng, toLat, toLng) => {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url, { headers: UA });

  if (!response.ok) {
    throw new Error("Route service error");
  }

  const data = await response.json();

  if (!data.routes?.length) {
    return null;
  }

  const route = data.routes[0];

  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
  };
};

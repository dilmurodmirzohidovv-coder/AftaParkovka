import { parkingLots } from "../models/parkingModel.js";
import {
  createBooking,
  cancelBooking,
  getUserBookings,
  BOOKING_TTL_MINUTES
} from "../models/bookingModel.js";
import {
  geocode,
  searchNear,
  findParkingsByQuery,
  calculateRoute
} from "../services/parkingService.js";

export const getParkings = (_req, res) => {
  res.json(parkingLots);
};

export const autocomplete = async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (q.length < 2) {
    return res.json([]);
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6` +
      `&addressdetails=1&countrycodes=uz&q=${encodeURIComponent(q)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "ParkTop/2.0 (local development)"
      }
    });

    if (!response.ok) {
      throw new Error("Geocoding service error");
    }

    const data = await response.json();

    const suggestions = data.map((item) => ({
      lat: Number(item.lat),
      lng: Number(item.lon),
      displayName: item.display_name,
      label: item.display_name
    }));

    return res.json(suggestions);
  } catch (error) {
    console.warn("AUTOCOMPLETE ERROR:", error.message);
    return res.json([]);
  }
};

export const searchParkings = async (req, res) => {
  const q = String(req.query.q || "").trim();

  if (!q) {
    return res.status(400).json({ message: "Manzil kiriting" });
  }

  try {
    const destination = await geocode(q);

    if (!destination) {
      return res.status(404).json({
        message:
          "Manzil topilmadi. Masalan: Tashkent City deb yozib ko‘ring."
      });
    }

    const result = await searchNear(
      destination.lat,
      destination.lng,
      destination.displayName
    );

    return res.json(result);
  } catch (error) {
    console.error("SEARCH ERROR:", error);
    return res.status(502).json({
      message:
        "Manzil yoki parkovkalarni xaritadan olishda xatolik. Internetni tekshirib qayta urinib ko‘ring."
    });
  }
};

export const getRoute = async (req, res) => {
  const fromLat = Number(req.query.fromLat);
  const fromLng = Number(req.query.fromLng);
  const toLat = Number(req.query.toLat);
  const toLng = Number(req.query.toLng);

  const values = [fromLat, fromLng, toLat, toLng];

  if (
    !values.every(Number.isFinite) ||
    fromLat < -90 ||
    fromLat > 90 ||
    toLat < -90 ||
    toLat > 90 ||
    fromLng < -180 ||
    fromLng > 180 ||
    toLng < -180 ||
    toLng > 180
  ) {
    return res.status(400).json({
      message: "Koordinatalar noto‘g‘ri"
    });
  }

  try {
    const route = await calculateRoute(fromLat, fromLng, toLat, toLng);

    if (!route) {
      return res.status(404).json({
        message: "Yo‘l topilmadi"
      });
    }

    return res.json(route);
  } catch (error) {
    console.error("ROUTE ERROR:", error);
    return res.status(502).json({
      message: "Yo‘lni hisoblashda xatolik"
    });
  }
};

// --- Band qilish (booking) — veb-sayt va Telegram bot ikkalasi ham shu orqali ishlaydi ---

export const bookParking = (req, res) => {
  const { parkingId, total, name, address, telegramUserId, telegramChatId } =
    req.body || {};

  if (!parkingId) {
    return res.status(400).json({ message: "parkingId talab qilinadi" });
  }

  const result = createBooking({
    parkingId,
    total,
    name,
    address,
    telegramUserId,
    telegramChatId
  });

  if (!result.ok) {
    return res.status(409).json({
      message: "Afsuski, bu parkovkada bo‘sh joy qolmadi"
    });
  }

  return res.status(201).json({
    message: "Joy band qilindi",
    booking: result.booking,
    ttlMinutes: BOOKING_TTL_MINUTES
  });
};

export const cancelBookingController = (req, res) => {
  const { bookingId, telegramUserId } = req.body || {};

  if (!bookingId) {
    return res.status(400).json({ message: "bookingId talab qilinadi" });
  }

  const ok = cancelBooking(bookingId, telegramUserId);

  if (!ok) {
    return res.status(404).json({ message: "Band qilish topilmadi" });
  }

  return res.json({ message: "Band qilish bekor qilindi" });
};

export const myBookings = (req, res) => {
  const telegramUserId = req.query.telegramUserId;

  if (!telegramUserId) {
    return res.status(400).json({ message: "telegramUserId talab qilinadi" });
  }

  return res.json(getUserBookings(telegramUserId));
};

export { findParkingsByQuery };

// Oddiy xotiradagi (in-memory) booking do'koni.
// Telegram bot orqali band qilingan joylar shu yerda saqlanadi va
// veb-sayt qidiruv natijalarida "available" sonini kamaytirish uchun ishlatiladi.

const BOOKING_TTL_MINUTES = 60; // band qilish shu daqiqadan keyin avtomatik bo'shaydi

const bookingsByParking = new Map(); // parkingId -> [{ id, ... }]

const now = () => Date.now();

function pruneExpired(parkingId) {
  const key = String(parkingId);
  const list = bookingsByParking.get(key);
  if (!list) return [];
  const active = list.filter((b) => b.expiresAt > now());
  if (active.length !== list.length) {
    if (active.length) bookingsByParking.set(key, active);
    else bookingsByParking.delete(key);
  }
  return active;
}

export function getActiveBookings(parkingId) {
  return pruneExpired(parkingId);
}

export function getBookedCount(parkingId) {
  return getActiveBookings(parkingId).length;
}

export function createBooking({ parkingId, total, name, address, telegramUserId, telegramChatId }) {
  if (!parkingId) return { ok: false, reason: "missing_id" };

  const key = String(parkingId);
  const active = pruneExpired(key);
  const capacity = Number(total) || 0;

  if (capacity > 0 && active.length >= capacity) {
    return { ok: false, reason: "full" };
  }

  const booking = {
    id: `bk_${key}_${now()}_${Math.random().toString(36).slice(2, 8)}`,
    parkingId: key,
    name: name || null,
    address: address || null,
    telegramUserId: telegramUserId ? String(telegramUserId) : null,
    telegramChatId: telegramChatId ? String(telegramChatId) : null,
    createdAt: now(),
    expiresAt: now() + BOOKING_TTL_MINUTES * 60 * 1000
  };

  const list = bookingsByParking.get(key) || [];
  list.push(booking);
  bookingsByParking.set(key, list);

  return { ok: true, booking };
}

export function cancelBooking(bookingId, telegramUserId) {
  for (const [key, list] of bookingsByParking.entries()) {
    const idx = list.findIndex(
      (b) => b.id === bookingId && (!telegramUserId || b.telegramUserId === String(telegramUserId))
    );
    if (idx !== -1) {
      list.splice(idx, 1);
      if (list.length) bookingsByParking.set(key, list);
      else bookingsByParking.delete(key);
      return true;
    }
  }
  return false;
}

export function getUserBookings(telegramUserId) {
  const uid = String(telegramUserId);
  const result = [];
  for (const key of bookingsByParking.keys()) {
    for (const b of pruneExpired(key)) {
      if (b.telegramUserId === uid) result.push(b);
    }
  }
  return result.sort((a, b) => a.createdAt - b.createdAt);
}

export { BOOKING_TTL_MINUTES };

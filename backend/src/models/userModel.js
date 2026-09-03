// Oddiy xotiradagi (in-memory) foydalanuvchilar do'koni.
export const users = [];

// Har bir muvaffaqiyatli login shu yerga +1 qo'shiladi.
// Admin panelda "jami loginlar soni" shundan olinadi.
let totalLogins = 0;

export function incrementTotalLogins() {
  totalLogins += 1;
  return totalLogins;
}

export function getTotalLogins() {
  return totalLogins;
}

// --- Telegram bog'lash ---
// Har bir user'da telegramId (Telegram foydalanuvchi ID'si) saqlanadi.
// Bot orqali email/parol bilan login qilganda shu ID akkauntga bog'lanadi.

export function findUserByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  return users.find((u) => u.email === normalized);
}

export function findUserByTelegramId(telegramId) {
  const id = String(telegramId);
  return users.find((u) => u.telegramId === id);
}

// userId'ga telegramId'ni bog'laydi. Agar shu telegramId boshqa akkauntga
// bog'langan bo'lsa, avval o'shandan yechib olinadi (bir vaqtda faqat bitta
// akkauntga bog'liq bo'lishi uchun).
export function linkTelegram(userId, telegramId, telegramMeta = {}) {
  const id = String(telegramId);
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

  users.forEach((u) => {
    if (u.telegramId === id && u.id !== userId) {
      u.telegramId = null;
      u.telegramUsername = null;
    }
  });

  user.telegramId = id;
  user.telegramUsername = telegramMeta.username || null;
  user.telegramLinkedAt = new Date().toISOString();
  return user;
}

export function unlinkTelegram(telegramId) {
  const user = findUserByTelegramId(telegramId);
  if (!user) return null;
  user.telegramId = null;
  user.telegramUsername = null;
  user.telegramLinkedAt = null;
  return user;
}

export function deleteUserById(id) {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
}

export function renameUserById(id, name) {
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  user.name = String(name).trim();
  return user;
}

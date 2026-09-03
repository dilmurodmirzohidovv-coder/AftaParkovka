import { users, getTotalLogins, deleteUserById, renameUserById } from "../models/userModel.js";
import { getUserBookings } from "../models/bookingModel.js";

// Joriy tizimga kirgan foydalanuvchi ma'lumoti (token orqali) — sahifa
// yangilanganda frontend shu orqali kim kirganini va rolini bilib oladi.
export const getMe = (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
  }
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
};

// Faqat admin uchun: barcha foydalanuvchilar ro'yxati + statistika.
export const getAdminStats = (_req, res) => {
  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalLogins = getTotalLogins();

  const list = [...users]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((u) => {
      // Bu foydalanuvchi Telegram bot orqali biror joy band qilganmi?
      const activeBookings = u.telegramId ? getUserBookings(u.telegramId) : [];

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount || 0,
        telegramLinked: Boolean(u.telegramId),
        telegramUsername: u.telegramUsername || null,
        telegramBookings: activeBookings.map((b) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          expiresAt: b.expiresAt
        }))
      };
    });

  return res.json({
    totalUsers,
    totalAdmins,
    totalLogins,
    users: list
  });
};

// Faqat admin uchun: foydalanuvchi ismini o'zgartirish.
export const renameUser = (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name || "").trim();

  if (!name) {
    return res.status(400).json({ message: "Ism bo'sh bo'lishi mumkin emas" });
  }

  const user = renameUserById(id, name);
  if (!user) {
    return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
  }

  return res.json({
    message: "Ism yangilandi",
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
};

// Faqat admin uchun: foydalanuvchini o'chirish.
export const deleteUser = (req, res) => {
  const id = Number(req.params.id);

  if (req.user?.id === id) {
    return res.status(400).json({ message: "O'zingizni o'chira olmaysiz" });
  }

  const ok = deleteUserById(id);
  if (!ok) {
    return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
  }

  return res.json({ message: "Foydalanuvchi o'chirildi" });
};

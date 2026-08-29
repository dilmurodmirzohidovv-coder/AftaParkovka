import bcrypt from "bcryptjs";
import { users } from "../models/userModel.js";

export const signup = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    // Rol faqat so'rov tanasida aniq "admin" deb yuborilgandagina admin bo'ladi.
    // Saytdagi oddiy signup formasi bu maydonni umuman yubormaydi, shuning
    // uchun u yerdan kirganlar har doim oddiy "user" bo'lib qoladi.
    // Admin yaratish uchun Postman orqali: { "role": "admin", ... }
    const requestedRole = String(req.body?.role || "").trim().toLowerCase();
    const role = requestedRole === "admin" ? "admin" : "user";

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Barcha maydonlarni to‘ldiring" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ message: "Email noto‘g‘ri" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Parol kamida 6 ta belgidan iborat bo‘lsin" });
    }

    if (users.some((u) => u.email === email)) {
      return res.status(409).json({ message: "Bu email mavjud" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      id: users.length + 1,
      name,
      email,
      password: passwordHash,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      loginCount: 0
    };

    users.push(user);

    return res.status(201).json({
      message: "Ro‘yxatdan o‘tildi",
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("SIGNUP ERROR:", error);
    return res.status(500).json({ message: "Ro‘yxatdan o‘tishda xatolik" });
  }
};

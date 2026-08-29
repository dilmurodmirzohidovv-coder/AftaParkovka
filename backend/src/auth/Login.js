import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { users, incrementTotalLogins } from "../models/userModel.js";

export const login = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email va parolni kiriting" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET .env da sozlanmagan" });
    }

    const user = users.find((u) => u.email === email);

    if (!user) {
      return res.status(401).json({ message: "Email yoki parol noto‘g‘ri" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: "Email yoki parol noto‘g‘ri" });
    }

    // Login statistikasi — admin panelda ko'rsatish uchun
    user.lastLoginAt = new Date().toISOString();
    user.loginCount = (user.loginCount || 0) + 1;
    incrementTotalLogins();

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      message: "Login muvaffaqiyatli",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Login vaqtida xatolik" });
  }
};

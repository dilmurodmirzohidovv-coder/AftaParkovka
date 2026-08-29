import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import parkingRoute from "../routes/parkingRoute.js";
import categoryRoute from "../routes/categoryRoute.js";
import userRoute from "../routes/userRoute.js";
import { startBot } from "../bot/bot.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "ParkTop backend ishlayapti",
    health: "/api/health"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Backend ishlayapti" });
});

app.use("/api/parking", parkingRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/users", userRoute);

app.use((_req, res) => {
  res.status(404).json({ message: "Endpoint topilmadi" });
});

app.use((err, _req, res, _next) => {
  console.error("SERVER ERROR:", err);
  res.status(500).json({ message: "Serverda xatolik yuz berdi" });
});

app.listen(PORT, () => {
  console.log(`\n🚗 ParkTop backend ishga tushdi`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`❤️  http://localhost:${PORT}/api/health\n`);

  startBot();
});

import TelegramBot from "node-telegram-bot-api";
import {
  findParkingsByQuery,
  searchNear,
  reverseGeocode
} from "../services/parkingService.js";
import {
  createBooking,
  cancelBooking,
  getUserBookings,
  BOOKING_TTL_MINUTES
} from "../models/bookingModel.js";

// Har bir chat uchun oxirgi qidiruv natijalarini saqlab turamiz,
// shunda tugma bosilganda qaysi parkovka tanlanganini bilamiz.
const sessions = new Map(); // chatId -> { parkings: [...] }

const escapeMd = (text = "") =>
  String(text).replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");

const lotMessage = (lot, index) => {
  const avail = lot.available == null ? "—" : lot.available;
  const total = lot.total || "—";
  const priceLine = lot.price
    ? `\n💵 ${Number(lot.price).toLocaleString()} so‘m/soat`
    : "";
  const distLine =
    lot.distance != null ? ` · ${lot.distance.toFixed(2)} km` : "";
  const bookedLine = lot.booked
    ? `\n🔒 Botda ${lot.booked} ta joy band qilingan`
    : "";

  return (
    `${index + 1}. 🅿️ *${escapeMd(lot.name)}*\n` +
    `📍 ${escapeMd(lot.address)}\n` +
    `🚗 ${avail}/${total} joy bo‘sh${distLine}${priceLine}${bookedLine}`
  );
};

const isFull = (lot) =>
  (lot.total || 0) > 0 && (lot.available == null ? false : lot.available <= 0);

async function runSearch(bot, chatId, fetcher) {
  const waitMsg = await bot.sendMessage(chatId, "🔎 Qidirilmoqda...");

  let result;
  try {
    result = await fetcher();
  } catch (error) {
    console.error("BOT SEARCH ERROR:", error.message);
    return bot
      .editMessageText(
        "Xatolik yuz berdi. Birozdan so‘ng qayta urinib ko‘ring.",
        { chat_id: chatId, message_id: waitMsg.message_id }
      )
      .catch(() => {});
  }

  if (!result) {
    return bot.editMessageText(
      "Manzil topilmadi. Masalan: *Tashkent City* deb yozib ko‘ring.",
      {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown"
      }
    );
  }

  const parkings = (result.parkings || []).slice(0, 6);
  sessions.set(chatId, { parkings });

  await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

  if (!parkings.length) {
    return bot.sendMessage(chatId, "Bu hududda parkovka topilmadi.");
  }

  await bot.sendMessage(
    chatId,
    `📍 *${escapeMd(result.destination.displayName)}*\nYaqin atrofdagi parkovkalar:`,
    { parse_mode: "Markdown" }
  );

  for (let i = 0; i < parkings.length; i++) {
    const lot = parkings[i];
    const full = isFull(lot);

    await bot.sendMessage(chatId, lotMessage(lot, i), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            full
              ? { text: "🔴 Joy yo‘q", callback_data: "noop" }
              : { text: "✅ Band qilish", callback_data: `book:${i}` }
          ]
        ]
      }
    });
  }
}

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.warn(
      "⚠️  TELEGRAM_BOT_TOKEN topilmadi — .env fayliga qo‘shing, bot ishga tushmaydi."
    );
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  bot.setMyCommands([
    { command: "start", description: "Botni boshlash" },
    { command: "mybookings", description: "Mening band qilganlarim" },
    { command: "help", description: "Yordam" }
  ]);

  bot.onText(/^\/start/, (msg) => {
    sessions.delete(msg.chat.id);
    bot.sendMessage(
      msg.chat.id,
      "🚗 *ParkTop botiga xush kelibsiz!*\n\n" +
        "Manzil yozing (masalan: _Tashkent City_) yoki pastdagi tugma orqali " +
        "joylashuvingizni yuboring — yaqin atrofdagi parkovkalarni topib beraman. " +
        "Tanlagan parkovkangizni bitta tugma bosish bilan band qilasiz.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [
            [{ text: "📍 Joylashuvimni yuborish", request_location: true }]
          ],
          resize_keyboard: true
        }
      }
    );
  });

  bot.onText(/^\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      "Manzil yozing yoki joylashuvingizni yuboring. Ro‘yxatdan parkovkani tanlab, " +
        "“✅ Band qilish” tugmasini bosing. Band qilish taxminan " +
        `${BOOKING_TTL_MINUTES} daqiqa davomida saqlanadi.\n\n` +
        "/mybookings — hozirgi band qilishlaringizni ko‘rish"
    );
  });

  bot.onText(/^\/mybookings/, (msg) => {
    const list = getUserBookings(msg.from.id);

    if (!list.length) {
      return bot.sendMessage(msg.chat.id, "Sizda hozircha band qilingan joy yo‘q.");
    }

    list.forEach((b) => {
      const minsLeft = Math.max(0, Math.round((b.expiresAt - Date.now()) / 60000));
      bot.sendMessage(
        msg.chat.id,
        `🅿️ *${escapeMd(b.name || "Parkovka")}*\n` +
          `📍 ${escapeMd(b.address || "")}\n` +
          `⏳ ${minsLeft} daqiqa qoldi`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ Bekor qilish", callback_data: `cancel:${b.id}` }]
            ]
          }
        }
      );
    });
  });

  bot.on("location", async (msg) => {
    const { latitude, longitude } = msg.location;
    await runSearch(bot, msg.chat.id, async () => {
      const place = await reverseGeocode(latitude, longitude);
      return searchNear(latitude, longitude, place.displayName);
    });
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/") || msg.location) return;
    await runSearch(bot, msg.chat.id, () => findParkingsByQuery(msg.text.trim()));
  });

  bot.on("callback_query", async (query) => {
    const data = query.data || "";
    const chatId = query.message.chat.id;

    if (data === "noop") {
      return bot.answerCallbackQuery(query.id);
    }

    if (data.startsWith("book:")) {
      const index = Number(data.slice(5));
      const session = sessions.get(chatId);
      const lot = session?.parkings?.[index];

      if (!lot) {
        return bot.answerCallbackQuery(query.id, {
          text: "Bu qidiruv eskirgan, qaytadan manzil yozing.",
          show_alert: true
        });
      }

      const result = createBooking({
        parkingId: lot.id,
        total: lot.total,
        name: lot.name,
        address: lot.address,
        telegramUserId: query.from.id,
        telegramChatId: chatId
      });

      if (!result.ok) {
        return bot.answerCallbackQuery(query.id, {
          text: "Afsuski, bu yerda bo‘sh joy qolmadi.",
          show_alert: true
        });
      }

      await bot.answerCallbackQuery(query.id, { text: "✅ Joy band qilindi!" });

      await bot
        .editMessageText(
          `✅ *Band qilindi!*\n` +
            `🅿️ ${escapeMd(lot.name)}\n` +
            `📍 ${escapeMd(lot.address)}\n` +
            `⏳ ${BOOKING_TTL_MINUTES} daqiqa ushlab turiladi.\n\n` +
            `Saytda ham bu joy endi band ko‘rinadi.`,
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "❌ Bekor qilish", callback_data: `cancel:${result.booking.id}` }]
              ]
            }
          }
        )
        .catch(() => {});

      return;
    }

    if (data.startsWith("cancel:")) {
      const bookingId = data.slice(7);
      const ok = cancelBooking(bookingId, query.from.id);

      await bot.answerCallbackQuery(query.id, {
        text: ok ? "Bekor qilindi" : "Topilmadi yoki muddati o‘tgan"
      });

      if (ok) {
        await bot
          .editMessageText("❌ Band qilish bekor qilindi.", {
            chat_id: chatId,
            message_id: query.message.message_id
          })
          .catch(() => {});
      }

      return;
    }
  });

  bot.on("polling_error", (err) => {
    console.error("TELEGRAM BOT POLLING ERROR:", err.message);
  });

  console.log("🤖 ParkTop Telegram bot ishga tushdi");
  return bot;
}

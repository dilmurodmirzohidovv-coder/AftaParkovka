import bcrypt from "bcryptjs";
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
import {
  findUserByEmail,
  findUserByTelegramId,
  linkTelegram,
  unlinkTelegram
} from "../models/userModel.js";

// Har bir chat uchun holatni saqlaymiz: oxirgi qidiruv natijalari va
// login jarayonining bosqichi (email so'ralyaptimi, parol so'ralyaptimi).
const sessions = new Map(); // chatId -> { parkings, stage, pendingEmail }

const getSession = (chatId) => {
  if (!sessions.has(chatId)) sessions.set(chatId, {});
  return sessions.get(chatId);
};

const resetAuthStage = (chatId) => {
  const session = getSession(chatId);
  session.stage = null;
  session.pendingEmail = null;
};

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

// --- Login gate ---
// Qidiruvdan foydalanishdan oldin Telegram akkaunti saytdagi akkauntga
// bog'langan bo'lishi kerak. Bog'lanmagan bo'lsa shu ekran chiqadi.

const AUTH_GATE_KEYBOARD = {
  inline_keyboard: [
    [{ text: "🔑 Kirish", callback_data: "auth:login" }],
    [{ text: "📝 Ro‘yxatdan o‘tish", callback_data: "auth:signup" }]
  ]
};

async function sendAuthGate(bot, chatId, note) {
  resetAuthStage(chatId);
  const prefix = note ? `${note}\n\n` : "";
  await bot.sendMessage(
    chatId,
    `${prefix}🔒 Qidirishdan oldin akkauntingizga kiring.\n\n` +
      "Agar saytda ro‘yxatdan o‘tgan bo‘lsangiz — *Kirish* tugmasini bosing.\n" +
      "Agar hali akkauntingiz bo‘lmasa — *Ro‘yxatdan o‘tish* tugmasini bosing.",
    { parse_mode: "Markdown", reply_markup: AUTH_GATE_KEYBOARD }
  );
}

function getLoggedInUser(fromId) {
  return findUserByTelegramId(fromId);
}

// Har bir himoyalangan amaldan oldin chaqiriladi. Agar login qilinmagan
// bo'lsa, login ekranini ko'rsatib false qaytaradi.
async function requireLogin(bot, msg) {
  const user = getLoggedInUser(msg.from.id);
  if (user) return user;
  await sendAuthGate(bot, msg.chat.id);
  return null;
}

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
  getSession(chatId).parkings = parkings;

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

  const siteUrl = process.env.SITE_URL || "";

  const bot = new TelegramBot(token, { polling: true });

  bot.setMyCommands([
    { command: "start", description: "Botni boshlash" },
    { command: "login", description: "Akkauntga kirish" },
    { command: "logout", description: "Akkauntdan chiqish" },
    { command: "mybookings", description: "Mening band qilganlarim" },
    { command: "help", description: "Yordam" }
  ]);

  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    sessions.set(chatId, {});

    const user = getLoggedInUser(msg.from.id);

    if (user) {
      await bot.sendMessage(
        chatId,
        `🚗 *ParkTop botiga xush kelibsiz, ${escapeMd(user.name)}!*\n\n` +
          "Manzil yozing (masalan: _Tashkent City_) yoki pastdagi tugma orqali " +
          "joylashuvingizni yuboring — yaqin atrofdagi parkovkalarni topib beraman.",
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
      return;
    }

    await sendAuthGate(
      bot,
      chatId,
      "🚗 *ParkTop botiga xush kelibsiz!*"
    );
  });

  bot.onText(/^\/login/, async (msg) => {
    const user = getLoggedInUser(msg.from.id);
    if (user) {
      return bot.sendMessage(msg.chat.id, `Siz allaqachon *${escapeMd(user.name)}* sifatida kirgansiz.`, {
        parse_mode: "Markdown"
      });
    }
    await sendAuthGate(bot, msg.chat.id);
  });

  bot.onText(/^\/logout/, (msg) => {
    const chatId = msg.chat.id;
    const user = getLoggedInUser(msg.from.id);
    if (!user) {
      return bot.sendMessage(chatId, "Siz hozir hech qanday akkauntga kirmagansiz.");
    }
    unlinkTelegram(msg.from.id);
    sessions.set(chatId, {});
    bot.sendMessage(chatId, "✅ Akkauntdan chiqdingiz. Qayta kirish uchun /login yuboring.");
  });

  bot.onText(/^\/help/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      "Qidirishdan oldin /login orqali saytdagi akkauntingizga kiring.\n\n" +
        "Keyin manzil yozing yoki joylashuvingizni yuboring. Ro‘yxatdan parkovkani tanlab, " +
        "“✅ Band qilish” tugmasini bosing. Band qilish taxminan " +
        `${BOOKING_TTL_MINUTES} daqiqa davomida saqlanadi.\n\n` +
        "/mybookings — hozirgi band qilishlaringizni ko‘rish\n" +
        "/logout — akkauntdan chiqish"
    );
  });

  bot.onText(/^\/mybookings/, async (msg) => {
    const user = await requireLogin(bot, msg);
    if (!user) return;

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
    const user = await requireLogin(bot, msg);
    if (!user) return;

    const { latitude, longitude } = msg.location;
    await runSearch(bot, msg.chat.id, async () => {
      const place = await reverseGeocode(latitude, longitude);
      return searchNear(latitude, longitude, place.displayName);
    });
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/") || msg.location) return;

    const chatId = msg.chat.id;
    const session = getSession(chatId);

    // --- Login jarayoni davom etayotgan bo'lsa, matnni shu yerda ishlaymiz ---
    if (session.stage === "await_email") {
      const email = msg.text.trim().toLowerCase();

      if (!email.includes("@") || !email.includes(".")) {
        return bot.sendMessage(chatId, "Email noto‘g‘ri ko‘rinyapti. Qaytadan kiriting:");
      }

      const existing = findUserByEmail(email);
      if (!existing) {
        resetAuthStage(chatId);
        return sendAuthGate(
          bot,
          chatId,
          "Bunday email bilan akkaunt topilmadi. Avval saytda ro‘yxatdan o‘ting."
        );
      }

      session.pendingEmail = email;
      session.stage = "await_password";
      return bot.sendMessage(chatId, "🔑 Endi parolingizni yuboring:");
    }

    if (session.stage === "await_password") {
      const password = msg.text;
      const email = session.pendingEmail;

      // Maxfiylik uchun parol yozilgan xabarni chatdan o'chirib yuboramiz.
      bot.deleteMessage(chatId, msg.message_id).catch(() => {});

      const user = findUserByEmail(email);
      const validPassword =
        user && (await bcrypt.compare(password, user.password).catch(() => false));

      if (!user || !validPassword) {
        resetAuthStage(chatId);
        await bot.sendMessage(chatId, "❌ Email yoki parol noto‘g‘ri. Qaytadan urinib ko‘ring: /login");
        return;
      }

      linkTelegram(user.id, msg.from.id, { username: msg.from.username });
      resetAuthStage(chatId);

      await bot.sendMessage(
        chatId,
        `✅ *Xush kelibsiz, ${escapeMd(user.name)}!* Akkauntingiz shu Telegram bilan bog‘landi.\n\n` +
          "Endi manzil yozing yoki joylashuvingizni yuboring.",
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
      return;
    }

    // --- Login qilingan bo'lsa, matn qidiruv so'rovi sifatida ishlanadi ---
    const user = await requireLogin(bot, msg);
    if (!user) return;

    await runSearch(bot, chatId, () => findParkingsByQuery(msg.text.trim()));
  });

  bot.on("callback_query", async (query) => {
    const data = query.data || "";
    const chatId = query.message.chat.id;

    if (data === "noop") {
      return bot.answerCallbackQuery(query.id);
    }

    if (data === "auth:login") {
      await bot.answerCallbackQuery(query.id);
      const session = getSession(chatId);
      session.stage = "await_email";
      session.pendingEmail = null;
      return bot.sendMessage(chatId, "📧 Saytda ro‘yxatdan o‘tgan emailingizni yuboring:");
    }

    if (data === "auth:signup") {
      await bot.answerCallbackQuery(query.id);
      const link = siteUrl ? `\n\n${siteUrl}` : "";
      return bot.sendMessage(
        chatId,
        "Saytda hali akkauntingiz yo‘q ekan. Avval saytga kirib ro‘yxatdan o‘ting, " +
          `so‘ng shu yerga qaytib /login yuboring.${link}`
      );
    }

    if (data.startsWith("book:")) {
      const user = getLoggedInUser(query.from.id);
      if (!user) {
        await bot.answerCallbackQuery(query.id, {
          text: "Avval akkauntingizga kiring: /login",
          show_alert: true
        });
        return sendAuthGate(bot, chatId);
      }

      const index = Number(data.slice(5));
      const session = getSession(chatId);
      const lot = session.parkings?.[index];

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

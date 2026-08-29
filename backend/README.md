# ParkTop Backend

## Ishga tushirish

Terminalni loyiha ildizida oching:

```bash
npm install
npm --prefix backend install
npm run dev
```

Yoki `backend` papkasiga kirib:

```bash
cd backend
npm install
npm run dev
```

Server:

- http://localhost:5000
- http://localhost:5000/api/health

## API

- GET `/api/health`
- GET `/api/parking`
- GET `/api/parking/search?q=Tashkent%20City`
- GET `/api/parking/autocomplete?q=Tashkent`
- GET `/api/parking/route?fromLat=41.31&fromLng=69.24&toLat=41.28&toLng=69.20`
- POST `/api/parking/book` — `{ parkingId, total, name, address, telegramUserId, telegramChatId }`
- POST `/api/parking/book/cancel` — `{ bookingId, telegramUserId }`
- GET `/api/parking/book/mine?telegramUserId=...`
- GET `/api/categories`
- POST `/api/users/signup`
- POST `/api/users/login`

## Telegram bot

Sayt bilan bir xil parkovka ma'lumotlaridan foydalanadigan Telegram bot ham shu backendga qo'shilgan (`src/bot/bot.js`). Foydalanuvchi botga manzil yozadi yoki joylashuvini yuboradi, ro'yxatdan parkovkani tanlab "✅ Band qilish" tugmasini bosadi — shu zahoti sayt qidiruvida ham o'sha joy band bo'lib ko'rinadi (`available` soni kamayadi).

Ishga tushirish:

1. Telegram'da [@BotFather](https://t.me/BotFather) bilan yangi bot yarating, tokenni oling.
2. `backend/.env` faylida `TELEGRAM_BOT_TOKEN` ga shu tokenni yozing.
3. `frontend/.env` faylida `VITE_TELEGRAM_BOT_USERNAME` ga botning `@`siz username'ini yozing (masalan `parktop_bot`) — shunda saytdagi "Telegram orqali band qilish" tugmasi to'g'ri manzilga olib boradi.
4. Backendni oddiy `npm run dev` bilan ishga tushirsangiz bot ham avtomatik ulanadi (konsolda `🤖 ParkTop Telegram bot ishga tushdi` chiqadi).

Band qilish 60 daqiqa davomida amal qiladi (`backend/src/models/bookingModel.js` ichidagi `BOOKING_TTL_MINUTES`), shundan keyin joy avtomatik bo'shaydi. Bot komandalari: `/start`, `/mybookings`, `/help`.

Eslatma: band qilishlar hozircha RAM'da saqlanadi (server qayta ishga tushsa tozalanadi), userlar bilan bir xil holatda.

## Muhim

Userlar hozircha RAM (`users` array) ichida saqlanadi. Server qayta ishga tushsa userlar o‘chadi. Keyingi bosqichda MongoDB ulash mumkin.

Backend Node.js 18+ talab qiladi, chunki native `fetch` ishlatilgan.

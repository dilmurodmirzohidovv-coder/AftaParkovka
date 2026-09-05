const API = import.meta.env.VITE_API_URL || 'https://aftaparkovka.onrender.com';
const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';

function getToken() {
  return localStorage.getItem('parktop_token') || '';
}

async function request(url, options) {
  const r = await fetch(url, options);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || 'Serverda xatolik yuz berdi');
  return d;
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function searchParking(q) { return request(`${API}/parking/search?q=${encodeURIComponent(q)}`); }
export async function autocompleteAddress(q) { return request(`${API}/parking/autocomplete?q=${encodeURIComponent(q)}`); }
export async function getRoute(from, to) { return request(`${API}/parking/route?fromLat=${from.lat}&fromLng=${from.lng}&toLat=${to.lat}&toLng=${to.lng}`); }
export async function getParkings() { return request(`${API}/parking`); }

export function getTelegramBotLink() {
  return TELEGRAM_BOT_USERNAME ? `https://t.me/${TELEGRAM_BOT_USERNAME}` : null;
}

// --- Auth ---

export async function signupRequest({ name, email, password }) {
  return request(`${API}/users/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Diqqat: role ataylab yuborilmaydi — saytdan ro'yxatdan o'tgan har kim
    // avtomatik ravishda oddiy "user" bo'ladi. Admin faqat Postman orqali
    // role: "admin" yuborilganda yaratiladi.
    body: JSON.stringify({ name, email, password })
  });
}

export async function loginRequest({ email, password }) {
  return request(`${API}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
}

export async function fetchMe() {
  return request(`${API}/users/me`, { headers: { ...authHeaders() } });
}

export async function fetchAdminStats() {
  return request(`${API}/users/admin/stats`, { headers: { ...authHeaders() } });
}

export async function renameUserAdmin(id, name) {
  return request(`${API}/users/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name })
  });
}

export async function deleteUserAdmin(id) {
  return request(`${API}/users/admin/users/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() }
  });
}

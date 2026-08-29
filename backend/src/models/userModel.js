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

import { all, get, put } from "./db.js";

const SESSION_KEY = "smk-pasundan-session";

export function currentUser() {
  try {
    const s = sessionStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
export function saveSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function login(username, password) {
  const users = await all("users");
  const u = users.find(
    (x) => x.username.toLowerCase() === String(username).trim().toLowerCase() && x.password === password
  );
  if (!u) return { ok: false, msg: "Username atau password salah." };
  return { ok: true, user: { id: u.id, username: u.username, role: u.role, nama: u.nama, kelasId: u.kelasId, nis: u.nis, guruId: u.guruId } };
}

export async function changePassword(userId, oldPw, newPw) {
  const u = await get("users", userId);
  if (!u) return { ok: false, msg: "Akun tidak ditemukan." };
  if (u.password !== oldPw) return { ok: false, msg: "Password lama salah." };
  u.password = newPw;
  await put("users", u);
  return { ok: true };
}

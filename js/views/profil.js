import { all } from "../db.js";
import { currentUser, changePassword, clearSession } from "../auth.js";
import { ic, esc, toast, initials, openModal, closeModal, $, router } from "../utils.js";

export async function render() {
  const user = currentUser();
  const [kelasList] = await Promise.all([all("kelas")]);
  const kelas = kelasList.find((k) => k.id === user.kelasId);
  const roleLabel = { admin: "Administrator", guru: "Guru", siswa: "Siswa" }[user.role];

  const adminCard = user.role === "admin"
    ? `<button class="card row-item clickable" data-go="kelola" style="width:100%;text-align:left">
        <div class="av av-blue">${ic("settings")}</div>
        <div class="row-body"><div class="row-title">Kelola Data</div>
        <div class="row-sub">Siswa, guru, kelas, mapel, pengguna, jam sekolah</div></div>
        <div class="row-right">${ic("chev")}</div>
      </button>`
    : "";

  return `
    <div class="profile-head">
      <div class="profile-av">${initials(user.nama)}</div>
      <div style="font-size:18px;font-weight:800">${esc(user.nama)}</div>
      <div class="small" style="opacity:.85">@${esc(user.username)}</div>
      <div class="badge-role">${roleLabel}</div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="kv"><div class="k">Peran</div><div class="v">${roleLabel}</div></div>
      ${user.role === "siswa" ? `<div class="kv"><div class="k">NIS</div><div class="v">${esc(user.nis || "-")}</div></div>
        <div class="kv"><div class="k">Kelas</div><div class="v">${esc(kelas ? kelas.nama : "-")}</div></div>` : ""}
      ${user.role === "guru" ? `<div class="kv"><div class="k">Status</div><div class="v">Guru SMK Pasundan Caringin</div></div>` : ""}
    </div>

    ${adminCard}

    <div class="section" style="margin-top:14px">
      <div class="section-title" style="margin-bottom:10px">Keamanan</div>
      <button class="card row-item clickable" id="btn-ganti" style="width:100%;text-align:left">
        <div class="av av-gray">${ic("key")}</div>
        <div class="row-body"><div class="row-title">Ganti Password</div>
        <div class="row-sub">Perbarui kata sandi akun Anda</div></div>
        <div class="row-right">${ic("chev")}</div>
      </button>
    </div>

    <div class="section">
      <div class="section-title" style="margin-bottom:10px">Tentang</div>
      <div class="card">
        <div class="kv"><div class="k">Aplikasi</div><div class="v">e-Sekolah Pasundan</div></div>
        <div class="kv"><div class="k">Sekolah</div><div class="v">SMK Pasundan Caringin</div></div>
        <div class="kv"><div class="k">Versi</div><div class="v">1.0.0</div></div>
        <div class="kv"><div class="k">Owner</div><div class="v">Arman</div></div>
        <div class="small muted" style="margin-top:8px">Aplikasi sekolah multifungsi: jadwal pelajaran, absensi, arsip & dokumentasi, jam sekolah, dan pengumuman. Data tersimpan aman di perangkat.</div>
      </div>
    </div>

    <button class="btn btn-danger btn-block" id="btn-logout" style="margin-top:4px">${ic("logout")} Keluar</button>
    <div style="height:10px"></div>
  `;
}

export function mount() {
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => router.navigate(b.dataset.go)));

  const ganti = document.getElementById("btn-ganti");
  if (ganti) ganti.addEventListener("click", openPasswordForm);

  const logout = document.getElementById("btn-logout");
  if (logout) logout.addEventListener("click", () => {
    clearSession();
    location.reload();
  });
}

function openPasswordForm() {
  const user = currentUser();
  openModal(`
    <div class="sheet-head"><div class="sheet-title">Ganti Password</div>
      <button class="sheet-x" data-close>${ic("x")}</button></div>
    <form id="pw-form">
      <div class="field"><label>Password Lama</label><input type="password" class="input" id="pw-lama" required></div>
      <div class="field"><label>Password Baru</label><input type="password" class="input" id="pw-baru" required minlength="6"></div>
      <div class="field"><label>Ulangi Password Baru</label><input type="password" class="input" id="pw-ulang" required></div>
      <button type="submit" class="btn btn-primary btn-block">${ic("key")} Simpan Password</button>
    </form>`);

  $("[data-close]").addEventListener("click", closeModal);
  $("#pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const lama = $("#pw-lama").value;
    const baru = $("#pw-baru").value;
    const ulang = $("#pw-ulang").value;
    if (baru !== ulang) return toast("Password baru tidak cocok", "error");
    const res = await changePassword(user.id, lama, baru);
    if (!res.ok) return toast(res.msg, "error");
    closeModal();
    toast("Password berhasil diganti");
  });
}

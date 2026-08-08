import { all, get, put, del } from "../db.js";
import { currentUser } from "../auth.js";
import { ic, esc, toast, openModal, closeModal, confirmDialog, genId, initials, avatarClass, $, router } from "../utils.js";

const TABS = ["Kelas", "Mapel", "Guru", "Siswa", "Pengguna", "Jam Sekolah"];
let state = { tab: "Kelas" };

export async function render() {
  if (currentUser().role !== "admin") {
    return `<div class="empty">${ic("info")}<b>Akses terbatas</b>Halaman ini hanya untuk administrator.</div>`;
  }
  const tabs = `<div class="seg">${TABS.map((t) => `<button data-tab="${t}" class="${state.tab === t ? "active" : ""}">${t}</button>`).join("")}</div>`;
  const body = await renderTab(state.tab);
  return `<div class="section">${tabs}<div id="kelola-body">${body}</div></div>`;
}

export async function mount() {
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { state.tab = b.dataset.tab; router.navigate("kelola"); }));
  bindTabEvents(state.tab);
}

async function renderTab(tab) {
  const items = await all(tab.toLowerCase().replace(" ", "_"));
  switch (tab) {
    case "Kelas": return listKelas(items);
    case "Mapel": return listMapel(items);
    case "Guru": return listGuru(items);
    case "Siswa": return listSiswa(items);
    case "Pengguna": return listUsers(items);
    case "Jam Sekolah": return listJam(items);
  }
}

function tabHead(title, addId) {
  return `
    <div class="section-head"><div class="section-title">${esc(title)}</div>
    <button class="btn btn-soft btn-sm" id="${addId}">${ic("plus")} Tambah</button></div>`;
}

function emptyState() {
  return `<div class="empty">${ic("grid")}<b>Kosong</b>Belum ada data. Klik Tambah.</div>`;
}

/* ---------- Kelas ---------- */
function listKelas(items) {
  const rows = items.map((k) => `
    <div class="row-item">
      <div class="av av-green">${esc(k.nama.split(" ")[0])}</div>
      <div class="row-body"><div class="row-title">${esc(k.nama)}</div>
        <div class="row-sub">Tingkat ${esc(k.tingkat)} · Jurusan ${esc(k.jurusan)}</div></div>
      <div class="row-right">
        <button class="icon-btn" data-edit="${k.id}" style="color:var(--blue-600);background:var(--blue-100);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("edit")}</button>
        <button class="icon-btn" data-del="${k.id}" style="color:var(--danger);background:var(--danger-bg);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("trash")}</button>
      </div>
    </div>`).join("");
  return `<div class="card card-pad0">${tabHead("Data Kelas", "add-kelas")}${rows || emptyState()}</div>`;
}

/* ---------- Mapel ---------- */
function listMapel(items) {
  const rows = items.map((m) => `
    <div class="row-item">
      <div class="av av-blue">${esc(m.kode.slice(0, 2))}</div>
      <div class="row-body"><div class="row-title">${esc(m.nama)}</div>
        <div class="row-sub">Kode ${esc(m.kode)}</div></div>
      <div class="row-right">
        <button class="icon-btn" data-edit="${m.id}" style="color:var(--blue-600);background:var(--blue-100);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("edit")}</button>
        <button class="icon-btn" data-del="${m.id}" style="color:var(--danger);background:var(--danger-bg);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("trash")}</button>
      </div>
    </div>`).join("");
  return `<div class="card card-pad0">${tabHead("Data Mata Pelajaran", "add-mapel")}${rows || emptyState()}</div>`;
}

/* ---------- Guru ---------- */
function listGuru(items) {
  const rows = items.map((g) => `
    <div class="row-item">
      <div class="av av-gold">${initials(g.nama)}</div>
      <div class="row-body"><div class="row-title">${esc(g.nama)}</div>
        <div class="row-sub">${esc(g.mapel || "-")}${g.telepon ? " · " + esc(g.telepon) : ""}</div></div>
      <div class="row-right">
        <button class="icon-btn" data-edit="${g.id}" style="color:var(--blue-600);background:var(--blue-100);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("edit")}</button>
        <button class="icon-btn" data-del="${g.id}" style="color:var(--danger);background:var(--danger-bg);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("trash")}</button>
      </div>
    </div>`).join("");
  return `<div class="card card-pad0">${tabHead("Data Guru", "add-guru")}${rows || emptyState()}</div>`;
}

/* ---------- Siswa ---------- */
async function listSiswa(items) {
  const kelasList = await all("kelas");
  const rows = items.map((s) => {
    const k = kelasList.find((x) => x.id === s.kelasId);
    return `
      <div class="row-item">
        <div class="av av-green">${initials(s.nama)}</div>
        <div class="row-body"><div class="row-title">${esc(s.nama)}</div>
          <div class="row-sub">NIS ${esc(s.nis)} · ${esc(k ? k.nama : "-")}</div></div>
        <div class="row-right">
          <button class="icon-btn" data-edit="${s.id}" style="color:var(--blue-600);background:var(--blue-100);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("edit")}</button>
          <button class="icon-btn" data-del="${s.id}" style="color:var(--danger);background:var(--danger-bg);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("trash")}</button>
        </div>
      </div>`;
  }).join("");
  return `<div class="card card-pad0">${tabHead("Data Siswa", "add-siswa")}${rows || emptyState()}</div>`;
}

/* ---------- Pengguna ---------- */
function listUsers(items) {
  const roleChip = { admin: "chip-admin", guru: "chip-guru", siswa: "chip-siswa" };
  const roleLabel = { admin: "Admin", guru: "Guru", siswa: "Siswa" };
  const rows = items.map((u) => `
    <div class="row-item">
      <div class="av ${avatarClass(u.nama)}">${initials(u.nama)}</div>
      <div class="row-body"><div class="row-title">${esc(u.nama)}</div>
        <div class="row-sub">@${esc(u.username)}</div></div>
      <div class="row-right"><span class="chip ${roleChip[u.role]}">${roleLabel[u.role]}</span></div>
    </div>`).join("");
  return `<div class="card card-pad0">${tabHead("Akun Pengguna", "add-user")}${rows || emptyState()}</div>`;
}

/* ---------- Jam Sekolah ---------- */
function listJam(items) {
  const sorted = [...items].sort((a, b) => a.jamMulai.localeCompare(b.jamMulai));
  const rows = sorted.map((it) => `
    <div class="row-item">
      <div class="av av-gray">${ic("clock")}</div>
      <div class="row-body"><div class="row-title">${esc(it.nama)}</div>
        <div class="row-sub">${esc(it.jamMulai)} - ${esc(it.jamSelesai)}</div></div>
      <div class="row-right">
        <button class="icon-btn" data-edit="${it.id}" style="color:var(--blue-600);background:var(--blue-100);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("edit")}</button>
        <button class="icon-btn" data-del="${it.id}" style="color:var(--danger);background:var(--danger-bg);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("trash")}</button>
      </div>
    </div>`).join("");
  return `<div class="card card-pad0">${tabHead("Jam Sekolah", "add-jam")}${rows || emptyState()}</div>`;
}

/* ---------------- binding ---------------- */
async function bindTabEvents(tab) {
  bindDelete(tab);
  bindEdit(tab);
  const store = storeOf(tab);
  const addId = { Kelas: "add-kelas", Mapel: "add-mapel", Guru: "add-guru", Siswa: "add-siswa", Pengguna: "add-user", "Jam Sekolah": "add-jam" }[tab];
  const btn = document.getElementById(addId);
  if (btn) btn.addEventListener("click", () => openForm(tab, store, null));
}

function storeOf(tab) { return tab.toLowerCase().replace(" ", "_"); }

function bindDelete(tab) {
  document.querySelectorAll("#kelola-body [data-del]").forEach((b) => b.addEventListener("click", async () => {
    const ok = await confirmDialog("Hapus data ini?", { ya: "hapus" });
    if (!ok) return;
    await del(storeOf(tab), b.dataset.del);
    toast("Data dihapus");
    router.navigate("kelola");
  }));
}

function bindEdit(tab) {
  document.querySelectorAll("#kelola-body [data-edit]").forEach((b) => b.addEventListener("click", async () => {
    const item = await get(storeOf(tab), b.dataset.edit);
    if (item) openForm(tab, storeOf(tab), item);
  }));
}

/* ---------------- forms ---------------- */
async function openForm(tab, store, item) {
  const isEdit = !!item;
  let html = "";
  const common = { id: item ? item.id : "" };
  if (tab === "Kelas") html = kelasForm(common, item);
  if (tab === "Mapel") html = mapelForm(common, item);
  if (tab === "Guru") html = guruForm(common, item);
  if (tab === "Siswa") html = siswaForm(common, item);
  if (tab === "Pengguna") html = userForm(common, item);
  if (tab === "Jam Sekolah") html = jamForm(common, item);

  openModal(`
    <div class="sheet-head"><div class="sheet-title">${isEdit ? "Edit" : "Tambah"} ${tab}</div>
      <button class="sheet-x" data-close>${ic("x")}</button></div>
    <form id="k-form">${html}
      <button type="submit" class="btn btn-primary btn-block">${ic("check")} Simpan</button>
    </form>`);

  $("[data-close]").addEventListener("click", closeModal);
  if (tab === "Siswa") {
    await fillKelasSelect();
    if (item && item.kelasId) $("#k-kelas").value = item.kelasId;
  }
  $("#k-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const rec = collect(tab, common.id);
    if (!rec) return;
    await put(store, rec);
    closeModal();
    toast(isEdit ? "Data diperbarui" : "Data ditambahkan");
    router.navigate("kelola");
  });
}

function field(lbl, inner, grid = false) {
  return `<div class="field${grid ? " field-row" : ""}">${lbl}${inner}</div>`;
}

function kelasForm(common, item) {
  return `
    <div class="field"><label>Nama Kelas *</label><input class="input" id="k-nama" required value="${esc(item ? item.nama : "")}" placeholder="cth: XI RPL 1"></div>
    <div class="field-row">
      <div class="field"><label>Tingkat</label><select class="input" id="k-tingkat">${["X", "XI", "XII"].map((t) => `<option ${item && item.tingkat === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label>Jurusan</label><select class="input" id="k-jurusan">${["RPL", "TKJ"].map((t) => `<option ${item && item.jurusan === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    </div>`;
}
function mapelForm(common, item) {
  return `
    <div class="field"><label>Nama Mata Pelajaran *</label><input class="input" id="k-nama" required value="${esc(item ? item.nama : "")}" placeholder="cth: Matematika"></div>
    <div class="field"><label>Kode</label><input class="input" id="k-kode" value="${esc(item ? item.kode : "")}" placeholder="cth: MTK"></div>`;
}
function guruForm(common, item) {
  return `
    <div class="field"><label>Nama Guru *</label><input class="input" id="k-nama" required value="${esc(item ? item.nama : "")}" placeholder="cth: Pak Budi Santoso"></div>
    <div class="field"><label>Mata Pelajaran Diampu</label><input class="input" id="k-mapel" value="${esc(item ? item.mapel : "")}" placeholder="cth: Matematika"></div>
    <div class="field"><label>Telepon</label><input class="input" id="k-telepon" value="${esc(item ? item.telepon : "")}" placeholder="cth: 0812-xxxx-xxxx"></div>`;
}
function siswaForm(common, item) {
  return `
    <div class="field"><label>Nama Siswa *</label><input class="input" id="k-nama" required value="${esc(item ? item.nama : "")}" placeholder="Nama lengkap"></div>
    <div class="field-row">
      <div class="field"><label>NIS</label><input class="input" id="k-nis" value="${esc(item ? item.nis : "")}" placeholder="cth: 24001"></div>
      <div class="field"><label>Kelas</label><select class="input" id="k-kelas"><option value="">-- Pilih --</option></select></div>
    </div>`;
}
function userForm(common, item) {
  return `
    <div class="field"><label>Nama Lengkap *</label><input class="input" id="k-nama" required value="${esc(item ? item.nama : "")}"></div>
    <div class="field-row">
      <div class="field"><label>Username *</label><input class="input" id="k-username" required value="${esc(item ? item.username : "")}"></div>
      <div class="field"><label>Password *</label><input class="input" id="k-password" required value="${esc(item ? item.password : "")}"></div>
    </div>
    <div class="field"><label>Peran</label><select class="input" id="k-role">
      ${["admin", "guru", "siswa"].map((r) => `<option ${item && item.role === r ? "selected" : ""}>${r}</option>`).join("")}
    </select></div>`;
}
function jamForm(common, item) {
  return `
    <div class="field"><label>Nama Kegiatan *</label><input class="input" id="k-nama" required value="${esc(item ? item.nama : "")}" placeholder="cth: Istirahat"></div>
    <div class="field-row">
      <div class="field"><label>Mulai</label><input type="time" class="input" id="k-mulai" value="${item ? item.jamMulai : ""}"></div>
      <div class="field"><label>Selesai</label><input type="time" class="input" id="k-selesai" value="${item ? item.jamSelesai : ""}"></div>
    </div>`;
}

async function collect(tab, id) {
  const val = (s) => $(s).value.trim();
  const rec = { id: id || genId(tab.toLowerCase()) };
  if (tab === "Kelas") {
    if (!val("#k-nama")) return toast("Nama kelas wajib diisi", "error"), null;
    rec.nama = val("#k-nama"); rec.tingkat = $("#k-tingkat").value; rec.jurusan = $("#k-jurusan").value;
  }
  if (tab === "Mapel") {
    if (!val("#k-nama")) return toast("Nama mapel wajib diisi", "error"), null;
    rec.nama = val("#k-nama"); rec.kode = val("#k-kode");
  }
  if (tab === "Guru") {
    if (!val("#k-nama")) return toast("Nama guru wajib diisi", "error"), null;
    rec.nama = val("#k-nama"); rec.mapel = val("#k-mapel"); rec.telepon = val("#k-telepon");
  }
  if (tab === "Siswa") {
    if (!val("#k-nama") || !val("#k-nis")) return toast("Nama & NIS wajib diisi", "error"), null;
    rec.nama = val("#k-nama"); rec.nis = val("#k-nis");
    rec.kelasId = Number($("#k-kelas").value) || null;
  }
  if (tab === "Pengguna") {
    if (!val("#k-nama") || !val("#k-username") || !val("#k-password")) return toast("Semua kolom wajib diisi", "error"), null;
    rec.nama = val("#k-nama"); rec.username = val("#k-username"); rec.password = val("#k-password"); rec.role = $("#k-role").value;
  }
  if (tab === "Jam Sekolah") {
    if (!val("#k-nama")) return toast("Nama kegiatan wajib diisi", "error"), null;
    rec.nama = val("#k-nama"); rec.jamMulai = $("#k-mulai").value; rec.jamSelesai = $("#k-selesai").value;
  }
  return rec;
}

async function fillKelasSelect() {
  const sel = $("#k-kelas");
  if (!sel) return;
  const kelas = await all("kelas");
  sel.innerHTML = `<option value="">-- Pilih --</option>` + kelas.map((k) => `<option value="${k.id}">${esc(k.nama)}</option>`).join("");
}

export function setState(p) { Object.assign(state, p); }

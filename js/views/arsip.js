import { all, put, del } from "../db.js";
import { currentUser } from "../auth.js";
import { ic, esc, toast, formatDateId, fmtBytes, genId, confirmDialog, openModal, closeModal, $, router } from "../utils.js";

const KATEGORI = ["Semua", "Dokumen", "Surat", "Foto", "Sertifikat", "Lainnya"];
const CAT_COLOR = {
  Dokumen: "#16a35f", Surat: "#2563eb", Foto: "#d97706",
  Sertifikat: "#7c3aed", Lainnya: "#64748b"
};
const CAT_ICON = { Dokumen: "file", Surat: "file", Foto: "image", Sertifikat: "award", Lainnya: "archive" };

let state = { cat: "Semua", q: "" };

export async function render() {
  const user = currentUser();
  let list = await all("arsip");
  list = list.filter((a) => state.cat === "Semua" || a.kategori === state.cat);
  if (state.q) list = list.filter((a) => (a.judul + " " + a.kategori + " " + (a.keterangan || "")).toLowerCase().includes(state.q.toLowerCase()));
  list.sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));

  const canUpload = user.role === "admin" || user.role === "guru";
  const pills = KATEGORI.map((k) => `<button class="pill ${state.cat === k ? "active" : ""}" data-cat="${k}">${k}</button>`).join("");

  let items;
  if (!list.length) {
    items = `<div class="empty">${ic("archive")}<b>Belum ada arsip</b>${canUpload ? "Klik tombol Unggah untuk menambahkan." : "Belum ada dokumentasi yang diunggah."}</div>`;
  } else {
    items = list.map((a) => {
      const col = CAT_COLOR[a.kategori] || "#64748b";
      const icon = CAT_ICON[a.kategori] || "file";
      return `
        <div class="ars-card">
          <div class="file-ic" style="background:${col}">${ic(icon)}</div>
          <div class="row-body">
            <div class="row-title">${esc(a.judul)}</div>
            <div class="row-sub">${esc(a.kategori)} · ${formatDateId(a.tanggal)} · ${fmtBytes(a.ukuran)}</div>
            <div class="row-sub">${esc(a.penulis || "")}</div>
          </div>
          <div class="row-right">
            <button class="icon-btn" style="color:var(--blue-600);background:var(--blue-100);width:36px;height:36px;display:grid;place-items:center;border-radius:10px" data-download="${a.id}" title="Unduh">${ic("download")}</button>
            ${canUpload ? `<button class="icon-btn" style="color:var(--danger);background:var(--danger-bg);width:36px;height:36px;display:grid;place-items:center;border-radius:10px" data-del="${a.id}" title="Hapus">${ic("trash")}</button>` : ""}
          </div>
        </div>`;
    }).join("");
  }

  return `
    <div class="section">
      <div class="searchbox">${ic("search")}<input class="input" id="ars-q" placeholder="Cari arsip..." value="${esc(state.q)}"></div>
      <div class="cat-pills">${pills}</div>
      ${items}
    </div>
    ${canUpload ? `
      <div class="floating">
        <button class="fab" id="ars-upload">${ic("upload")} Unggah</button>
      </div>` : ""}
  `;
}

export async function mount() {
  const q = document.getElementById("ars-q");
  if (q) q.addEventListener("input", (e) => { state.q = e.target.value; router.navigate("arsip"); });

  document.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => { state.cat = b.dataset.cat; router.navigate("arsip"); }));

  document.querySelectorAll("[data-download]").forEach((b) => b.addEventListener("click", async () => {
    const item = (await all("arsip")).find((x) => x.id === b.dataset.download);
    if (!item || !item.data) return toast("Berkas tidak tersedia", "error");
    const url = URL.createObjectURL(item.data);
    const a = document.createElement("a");
    a.href = url; a.download = item.fileName || "berkas";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Berkas diunduh");
  }));

  document.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    const ok = await confirmDialog("Hapus arsip ini? Tindakan tidak dapat dibatalkan.", { ya: "hapus" });
    if (!ok) return;
    await del("arsip", b.dataset.del);
    toast("Arsip dihapus");
    router.navigate("arsip");
  }));

  const up = document.getElementById("ars-upload");
  if (up) up.addEventListener("click", openUploadForm);
}

function openUploadForm() {
  const user = currentUser();
  openModal(`
    <div class="sheet-head"><div class="sheet-title">Unggah Arsip</div>
      <button class="sheet-x" data-close>${ic("x")}</button></div>
    <form id="ars-form">
      <div class="field"><label>Judul / Nama Dokumen *</label><input class="input" id="af-judul" required placeholder="cth: Surat Undangan Rapat"></div>
      <div class="field-row">
        <div class="field"><label>Kategori</label><select class="input" id="af-kat">
          ${KATEGORI.filter((k) => k !== "Semua").map((k) => `<option>${k}</option>`).join("")}
        </select></div>
        <div class="field"><label>Tanggal</label><input type="date" class="input" id="af-tgl" value="${new Date().toISOString().slice(0, 10)}"></div>
      </div>
      <div class="field"><label>Berkas (PDF, Gambar, dll) *</label><input type="file" class="input" id="af-file" required></div>
      <div class="field"><label>Keterangan</label><textarea class="input" id="af-ket" placeholder="Catatan tambahan (opsional)"></textarea></div>
      <button type="submit" class="btn btn-primary btn-block">${ic("upload")} Simpan Arsip</button>
    </form>`);

  $("[data-close]").addEventListener("click", closeModal);
  const form = $("#ars-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const judul = $("#af-judul").value.trim();
    const file = $("#af-file").files[0];
    if (!judul || !file) return toast("Lengkapi judul dan berkas", "error");
    const tgl = $("#af-tgl").value;
    const rec = {
      id: genId("arsip"),
      judul,
      kategori: $("#af-kat").value,
      tanggal: tgl,
      fileName: file.name,
      mime: file.type || "application/octet-stream",
      ukuran: file.size,
      data: file,
      keterangan: $("#af-ket").value.trim(),
      penulis: user.nama
    };
    await put("arsip", rec);
    closeModal();
    toast("Arsip berhasil disimpan");
    router.navigate("arsip");
  });
}

export function setState(p) { Object.assign(state, p); }

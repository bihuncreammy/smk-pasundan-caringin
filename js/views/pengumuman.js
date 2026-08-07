import { all, put, del } from "../db.js";
import { currentUser } from "../auth.js";
import { ic, esc, toast, formatDateId, todayStr, confirmDialog, openModal, closeModal, genId, $, router } from "../utils.js";

export async function render() {
  const user = currentUser();
  const list = await all("pengumuman");
  list.sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || b.penting - a.penting);
  const canWrite = user.role === "admin" || user.role === "guru";

  const items = list.length ? list.map((p) => `
      <div class="peng-item ${p.penting ? "penting" : ""}">
        <div class="peng-judul">${p.penting ? `<span class="badge badge-penting">Penting</span> ` : ""}${esc(p.judul)}</div>
        <div class="peng-meta">
          <span>${ic("user")} ${esc(p.penulis || "-")}</span>
          <span>${ic("calendar")} ${formatDateId(p.tanggal)}</span>
          ${canWrite ? `<button class="link-more" data-delpeng="${p.id}" style="margin-left:auto">Hapus</button>` : ""}
        </div>
        <div class="peng-isi">${esc(p.isi)}</div>
      </div>`).join("")
    : `<div class="empty">${ic("megaphone")}<b>Belum ada pengumuman</b>${canWrite ? "Klik tombol Buat Pengumuman." : "Pengumuman akan tampil di sini."}</div>`;

  return `
    <div class="section">
      ${items}
    </div>
    ${canWrite ? `
      <div class="floating"><button class="fab" id="peng-buat">${ic("plus")} Buat Pengumuman</button></div>` : ""}
  `;
}

export async function mount() {
  const buat = document.getElementById("peng-buat");
  if (buat) buat.addEventListener("click", openForm);

  document.querySelectorAll("[data-delpeng]").forEach((b) => b.addEventListener("click", async () => {
    const ok = await confirmDialog("Hapus pengumuman ini?", { ya: "hapus" });
    if (!ok) return;
    await del("pengumuman", b.dataset.delpeng);
    toast("Pengumuman dihapus");
    router.navigate("pengumuman");
  }));
}

function openForm() {
  const user = currentUser();
  openModal(`
    <div class="sheet-head"><div class="sheet-title">Buat Pengumuman</div>
      <button class="sheet-x" data-close>${ic("x")}</button></div>
    <form id="peng-form">
      <div class="field"><label>Judul *</label><input class="input" id="pf-judul" required placeholder="Judul pengumuman"></div>
      <div class="field"><label>Isi Pengumuman *</label><textarea class="input" id="pf-isi" required placeholder="Tulis isi pengumuman..."></textarea></div>
      <div class="field"><label>Tanggal</label><input type="date" class="input" id="pf-tgl" value="${todayStr()}"></div>
      <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600">
        <input type="checkbox" id="pf-penting"> Tandai sebagai PENTING
      </label>
      <button type="submit" class="btn btn-primary btn-block">${ic("megaphone")} Terbitkan</button>
    </form>`);

  $("[data-close]").addEventListener("click", closeModal);
  $("#peng-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const judul = $("#pf-judul").value.trim();
    const isi = $("#pf-isi").value.trim();
    if (!judul || !isi) return;
    await put("pengumuman", {
      id: genId("peng"),
      judul, isi,
      tanggal: $("#pf-tgl").value || todayStr(),
      penting: $("#pf-penting").checked,
      penulis: user.nama
    });
    closeModal();
    toast("Pengumuman diterbitkan");
    router.navigate("pengumuman");
  });
}

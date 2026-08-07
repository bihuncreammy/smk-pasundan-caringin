import { all, put, del } from "../db.js";
import { currentUser } from "../auth.js";
import { ic, esc, toast, nowHMS, formatDateId, todayStr, currentActivity, openModal, closeModal, genId, $, router } from "../utils.js";

export async function render() {
  const [jamList] = await Promise.all([all("jam_sekolah")]);
  const user = currentUser();
  const act = currentActivity(jamList);
  const day = todayStr();

  const curId = act.cur && act.cur.id;
  const tl = [...jamList].sort((a, b) => a.jamMulai.localeCompare(b.jamMulai)).map((it) => {
    const isCur = it.id === curId;
    const flag = isCur ? '<span class="tl-flag">● SEKARANG</span>' : "";
    return `
      <div class="tl-item ${isCur ? "active" : ""}">
        <div class="tl-nama">${esc(it.nama)} ${flag}</div>
        <div class="tl-jam">${esc(it.jamMulai)} - ${esc(it.jamSelesai)}</div>
      </div>`;
  }).join("");

  return `
    <div class="section">
      <div class="clock-panel">
        <div class="time" id="clock-big">${nowHMS()}</div>
        <div class="day">${formatDateId(day)}</div>
        <div class="act">${ic("zap")} ${act.cur ? esc(act.cur.nama) : "Di luar jam sekolah"}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <div class="section-title">Jam Sekolah</div>
        ${user.role === "admin" ? `<button class="link-more" id="wkt-edit">Edit</button>` : ""}
      </div>
      <div class="card tl">${tl || `<div class="empty small">${ic("clock")}<b>Kosong</b>Belum ada jam sekolah.</div>`}</div>
    </div>
  `;
}

export function mount() {
  window.__waktuTimer = setInterval(() => {
    const el = document.getElementById("clock-big");
    if (el) el.textContent = nowHMS();
  }, 1000);
  const edit = document.getElementById("wkt-edit");
  if (edit) edit.addEventListener("click", openJamEditor);
}

export function cleanup() { clearInterval(window.__waktuTimer); }

async function openJamEditor() {
  const list = await all("jam_sekolah");
  openModal(`
    <div class="sheet-head"><div class="sheet-title">Atur Jam Sekolah</div>
      <button class="sheet-x" data-close>${ic("x")}</button></div>
    <div style="display:flex;flex-direction:column;gap:10px" id="jam-editor-list">
      ${list.map((it) => `
        <div class="card" style="display:flex;gap:10px;align-items:center;padding:10px 12px" data-jamid="${it.id}">
          <div style="flex:1;min-width:0">
            <input class="input" data-f="nama" value="${esc(it.nama)}" style="margin-bottom:6px">
            <div style="display:flex;gap:8px">
              <input type="time" class="input" data-f="mulai" value="${esc(it.jamMulai)}">
              <input type="time" class="input" data-f="selesai" value="${esc(it.jamSelesai)}">
            </div>
          </div>
          <button class="icon-btn" data-del style="color:var(--danger);background:var(--danger-bg);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("trash")}</button>
        </div>`).join("")}
    </div>
    <button class="btn btn-outline btn-block" style="margin-top:12px" id="jam-add">${ic("plus")} Tambah Waktu</button>
    <button class="btn btn-primary btn-block" style="margin-top:10px" id="jam-save">${ic("check")} Simpan Perubahan</button>`);

  $("[data-close]").addEventListener("click", closeModal);

  $("[data-del]")?.addEventListener("click", (e) => {
    if (e.target.closest("[data-del]")) e.target.closest("[data-jamid]").remove();
  });
  $("#jam-add").addEventListener("click", () => {
    const div = document.createElement("div");
    div.className = "card";
    div.style.cssText = "display:flex;gap:10px;align-items:center;padding:10px 12px";
    div.innerHTML = `
      <div style="flex:1;min-width:0">
        <input class="input" data-f="nama" placeholder="Nama kegiatan" style="margin-bottom:6px">
        <div style="display:flex;gap:8px">
          <input type="time" class="input" data-f="mulai">
          <input type="time" class="input" data-f="selesai">
        </div>
      </div>
      <button class="icon-btn" data-del style="color:var(--danger);background:var(--danger-bg);width:34px;height:34px;display:grid;place-items:center;border-radius:10px">${ic("trash")}</button>`;
    $("#jam-editor-list").appendChild(div);
  });

  $("#jam-save").addEventListener("click", async () => {
    const rows = Array.from($$("#jam-editor-list > div"));
    const items = [];
    rows.forEach((r) => {
      const nama = r.querySelector('[data-f="nama"]').value.trim();
      const mulai = r.querySelector('[data-f="mulai"]').value;
      const selesai = r.querySelector('[data-f="selesai"]').value;
      if (!nama || !mulai || !selesai) return;
      items.push({ id: r.dataset.jamid || genId("jam"), nama, jamMulai: mulai, jamSelesai: selesai });
    });
    for (const it of items) await put("jam_sekolah", it);
    for (const it of await all("jam_sekolah")) if (!items.find((x) => x.id === it.id)) await del("jam_sekolah", it.id);
    closeModal();
    toast("Jam sekolah diperbarui");
    router.navigate("waktu");
  });
}

const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

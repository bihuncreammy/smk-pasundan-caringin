import { all, put } from "../db.js";
import { currentUser } from "../auth.js";
import { ic, esc, toast, todayStr, formatDateId, genId, router } from "../utils.js";

let state = { tab: null, kelasId: null, tanggal: null, mapelId: null, jamKe: null, guruId: null };
const ST = ["H", "S", "I", "A"];

export async function render() {
  const user = currentUser();
  if (user.role === "siswa") return renderSiswa(user);
  return renderInput(user);
}

export async function mount() { bindInput(); }

/* ---------------- SISWA ---------------- */
async function renderSiswa(user) {
  const [absensi, mapels, kelasList] = await Promise.all([all("absensi"), all("mapel"), all("kelas")]);
  const mine = absensi.filter((a) => a.kelasId === user.kelasId);
  const rows = [];
  for (const a of mine) {
    const st = a.data && a.data[user.nis];
    const m = mapels.find((x) => x.id === a.mapelId);
    rows.push({ tanggal: a.tanggal, mapel: m ? m.nama : "Mapel", jamKe: a.jamKe, status: st || "-" });
  }
  rows.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const cnt = { H: 0, S: 0, I: 0, A: 0 };
  rows.forEach((r) => { if (cnt[r.status] !== undefined) cnt[r.status]++; });
  const kelas = (kelasList.find((k) => k.id === user.kelasId) || {}).nama || "-";

  const listHtml = rows.length ? `<div class="card card-pad0">` + rows.map((r) => `
      <div class="row-item">
        <div class="row-body">
          <div class="row-title">${esc(r.mapel)}</div>
          <div class="row-sub">${formatDateId(r.tanggal)} · Jam ke-${r.jamKe || "-"}</div>
        </div>
        <div class="row-right">${statusChip(r.status)}</div>
      </div>`).join("") + `</div>`
    : `<div class="empty">${ic("checkc")}<b>Belum ada absen</b>Guru belum mencatat absen untuk kelas Anda.</div>`;

  return `
    <div class="section">
      <div class="card" style="margin-bottom:12px"><div class="kv"><div class="k">Nama</div><div class="v">${esc(user.nama)}</div></div>
      <div class="kv"><div class="k">NIS</div><div class="v">${esc(user.nis || "-")}</div></div>
      <div class="kv"><div class="k">Kelas</div><div class="v">${esc(kelas)}</div></div></div>
      <div class="stat-row">
        <div class="stat h"><b>${cnt.H}</b><span>Hadir</span></div>
        <div class="stat s"><b>${cnt.S}</b><span>Sakit</span></div>
        <div class="stat i"><b>${cnt.I}</b><span>Izin</span></div>
        <div class="stat a"><b>${cnt.A}</b><span>Alpa</span></div>
      </div>
      <div class="section-head"><div class="section-title">Riwayat Kehadiran</div></div>
      ${listHtml}
    </div>`;
}

/* ---------------- GURU / ADMIN ---------------- */
async function renderInput(user) {
  const [kelasList, mapels, guruList, absensi] = await Promise.all([all("kelas"), all("mapel"), all("guru"), all("absensi")]);

  if (state.tab === null) state.tab = user.role === "guru" ? "input" : "input";
  if (!state.tanggal) state.tanggal = todayStr();
  if (!state.kelasId) state.kelasId = kelasList.length ? kelasList[0].id : null;
  if (!state.mapelId) state.mapelId = mapels.length ? mapels[0].id : null;
  if (!state.jamKe) state.jamKe = 1;

  const guruOptions = guruList.length
    ? `<option value="">-- Tanpa keterangan --</option>` + guruList.map((g) => `<option value="${g.id}">${esc(g.nama)}</option>`).join("")
    : `<option value="">-- Tanpa keterangan --</option>`;

  const isAdmin = user.role === "admin";
  const tabs = `
    <div class="seg">
      <button data-tab="input" class="${state.tab === "input" ? "active" : ""}">Input Absen</button>
      ${isAdmin ? `<button data-tab="rekap" class="${state.tab === "rekap" ? "active" : ""}">Rekap</button>` : ""}
    </div>`;

  let body;
  if (state.tab === "rekap") body = await renderRekap(kelasList, absensi, mapels);
  else body = await renderForm(kelasList, mapels, guruList, absensi, guruOptions, isAdmin);

  return `<div class="section">${tabs}${body}</div>`;
}

async function renderForm(kelasList, mapels, guruList, absensi, guruOptions, isAdmin) {
  const siswaList = (await all("siswa")).filter((s) => s.kelasId === state.kelasId).sort((a, b) => a.nis.localeCompare(b.nis));
  const existing = absensi.find((a) => a.tanggal === state.tanggal && a.kelasId === state.kelasId && a.mapelId === state.mapelId && a.jamKe === state.jamKe);

  const rows = siswaList.map((s) => {
    const cur = existing ? existing.data[s.nis] : "H";
    return `
      <div class="row-item">
        <div class="av av-green" style="width:36px;height:36px;font-size:13px">${esc(s.nis.slice(-2))}</div>
        <div class="row-body">
          <div class="row-title">${esc(s.nama)}</div>
          <div class="row-sub">NIS ${esc(s.nis)}</div>
        </div>
        <div class="row-right" data-siswa="${s.nis}">
          ${ST.map((t) => `<button class="st-btn ${cur === t ? "on" : ""}" data-s="${t}" title="${labelOf(t)}">${t}</button>`).join("")}
        </div>
      </div>`;
  }).join("");

  const info = existing
    ? `<div class="card" style="border:1.5px solid var(--blue-500);margin-bottom:12px"><div class="small"><b>✓ Sudah diinput</b> pada ${formatDateId(state.tanggal)}. Ubah data lalu simpan untuk memperbarui.</div></div>`
    : "";

  return `
    ${info}
    <div class="card" style="margin-bottom:12px;display:flex;flex-direction:column;gap:11px">
      <div class="field-row">
        <div class="field"><label>Kelas</label><select class="input" id="ab-kelas">
          ${kelasList.map((k) => `<option value="${k.id}" ${k.id === state.kelasId ? "selected" : ""}>${esc(k.nama)}</option>`).join("")}
        </select></div>
        <div class="field"><label>Jam ke</label><select class="input" id="ab-jam">
          ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option ${n === state.jamKe ? "selected" : ""}>${n}</option>`).join("")}
        </select></div>
      </div>
      <div class="field"><label>Mata Pelajaran</label><select class="input" id="ab-mapel">
        ${mapels.map((m) => `<option value="${m.id}" ${m.id === state.mapelId ? "selected" : ""}>${esc(m.nama)}</option>`).join("")}
      </select></div>
      <div class="field-row">
        <div class="field"><label>Tanggal</label><input type="date" class="input" id="ab-tanggal" value="${state.tanggal}"></div>
        <div class="field"><label>Guru</label><select class="input" id="ab-guru">${guruOptions}</select></div>
      </div>
    </div>
    <div class="card card-pad0">${rows || `<div class="empty small">${ic("users")}<b>Kosong</b>Belum ada siswa di kelas ini.</div>`}</div>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button class="btn btn-outline" style="flex:1" id="ab-reset">${ic("x")} Reset</button>
      <button class="btn btn-primary" style="flex:2" id="ab-save">${ic("check")} Simpan Absen</button>
    </div>`;
}

async function renderRekap(kelasList, absensi, mapels) {
  const [siswaList] = await Promise.all([all("siswa")]);
  const siswa = siswaList.filter((s) => s.kelasId === state.kelasId).sort((a, b) => a.nis.localeCompare(b.nis));
  const list = absensi.filter((a) => a.kelasId === state.kelasId);
  const cnt = {};
  siswa.forEach((s) => cnt[s.nis] = { H: 0, S: 0, I: 0, A: 0 });
  list.forEach((a) => {
    if (a.data) Object.entries(a.data).forEach(([nis, st]) => {
      if (cnt[nis] && cnt[nis][st] !== undefined) cnt[nis][st]++;
    });
  });
  const tot = list.length;

  return `
    <div class="card" style="margin-bottom:12px"><div class="field"><label>Kelas</label><select class="input" id="ab-kelas-rekap">
      ${kelasList.map((k) => `<option value="${k.id}" ${k.id === state.kelasId ? "selected" : ""}>${esc(k.nama)}</option>`).join("")}
    </select></div></div>
    <div class="small muted" style="margin-bottom:8px">Total ${tot} sesi absen tercatat untuk kelas ini.</div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Nama</th><th>H</th><th>S</th><th>I</th><th>A</th></tr></thead>
      <tbody>
        ${siswa.map((s) => `<tr><td>${esc(s.nama)}</td><td>${cnt[s.nis].H}</td><td>${cnt[s.nis].S}</td><td>${cnt[s.nis].I}</td><td>${cnt[s.nis].A}</td></tr>`).join("")}
      </tbody>
    </table></div>`;
}

/* ---------------- events ---------------- */
async function bindInput() {
  const user = currentUser();
  const onKelas = (sel) => {
    const el = document.getElementById(sel);
    if (el) el.addEventListener("change", (e) => { state.kelasId = Number(e.target.value); router.navigate("absen"); });
  };
  onKelas("ab-kelas"); onKelas("ab-kelas-rekap");

  const mapel = document.getElementById("ab-mapel");
  if (mapel) mapel.addEventListener("change", (e) => { state.mapelId = Number(e.target.value); router.navigate("absen"); });
  const jam = document.getElementById("ab-jam");
  if (jam) jam.addEventListener("change", (e) => { state.jamKe = Number(e.target.value); router.navigate("absen"); });
  const tg = document.getElementById("ab-tanggal");
  if (tg) tg.addEventListener("change", (e) => { state.tanggal = e.target.value; router.navigate("absen"); });
  const guru = document.getElementById("ab-guru");
  if (guru) guru.addEventListener("change", (e) => { state.guruId = Number(e.target.value) || null; });

  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { state.tab = b.dataset.tab; router.navigate("absen"); }));

  document.querySelectorAll(".st-btn").forEach((b) => {
    b.addEventListener("click", () => {
      const wrap = b.closest("[data-siswa]");
      const val = b.dataset.s;
      wrap.querySelectorAll(".st-btn").forEach((x) => x.classList.toggle("on", x === b));
      wrap.dataset.status = val;
      if (wrap.dataset.siswa) {
        const row = wrap.closest(".row-item");
        row.dataset.status = val;
      }
    });
  });

  const reset = document.getElementById("ab-reset");
  if (reset) reset.addEventListener("click", () => {
    document.querySelectorAll(".st-btn").forEach((b) => b.classList.toggle("on", b.dataset.s === "H"));
  });

  const save = document.getElementById("ab-save");
  if (save) save.addEventListener("click", async () => {
    if (!state.tanggal) return toast("Pilih tanggal", "error");
    const siswa = (await all("siswa")).filter((s) => s.kelasId === state.kelasId);
    if (!siswa.length) return toast("Tidak ada siswa di kelas ini", "error");
    const data = {};
    siswa.forEach((s) => {
      const wrap = document.querySelector(`[data-siswa="${s.nis}"]`);
      data[s.nis] = wrap ? (wrap.dataset.status || "H") : "H";
    });
    const existing = (await all("absensi")).find((a) => a.tanggal === state.tanggal && a.kelasId === state.kelasId && a.mapelId === state.mapelId && a.jamKe === state.jamKe);
    const record = existing || { id: genId("ab") };
    Object.assign(record, {
      tanggal: state.tanggal, kelasId: state.kelasId, mapelId: state.mapelId,
      jamKe: state.jamKe, guruId: state.guruId || null, data
    });
    await put("absensi", record);
    toast(existing ? "Absen diperbarui" : "Absen tersimpan");
    router.navigate("absen");
  });
}

function labelOf(t) { return { H: "Hadir", S: "Sakit", I: "Izin", A: "Alpa" }[t]; }
export function statusChip(s) {
  const cls = { H: "chip-green", S: "chip-orange", I: "chip-blue", A: "chip-red" }[s] || "";
  return `<span class="chip ${cls}">${labelOf(s) || "-"}</span>`;
}
export function setState(p) { Object.assign(state, p); }

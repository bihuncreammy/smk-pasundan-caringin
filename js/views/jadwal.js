import { all } from "../db.js";
import { currentUser } from "../auth.js";
import { ic, esc, HARI, HARI_SINGKAT, todayDayNum, nowHM, minOfDay, router } from "../utils.js";

let state = { kelasId: null, hari: null };

export async function render() {
  const user = currentUser();
  const [kelasList, mapels, guruList, jadwalAll, jamList] = await Promise.all([
    all("kelas"), all("mapel"), all("guru"), all("jadwal"), all("jam_sekolah")
  ]);

  const today = todayDayNum();
  if (state.hari === null) state.hari = today >= 1 && today <= 6 ? today : 1;
  if (!state.kelasId) {
    if (user.role === "siswa") state.kelasId = user.kelasId;
    else state.kelasId = kelasList.length ? kelasList[0].id : null;
  }

  const kelasSel = user.role !== "siswa"
    ? `<div class="field" style="margin-bottom:12px">
        <label>Pilih Kelas</label>
        <select class="input" id="jad-kelas">
          ${kelasList.map((k) => `<option value="${k.id}" ${k.id === state.kelasId ? "selected" : ""}>${esc(k.nama)}</option>`).join("")}
        </select>
      </div>`
    : `<div class="card" style="margin-bottom:12px"><div class="kv"><div class="k">Kelas</div><div class="v">${esc((kelasList.find((k) => k.id === state.kelasId) || {}).nama || "-")}</div></div></div>`;

  const jadwal = jadwalAll
    .filter((j) => j.kelasId === state.kelasId && j.hari === state.hari)
    .sort((a, b) => a.jamKe - b.jamKe);

  const nowM = minOfDay(nowHM());
  const days = [1, 2, 3, 4, 5, 6].map((d) => {
    const isToday = d === today;
    const cls = ["day-tab", d === state.hari ? "active" : "", isToday ? "today" : ""].join(" ");
    const range = (d === 1) ? "07:00-09:30" : "07:00-14:10";
    return `<button class="${cls}" data-hari="${d}"><div>${HARI_SINGKAT[d]}</div><div class="dnum">${range.split("-")[1]}</div></button>`;
  }).join("");

  let body;
  if (!jadwal.length) {
    body = `<div class="empty">${ic("calendar")}<b>Tidak ada jadwal</b>Belum ada jadwal untuk kelas ini pada hari ${HARI[state.hari]}.</div>`;
  } else {
    const isToday = state.hari === today;
    body = `<div class="card card-pad0">` + jadwal.map((j) => {
      const m = mapels.find((x) => x.id === j.mapelId);
      const g = guruList.find((x) => x.id === j.guruId);
      const w = jadwalWindow(j, jamList);
      const nowCls = isToday && w && nowM >= minOfDay(w.start) && nowM < minOfDay(w.end) ? " jad-now" : "";
      return `
        <div class="row-item jad-item${nowCls}">
          <div class="jad-time">
            <div class="jad-ke">Jam ${j.jamKe}</div>
            <div class="jad-jam">${w ? w.start + "-" + w.end : "-"}</div>
          </div>
          <div class="jad-body">
            <div class="jad-mapel">${esc(m ? m.nama : "Mata Pelajaran")}</div>
            <div class="jad-meta">
              <span>👤 ${esc(g ? g.nama : "Guru")}</span>
              <span>📍 ${esc(j.ruang || "Ruang")}</span>
            </div>
          </div>
        </div>`;
    }).join("") + `</div>`;
  }

  return `
    <div class="section">
      ${kelasSel}
      <div class="day-tabs">${days}</div>
      <div id="jad-body">${body}</div>
    </div>`;
}

export function mount() {
  const kel = document.getElementById("jad-kelas");
  if (kel) kel.addEventListener("change", (e) => { state.kelasId = Number(e.target.value); router.navigate("jadwal"); });
  const tabs = document.querySelectorAll("[data-hari]");
  tabs.forEach((b) => b.addEventListener("click", () => { state.hari = Number(b.dataset.hari); router.navigate("jadwal"); }));
}

export function setState(k, h) { if (k !== undefined) state.kelasId = k; if (h !== undefined) state.hari = h; }

function jadwalWindow(j, jamList) {
  if (!jamList || !jamList.length) return null;
  const jk = Math.min(j.jamKe, 8);
  const ranges = [
    ["07:00", "08:30"], ["08:30", "09:30"], ["09:50", "10:50"], ["10:50", "12:10"],
    ["12:55", "13:45"], ["13:45", "14:10"], ["14:10", "14:30"], ["14:30", "15:00"]
  ];
  const r = ranges[jk - 1] || null;
  return r ? { start: r[0], end: r[1] } : null;
}

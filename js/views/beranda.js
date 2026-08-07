import { all, get } from "../db.js";
import { currentUser } from "../auth.js";
import { router } from "../utils.js";
import { ic, esc, nowHMS, nowHM, todayStr, todayDayNum, formatDateId, HARI, currentActivity } from "../utils.js";

export async function render() {
  const user = currentUser();
  const [kelasList, jamList, pengList, jadwalAll] = await Promise.all([
    all("kelas"), all("jam_sekolah"), all("pengumuman"), all("jadwal")
  ]);
  const mapels = await all("mapel");

  const greeting = greetingByHour();
  const now = todayStr();
  const dayNum = todayDayNum();
  const dateId = formatDateId(now);

  const act = currentActivity(jamList);
  const actHtml = act.cur
    ? `<span class="now-badge"><span class="pulse-dot"></span> Sedang: <b>&nbsp;${esc(act.cur.nama)}</b> (${esc(act.cur.jamMulai)}-${esc(act.cur.jamSelesai)})${act.next ? ` · berikut: ${esc(act.next.nama)} ${esc(act.next.jamMulai)}` : ""}</span>`
    : `<span class="now-badge"><span class="pulse-dot"></span> Di luar jam sekolah${act.next ? ` · berikut: ${esc(act.next.nama)} ${esc(act.next.jamMulai)}` : ""}</span>`;

  const myKelasId = user.role === "siswa" ? user.kelasId : null;
  const jadwalHariIni = jadwalAll
    .filter((j) => j.hari === dayNum && (!myKelasId || j.kelasId === myKelasId))
    .sort((a, b) => a.jamKe - b.jamKe);

  const pengTerbaru = [...pengList].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 3);

  const quick = [];
  quick.push({ icon: "clock", label: "Waktu & Jam", sub: "Jam sekolah hari ini", color: "#2563eb", bg: "var(--info-bg)", page: "waktu" });
  quick.push({ icon: "megaphone", label: "Pengumuman", sub: pengList.length + " pengumuman", color: "#d97706", bg: "var(--warn-bg)", page: "pengumuman" });
  quick.push({ icon: "archive", label: "Arsip", sub: "Dokumentasi sekolah", color: "#16a35f", bg: "var(--ok-bg)", page: "arsip" });
  if (user.role === "admin") {
    quick.push({ icon: "settings", label: "Kelola Data", sub: "Siswa, guru, jadwal", color: "#7c3aed", bg: "#f1e8fd", page: "kelola" });
  }

  const roleLabel = { admin: "Administrator", guru: "Guru", siswa: "Siswa" }[user.role];

  let jadwalPreview = "";
  if (dayNum >= 1 && dayNum <= 6) {
    const rows = jadwalHariIni.map((j) => {
      const m = mapels.find((x) => x.id === j.mapelId);
      return `<div class="row-item"><div class="jad-time"><div class="jad-ke">Jam ${j.jamKe}</div><div class="jad-jam">${j.ruang || "-"}</div></div><div class="row-body"><div class="row-title">${esc(m ? m.nama : "Mapel")}</div></div></div>`;
    }).join("");
    jadwalPreview = `
      <div class="section">
        <div class="section-head"><div class="section-title">Jadwal Hari Ini · ${HARI[dayNum]}</div>
        <button class="link-more" data-go="jadwal">Lihat semua</button></div>
        <div class="card card-pad0">${rows || `<div class="empty small">${ic("calendar")}<b>Libur</b> Tidak ada jadwal hari ini</div>`}</div>
      </div>`;
  }

  return `
    <div class="hello-card">
      <div class="hello">Assalamualaikum, ${esc(user.nama.split(" ")[0])}! 👋</div>
      <div class="hello-sub">${greeting} · ${esc(roleLabel)}</div>
      <div class="clock-row">
        <div class="big-clock" id="big-clock">${nowHMS()}</div>
        <div class="clock-date">${dateId}</div>
      </div>
      ${actHtml}
    </div>

    <div class="section">
      <div class="section-head"><div class="section-title">Menu</div></div>
      <div class="grid2">
        ${quick.map((q) => `
          <button class="quick-card" data-go="${q.page}">
            <div class="quick-ic" style="background:${q.bg};color:${q.color}">${ic(q.icon)}</div>
            <div><div class="quick-label">${q.label}</div><div class="quick-sub">${q.sub}</div></div>
          </button>`).join("")}
      </div>
    </div>

    ${jadwalPreview}

    <div class="section">
      <div class="section-head"><div class="section-title">Pengumuman Terbaru</div>
      <button class="link-more" data-go="pengumuman">Semua</button></div>
      ${pengTerbaru.map(pengItemHtml).join("") || `<div class="empty small">${ic("megaphone")}<b>Kosong</b> Belum ada pengumuman</div>`}
    </div>
  `;
}

export function mount() {
  window.__berandaTimer = setInterval(() => {
    const el = document.getElementById("big-clock");
    if (el) el.textContent = nowHMS();
  }, 1000);
}

function pengItemHtml(p) {
  return `
    <div class="peng-item ${p.penting ? "penting" : ""}">
      <div class="peng-judul">${p.penting ? `<span class="badge badge-penting">Penting</span> ` : ""}${esc(p.judul)}</div>
      <div class="peng-meta">${ic("user", "")} ${esc(p.penulis)} · ${formatDateId(p.tanggal)}</div>
    </div>`;
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

export function cleanup() {
  clearInterval(window.__berandaTimer);
}

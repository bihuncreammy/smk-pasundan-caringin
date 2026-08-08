const DB_NAME = "smk-pasundan-caringin";
const DB_VER = 1;
const STORES = [
  "users", "kelas", "mapel", "guru", "siswa",
  "jadwal", "jam_sekolah", "absensi", "pengumuman", "arsip"
];

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getDB() {
  if (!_db) _db = await openDB();
  return _db;
}

function run(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const db = _db;
    const tx = db.transaction(store, mode);
    const s = tx.objectStore(store);
    const req = fn(s);
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function all(store) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function get(store, id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function put(store, val) {
  const db = await getDB();
  return run(store, "readwrite", (s) => s.put(val));
}
export async function putMany(store, vals) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const s = tx.objectStore(store);
    vals.forEach((v) => s.put(v));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
export async function del(store, id) {
  const db = await getDB();
  return run(store, "readwrite", (s) => s.delete(id));
}

/* ================= SEED ================= */
export async function seed() {
  const existingUsers = await all("users");
  if (!existingUsers.some((x) => x.username === "arman")) {
    await put("users", { id: "u-arman", username: "arman", password: "arman123", role: "admin", nama: "Arman", kelasId: null, nis: null });
  }

  const existing = await all("kelas");
  if (existing.length) {
    await ensureOTKP();
    return;
  }

  await putMany("kelas", [
    { id: 1, nama: "X RPL 1", tingkat: "X", jurusan: "RPL" },
    { id: 2, nama: "X RPL 2", tingkat: "X", jurusan: "RPL" },
    { id: 3, nama: "X TKJ 1", tingkat: "X", jurusan: "TKJ" },
    { id: 4, nama: "XI RPL 1", tingkat: "XI", jurusan: "RPL" },
    { id: 5, nama: "XI TKJ 1", tingkat: "XI", jurusan: "TKJ" },
    { id: 6, nama: "XII RPL 1", tingkat: "XII", jurusan: "RPL" },
    { id: 7, nama: "XII TKJ 1", tingkat: "XII", jurusan: "TKJ" }
  ]);

  await putMany("mapel", [
    { id: 1, kode: "MTK", nama: "Matematika" },
    { id: 2, kode: "BINDO", nama: "Bahasa Indonesia" },
    { id: 3, kode: "BING", nama: "Bahasa Inggris" },
    { id: 4, kode: "PAI", nama: "Pendidikan Agama Islam" },
    { id: 5, kode: "PPKN", nama: "PPKn" },
    { id: 6, kode: "PJOK", nama: "PJOK" },
    { id: 7, kode: "PRPL", nama: "Produktif RPL" },
    { id: 8, kode: "PTKJ", nama: "Produktif TKJ" },
    { id: 9, kode: "FIS", nama: "Fisika" },
    { id: 10, kode: "KIM", nama: "Kimia" },
    { id: 11, kode: "SEJ", nama: "Sejarah Indonesia" },
    { id: 12, kode: "SB", nama: "Seni Budaya" },
    { id: 13, kode: "BSUNDA", nama: "Bahasa Sunda" }
  ]);

  await putMany("guru", [
    { id: 1, nama: "Ustadz Ahmad Hidayat, S.Pd.I.", mapel: "PAI", telepon: "0812-0001-0001" },
    { id: 2, nama: "Ibu Siti Rahmawati, S.Pd.", mapel: "Matematika", telepon: "0812-0001-0002" },
    { id: 3, nama: "Pak Budi Santoso, M.Pd.", mapel: "Bahasa Indonesia", telepon: "0812-0001-0003" },
    { id: 4, nama: "Bu Dina Marlina, S.Pd.", mapel: "Bahasa Inggris", telepon: "0812-0001-0004" },
    { id: 5, nama: "Pak Eko Prasetyo, S.Kom.", mapel: "Produktif RPL", telepon: "0812-0001-0005" },
    { id: 6, nama: "Bu Fitri Handayani, S.Pd.", mapel: "PPKn", telepon: "0812-0001-0006" },
    { id: 7, nama: "Pak Gilang Ramadhan, S.Or.", mapel: "PJOK", telepon: "0812-0001-0007" },
    { id: 8, nama: "Bu Hesti Purnama, S.Kom.", mapel: "Produktif TKJ", telepon: "0812-0001-0008" },
    { id: 9, nama: "Ibu Rina Kusuma, S.Pd.", mapel: "Fisika", telepon: "0812-0001-0009" },
    { id: 10, nama: "Pak Yusuf Firmansyah, S.Sn.", mapel: "Seni Budaya", telepon: "0812-0001-0010" }
  ]);

  const siswaX1 = [
    ["24001", "Ahmad Fauzi"], ["24002", "Andi Saputra"], ["24003", "Bayu Pratama"],
    ["24004", "Citra Lestari"], ["24005", "Dewi Anggraini"], ["24006", "Dika Ramdani"],
    ["24007", "Eka Nurhayati"], ["24008", "Fajar Nugraha"], ["24009", "Gita Permata"],
    ["24010", "Hendra Wijaya"]
  ];
  const siswaXI1 = [
    ["23011", "Intan Sari"], ["23012", "Joko Susilo"], ["23013", "Kurniawan"],
    ["23014", "Lina Marlina"]
  ];
  const siswaRows = [];
  siswaX1.forEach((s, i) => siswaRows.push({ id: i + 1, nis: s[0], nama: s[1], kelasId: 1 }));
  siswaXI1.forEach((s, i) => siswaRows.push({ id: 11 + i, nis: s[0], nama: s[1], kelasId: 4 }));
  await putMany("siswa", siswaRows);

  const users = [
    { id: "u-admin", username: "admin", password: "admin123", role: "admin", nama: "Administrator Sekolah", kelasId: null, nis: null },
    { id: "u-arman", username: "arman", password: "arman123", role: "admin", nama: "Arman", kelasId: null, nis: null },
    { id: "u-guru", username: "guru", password: "guru123", role: "guru", nama: "Budi Santoso, M.Pd.", kelasId: null, nis: null, guruId: 3 }
  ];
  siswaRows.forEach((s) => users.push({
    id: "u-" + s.nis, username: String(s.nis), password: "siswa123",
    role: "siswa", nama: s.nama, kelasId: s.kelasId, nis: s.nis
  }));
  await putMany("users", users);

  const M = { MTK: 1, BINDO: 2, BING: 3, PAI: 4, PPKN: 5, PJOK: 6, RPL: 7, TKJ: 8, FIS: 9, KIM: 10, SEJ: 11, SB: 12, SUNDA: 13 };
  const G = { PAI: 1, MTK: 2, BINDO: 3, BING: 4, RPL: 5, PPKN: 6, PJOK: 7, TKJ: 8, FIS: 9, SB: 10 };
  const jadwalX = [
    [1, M.BING, G.BING, "R.2"], [2, M.MTK, G.MTK, "R.2"], [3, M.PAI, G.PAI, "Musala"],
    [4, M.RPL, G.RPL, "Lab.1"], [5, M.RPL, G.RPL, "Lab.1"], [6, M.RPL, G.RPL, "Lab.1"],
    [7, M.BINDO, G.BINDO, "R.2"], [8, M.PPKN, G.PPKN, "R.2"]
  ];
  const jadwalRPL = [
    [1, M.MTK, G.MTK, "R.3"], [2, M.MTK, G.MTK, "R.3"], [3, M.SUNDA, null, "R.3"],
    [4, M.RPL, G.RPL, "Lab.1"], [5, M.RPL, G.RPL, "Lab.1"], [6, M.RPL, G.RPL, "Lab.1"],
    [7, M.BING, G.BING, "R.3"], [8, M.SEJ, null, "R.3"]
  ];
  const jadwalTKJ = [
    [1, M.FIS, G.FIS, "R.5"], [2, M.KIM, null, "R.5"], [3, M.PAI, G.PAI, "Musala"],
    [4, M.TKJ, G.TKJ, "Lab.2"], [5, M.TKJ, G.TKJ, "Lab.2"], [6, M.TKJ, G.TKJ, "Lab.2"],
    [7, M.BINDO, G.BINDO, "R.5"], [8, M.PJOK, G.PJOK, "Lapang"]
  ];
  const jadwalRows = [];
  const byKelas = { 1: jadwalX, 2: jadwalX, 3: jadwalTKJ, 4: jadwalRPL, 5: jadwalTKJ, 6: jadwalRPL, 7: jadwalTKJ };
  for (const [kelasId, list] of Object.entries(byKelas)) {
    for (let hari = 1; hari <= 6; hari++) {
      list.forEach(([jamKe, mapelId, guruId, ruang]) => {
        jadwalRows.push({ id: `j-${kelasId}-${hari}-${jamKe}`, kelasId: Number(kelasId), hari, jamKe, mapelId, guruId, ruang });
      });
    }
  }
  await putMany("jadwal", jadwalRows);

  await putMany("jam_sekolah", [
    { id: 1, nama: "Kegiatan Pagi / Piket", jamMulai: "06:30", jamSelesai: "06:45" },
    { id: 2, nama: "Apel & Doa Pagi", jamMulai: "06:45", jamSelesai: "07:00" },
    { id: 3, nama: "Jam Pelajaran 1-4", jamMulai: "07:00", jamSelesai: "09:30" },
    { id: 4, nama: "Istirahat", jamMulai: "09:30", jamSelesai: "09:50" },
    { id: 5, nama: "Jam Pelajaran 5-7", jamMulai: "09:50", jamSelesai: "12:10" },
    { id: 6, nama: "Istirahat & Sholat Dzuhur", jamMulai: "12:10", jamSelesai: "12:55" },
    { id: 7, nama: "Jam Pelajaran 8", jamMulai: "12:55", jamSelesai: "14:10" },
    { id: 8, nama: "Kebersihan & KBM Selesai", jamMulai: "14:10", jamSelesai: "15:00" }
  ]);

  await putMany("pengumuman", [
    {
      id: "p1", judul: "Penerimaan Peserta Didik Baru 2026/2027",
      isi: "Penerimaan Peserta Didik Baru (PPDB) SMK Pasundan Caringin telah dibuka.\nGelombang 1: 1 Maret - 30 Juni 2026.\nDaftar di bagian Tata Usaha setiap hari kerja pukul 08.00-14.00 WIB.",
      tanggal: todaySub(2), penulis: "Tata Usaha", penting: true
    },
    {
      id: "p2", judul: "Jadwal Penilaian Tengah Semester Genap",
      isi: "PTS Genap dilaksanakan pada 16 - 27 Maret 2026. Siswa diharapkan menyiapkan diri dan belajar dengan sungguh-sungguh.",
      tanggal: todaySub(5), penulis: "Wakasek Kurikulum", penting: false
    },
    {
      id: "p3", judul: "Kegiatan Jumat Berkah & Pembersihan Lingkungan",
      isi: "Seluruh siswa mengikuti kegiatan Jumat Berkah dan kerja bakti membersihkan lingkungan sekolah setiap hari Jumat.",
      tanggal: todaySub(9), penulis: "Wakasek Kesiswaan", penting: false
    }
  ]);

  const sampleTxt = "PROFIL SINGKAT SMK PASUNDAN CARINGIN\n\nSMK Pasundan Caringin adalah sekolah menengah kejuruan di bawah naungan Yayasan Pendidikan Pasundan, berlokasi di Jl. Samundra, Kabupaten Garut.\n\nJurusan:\n- Rekayasa Perangkat Lunak (RPL)\n- Teknik Komputer dan Jaringan (TKJ)\n\nVisi:\nTerwujudnya lulusan yang beriman, berakhlakul karimah, terampil, dan berdaya saing global.";
  await put("arsip", {
    id: "a1",
    judul: "Profil Singkat SMK Pasundan Caringin",
    kategori: "Dokumen",
    tanggal: todaySub(1),
    fileName: "profil-smk-pasundan-caringin.txt",
    mime: "text/plain",
    ukuran: new Blob([sampleTxt]).size,
    data: new Blob([sampleTxt], { type: "text/plain" }),
    keterangan: "Dokumen profil sekolah untuk keperluan informasi umum.",
    penulis: "Administrator"
  });

  await ensureOTKP();
}

function todaySub(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function ensureOTKP() {
  const kelas = await all("kelas");
  if (!kelas.some((k) => k.id === 8)) {
    await put("kelas", { id: 8, nama: "XII OTKP 1", tingkat: "XII", jurusan: "OTKP" });
  }

  const mapels = await all("mapel");
  const newMapel = [
    { id: 14, kode: "AKIDAH", nama: "Akidah Akhlak" },
    { id: 15, kode: "OTKSP", nama: "OTK Sarana Prasarana" },
    { id: 16, kode: "TIK", nama: "TIK" },
    { id: 17, kode: "HUMAS", nama: "Humas" },
    { id: 18, kode: "OTKKEP", nama: "OTK Kepegawaian" },
    { id: 19, kode: "KEU", nama: "Keuangan" },
    { id: 20, kode: "KWU", nama: "Kewirausahaan" }
  ];
  for (const m of newMapel) {
    if (!mapels.some((x) => x.id === m.id)) await put("mapel", m);
  }

  const gurus = await all("guru");
  const newGuru = [
    { id: 11, nama: "Ustadz Firdaus, S.Ag.", mapel: "Akidah Akhlak", telepon: "" },
    { id: 12, nama: "Ibu Gina Marlina, S.A.P.", mapel: "OTK Sarana Prasarana", telepon: "" },
    { id: 13, nama: "Pak Hendra Gunawan, S.Kom.", mapel: "TIK", telepon: "" },
    { id: 14, nama: "Ibu Intan Puspitasari, S.Sos.", mapel: "Humas", telepon: "" },
    { id: 15, nama: "Ibu Wulan Dari, S.A.P.", mapel: "OTK Kepegawaian", telepon: "" },
    { id: 16, nama: "Pak Rizky Ananda, S.E.", mapel: "Keuangan", telepon: "" },
    { id: 17, nama: "Ibu Nur Aini, S.E.", mapel: "Kewirausahaan", telepon: "" }
  ];
  for (const g of newGuru) {
    if (!gurus.some((x) => x.id === g.id)) await put("guru", g);
  }

  const jadwal = await all("jadwal");
  const M = { MTK: 1, BINDO: 2, BING: 3, PAI: 4, PPKN: 5, PJOK: 6, SUNDA: 13, AKIDAH: 14, OTKSP: 15, TIK: 16, HUMAS: 17, OTKKEP: 18, KEU: 19, KWU: 20 };
  const G = { PAI: 1, MTK: 2, BINDO: 3, BING: 4, PPKN: 6, PJOK: 7, AKIDAH: 11, OTKSP: 12, TIK: 13, HUMAS: 14, OTKKEP: 15, KEU: 16, KWU: 17 };
  const otkp = {
    1: [ // SENIN
      [1, M.BING, G.BING, "R.6"],
      [2, M.PAI, G.PAI, "Musala"],
      [3, M.PPKN, G.PPKN, "R.6"],
      [4, M.AKIDAH, G.AKIDAH, "Musala"]
    ],
    2: [ // SELASA
      [1, M.SUNDA, null, "R.6"],
      [2, M.OTKSP, G.OTKSP, "Kantor"],
      [3, M.TIK, G.TIK, "Lab.3"],
      [4, M.HUMAS, G.HUMAS, "Kantor"],
      [5, M.OTKKEP, G.OTKKEP, "Kantor"]
    ],
    3: [ // RABU
      [1, M.MTK, G.MTK, "R.6"],
      [2, M.PJOK, G.PJOK, "Lapang"],
      [3, M.OTKKEP, G.OTKKEP, "Kantor"],
      [4, M.OTKSP, G.OTKSP, "Kantor"]
    ],
    4: [ // KAMIS
      [1, M.BINDO, G.BINDO, "R.6"],
      [2, M.KEU, G.KEU, "Kantor"]
    ],
    5: [ // JUMAT
      [1, M.KWU, G.KWU, "Kantor"],
      [2, M.HUMAS, G.HUMAS, "Kantor"]
    ]
  };
  for (const [hari, list] of Object.entries(otkp)) {
    list.forEach(([jamKe, mapelId, guruId, ruang]) => {
      const id = `j-8-${hari}-${jamKe}`;
      if (!jadwal.some((x) => x.id === id)) {
        jadwal.push({ id, kelasId: 8, hari: Number(hari), jamKe, mapelId, guruId, ruang });
      }
    });
  }
  await putMany("jadwal", jadwal.filter((x) => x.id.startsWith("j-8-")));
}

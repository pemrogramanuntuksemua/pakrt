function str(v) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function aman(fn) {
  try {
    fn();
  } catch (e) {
    // diabaikan: formatting/validasi tidak boleh menggagalkan proses
  }
}

function parseAngka(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = str(v).replace(/[Rr]p\.?\s*/g, "").replace(/\s/g, "");
  if (!s) return 0;
  if (s.indexOf(",") >= 0) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return isFinite(n) ? n : 0;
}

function fmtRp(n) {
  const v = Math.round(Number(n) || 0);
  return "Rp " + v.toLocaleString("id-ID");
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  const s = str(v).toLowerCase();
  return s === "true" || s === "1" || s === "ya" || s === "yes";
}

function parseTanggal(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  const s = str(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatTanggal(v) {
  const d = parseTanggal(v);
  if (!d) return "-";
  const hari = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()];
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d.getMonth()];
  return hari + ", " + d.getDate() + " " + bulan + " " + d.getFullYear();
}

function formatTanggalMDY(v) {
  const d = parseTanggal(v);
  if (!d) return "";
  return pad2(d.getMonth() + 1) + "/" + pad2(d.getDate()) + "/" + d.getFullYear();
}

function formatStamp(v) {
  const d = parseTanggal(v) || new Date();
  return (
    d.getFullYear() +
    pad2(d.getMonth() + 1) +
    pad2(d.getDate()) +
    "-" +
    pad2(d.getHours()) +
    pad2(d.getMinutes())
  );
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function escMd(v) {
  return str(v).replace(/([_*`\[\]])/g, "\\$1");
}

function naturalCompare(a, b) {
  const ta = str(a).match(/(\d+|\D+)/g) || [];
  const tb = str(b).match(/(\d+|\D+)/g) || [];
  const len = Math.max(ta.length, tb.length);
  for (let i = 0; i < len; i++) {
    const x = ta[i];
    const y = tb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (/^\d+$/.test(x) && /^\d+$/.test(y)) {
      const nx = Number(x);
      const ny = Number(y);
      if (nx !== ny) return nx - ny;
    } else if (x.toLowerCase() !== y.toLowerCase()) {
      return x.toLowerCase() < y.toLowerCase() ? -1 : 1;
    }
  }
  return 0;
}

function sortNoRumah(a, b) {
  return naturalCompare(a.no_rumah, b.no_rumah);
}

function padKanan(v, n) {
  let s = str(v);
  while (s.length < n) s += " ";
  return s;
}

function padKiri(v, n) {
  let s = str(v);
  while (s.length < n) s = " " + s;
  return s;
}

function periodeSekarang(tanggal) {
  const d = tanggal instanceof Date ? tanggal : new Date();
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
}

function periodeDariTanggal(v) {
  const d = parseTanggal(v);
  if (!d) return "";
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
}

function parsePeriode(v) {
  const s = str(v);
  let m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const bulan = Number(m[2]);
    if (bulan >= 1 && bulan <= 12) {
      return { periode: m[1] + "-" + m[2], tahun: Number(m[1]), bulan: bulan, bulanan: true };
    }
    return null;
  }
  m = s.match(/^(\d{4})$/);
  if (m) return { periode: m[1], tahun: Number(m[1]), bulan: 0, bulanan: false };
  return null;
}

function bandingPeriode(a, b) {
  const x = str(a);
  const y = str(b);
  if (x === y) return 0;
  return x < y ? -1 : 1;
}

function tambahBulan(periode, n) {
  const p = parsePeriode(periode);
  if (!p || !p.bulanan) throw new Error("Periode tidak valid: " + periode);
  const total = p.tahun * 12 + (p.bulan - 1) + Number(n || 0);
  const tahun = Math.floor(total / 12);
  const bulan = (total % 12) + 1;
  return tahun + "-" + pad2(bulan);
}

function daftarPeriode(dari, sampai) {
  const a = parsePeriode(dari);
  const b = parsePeriode(sampai);
  if (!a || !a.bulanan || !b || !b.bulanan) throw new Error("Rentang periode tidak valid.");
  if (bandingPeriode(a.periode, b.periode) > 0) throw new Error("Periode awal harus <= periode akhir.");
  const hasil = [];
  let cur = a.periode;
  while (bandingPeriode(cur, b.periode) <= 0) {
    hasil.push(cur);
    cur = tambahBulan(cur, 1);
  }
  return hasil;
}

function awalPeriode(periode) {
  const p = parsePeriode(periode);
  if (!p || !p.bulanan) throw new Error("Periode tidak valid: " + periode);
  return new Date(p.tahun, p.bulan - 1, 1);
}

function akhirPeriode(periode) {
  const p = parsePeriode(periode);
  if (!p || !p.bulanan) throw new Error("Periode tidak valid: " + periode);
  return new Date(p.tahun, p.bulan, 0, 23, 59, 59, 999);
}

function namaBulan(bulan) {
  const daftar = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return daftar[Number(bulan) - 1] || "";
}

function labelPeriode(periode) {
  const p = parsePeriode(periode);
  if (!p) return str(periode);
  if (!p.bulanan) return String(p.tahun);
  return namaBulan(p.bulan) + " " + p.tahun;
}

function getSpreadsheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheetByName(name);
}

function bacaTabel(nama) {
  const sheet = getSpreadsheet(nama);
  if (!sheet) return { sheet: null, header: [], rows: [] };
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { sheet, header: [], rows: [] };
  const header = values[0].map((v) => str(v).toLowerCase());
  const skema = SHEET_SCHEMA[nama] || [];
  const rows = values.slice(1).map((raw, i) => {
    const obj = {};
    skema.forEach((kol, idx) => {
      const pos = header.indexOf(kol);
      obj[kol] = pos >= 0 ? raw[pos] : raw[idx];
    });
    obj._row = i + 2;
    obj._raw = raw;
    return obj;
  });
  return { sheet, header, rows };
}

function tambahBaris(nama, obj) {
  const sheet = getSpreadsheet(nama);
  if (!sheet) throw new Error("Tab '" + nama + "' belum dibuat. Jalankan initSheets().");
  const skema = SHEET_SCHEMA[nama] || Object.keys(obj);
  sheet.appendRow(
    skema.map((k) => (obj[k] === undefined || obj[k] === null ? "" : obj[k]))
  );
}

function setSel(nama, baris, kolom, nilai) {
  const sheet = getSpreadsheet(nama);
  if (!sheet) throw new Error("Tab '" + nama + "' belum dibuat.");
  const skema = SHEET_SCHEMA[nama] || [];
  const idx = skema.indexOf(kolom);
  if (idx < 0) throw new Error("Kolom '" + kolom + "' tidak dikenal di " + nama + ".");
  sheet.getRange(baris, idx + 1).setValue(nilai);
}

function konversiNilai(nilai, tipe) {
  const t = str(tipe).toLowerCase();
  if (t === "angka") return parseAngka(nilai);
  if (t === "boolean") return toBool(nilai);
  if (t === "teks") return str(nilai);
  if (typeof nilai === "number") return nilai;
  if (typeof nilai === "boolean") return nilai;
  return str(nilai);
}

function getSettings() {
  const hasil = {};
  Object.keys(DEFAULT_SETTINGS).forEach((k) => {
    hasil[k] = DEFAULT_SETTINGS[k].nilai;
  });
  bacaTabel(SHEET_SETTING).rows.forEach((r) => {
    const kunci = str(r.kunci);
    if (!kunci) return;
    const tipe = str(r.tipe) || (DEFAULT_SETTINGS[kunci] ? DEFAULT_SETTINGS[kunci].tipe : "");
    hasil[kunci] = konversiNilai(r.nilai, tipe);
  });
  return hasil;
}

function getSetting(kunci, fallback) {
  const semua = getSettings();
  if (Object.prototype.hasOwnProperty.call(semua, kunci)) return semua[kunci];
  return fallback === undefined ? "" : fallback;
}

function setSetting(kunci, nilai) {
  const kunciBersih = str(kunci);
  if (!kunciBersih) throw new Error("Kunci setting tidak boleh kosong.");
  const { rows } = bacaTabel(SHEET_SETTING);
  const ada = rows.filter((r) => str(r.kunci) === kunciBersih)[0];
  const def = DEFAULT_SETTINGS[kunciBersih];
  const tipe = def ? def.tipe : typeof nilai === "number" ? "angka" : typeof nilai === "boolean" ? "boolean" : "teks";
  if (ada) {
    setSel(SHEET_SETTING, ada._row, "nilai", nilai);
    setSel(SHEET_SETTING, ada._row, "tipe", tipe);
    return nilai;
  }
  tambahBaris(SHEET_SETTING, {
    kunci: kunciBersih,
    nilai: nilai,
    tipe: tipe,
    keterangan: def ? def.keterangan : "",
  });
  return nilai;
}

function generateIdKK(noRumah) {
  const lock = LockService.getScriptLock();
  let locked = false;
  aman(() => {
    locked = lock.tryLock(10000);
  });
  try {
    const rumah = str(noRumah).toUpperCase().replace(/\s+/g, "");
    const digits = rumah.replace(/\D/g, "");
    const baseDigits = (digits || rumah || "0").padStart(3, "0");
    const base = "KK" + baseDigits;
    const existing = getKeluarga()
      .map((k) => str(k.id_kk).toUpperCase())
      .filter((id) => id === base || id.indexOf(base) === 0);
    if (!existing.length) return base;
    if (existing.indexOf(base) < 0) return base;
    let maxIndex = 1;
    existing.forEach((id) => {
      const rest = id.slice(base.length);
      if (rest === "") {
        maxIndex = Math.max(maxIndex, 1);
      } else if (/^\d+$/.test(rest)) {
        maxIndex = Math.max(maxIndex, Number(rest));
      }
    });
    const nextIndex = maxIndex + 1;
    if (nextIndex <= 1) return base;
    if (nextIndex === 2) return base + "02";
    return base + String(nextIndex).padStart(2, "0");
  } finally {
    if (locked) aman(() => lock.releaseLock());
  }
}

function getKeluarga() {
  return bacaTabel(SHEET_KELUARGA).rows
    .map((k) => ({
      id_kk: str(k.id_kk),
      no_rumah: str(k.no_rumah),
      nama_kk: str(k.nama_kk),
      no_hp: str(k.no_hp),
      alamat: str(k.alamat),
      status: str(k.status) || "Aktif",
      mulai_iuran: str(k.mulai_iuran),
      catatan: str(k.catatan),
      _row: k._row,
    }))
    .filter((k) => k.id_kk);
}

function getKeluargaAktif() {
  return getKeluarga().filter((k) => k.status.toLowerCase() === "aktif");
}

function getKeluargaBillable(periode) {
  const p = str(periode) || periodeSekarang();
  return getKeluargaAktif().filter((k) => {
    if (!k.mulai_iuran) return true;
    if (!parsePeriode(k.mulai_iuran)) return true;
    return bandingPeriode(k.mulai_iuran, p) <= 0;
  });
}

function getAnggota(idKK) {
  const target = str(idKK).toUpperCase();
  return bacaTabel(SHEET_ANGGOTA).rows
    .map((a) => ({
      id_kk: str(a.id_kk),
      nama: str(a.nama),
      hubungan: str(a.hubungan),
      jenis_kelamin: str(a.jenis_kelamin).toUpperCase(),
      tanggal_lahir: str(a.tanggal_lahir),
      status: str(a.status) || "Aktif",
      catatan: str(a.catatan),
      _row: a._row,
    }))
    .filter((a) => a.id_kk && a.id_kk.toUpperCase() === target);
}

function getAnggotaAktif(idKK) {
  return getAnggota(idKK).filter((a) => a.status.toLowerCase() === "aktif");
}

function getJumlahJiwaKK(idKK) {
  return getAnggotaAktif(idKK).length;
}

function getJumlahJiwa(periode) {
  const ids = {};
  getKeluargaBillable(periode).forEach((k) => {
    ids[k.id_kk] = true;
  });
  return bacaTabel(SHEET_ANGGOTA).rows.filter((a) => {
    return (
      str(a.status).toLowerCase() === "aktif" &&
      ids[str(a.id_kk)] === true
    );
  }).length;
}

function getJumlahJiwaUntukIds(ids) {
  const map = {};
  (ids || []).forEach((id) => {
    map[str(id)] = true;
  });
  const anggota = bacaTabel(SHEET_ANGGOTA).rows;
  const kepala = {};
  anggota.forEach((a) => {
    if (map[str(a.id_kk)] && str(a.status).toLowerCase() === "aktif") {
      kepala[str(a.id_kk)] = true;
    }
  });
  return Object.keys(kepala).reduce((total, id) => total + getAnggotaAktif(id).length, 0);
}

function normalizeJK(v) {
  const s = str(v).toLowerCase();
  if (s === "l" || s === "laki-laki" || s === "laki laki" || s === "pria") return "L";
  if (s === "p" || s === "perempuan" || s === "wanita") return "P";
  return str(v);
}

function cariKeluarga(identifier) {
  const key = str(identifier);
  if (!key) throw new Error("Identifier KK kosong.");
  const semua = getKeluarga();
  const up = key.toUpperCase();
  let found = semua.filter((k) => k.id_kk.toUpperCase() === up);
  if (found.length === 1) return found[0];
  found = semua.filter((k) => k.no_rumah && k.no_rumah.toUpperCase() === up);
  if (found.length === 1) return found[0];
  const nama = semua.filter((k) => k.nama_kk && k.nama_kk.toUpperCase() === up);
  if (nama.length === 1) return nama[0];
  if (found.length > 1 || nama.length > 1) {
    throw new Error("'" + key + "' cocok dengan lebih dari satu KK. Gunakan id_kk.");
  }
  const partial = semua.filter((k) => k.nama_kk && k.nama_kk.toUpperCase().indexOf(up) >= 0);
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new Error("'" + key + "' cocok dengan lebih dari satu KK. Gunakan id_kk.");
  }
  throw new Error("KK '" + key + "' tidak ditemukan.");
}

function tambahKeluarga(data, oleh) {
  const d = data || {};
  const nama = str(d.nama_kk);
  const rumah = str(d.no_rumah);
  if (!nama) throw new Error("Nama kepala keluarga wajib diisi.");
  if (!rumah) throw new Error("Nomor rumah wajib diisi.");
  const id = generateIdKK(rumah);
  const mulai = str(d.mulai_iuran) || str(getSetting("iuran_mulai_default")) || periodeSekarang();
  tambahBaris(SHEET_KELUARGA, {
    id_kk: id,
    no_rumah: rumah,
    nama_kk: nama,
    no_hp: str(d.no_hp),
    alamat: str(d.alamat),
    status: str(d.status) || "Aktif",
    mulai_iuran: mulai,
    catatan: str(d.catatan),
  });
  tambahBaris(SHEET_ANGGOTA, {
    id_kk: id,
    nama: nama,
    hubungan: "Kepala Keluarga",
    jenis_kelamin: normalizeJK(d.jenis_kelamin),
    tanggal_lahir: str(d.tanggal_lahir),
    status: "Aktif",
    catatan: "",
  });
  return cariKeluarga(id);
}

function tambahAnggota(idKK, data) {
  const kk = cariKeluarga(idKK);
  const d = data || {};
  const nama = str(d.nama);
  if (!nama) throw new Error("Nama anggota wajib diisi.");
  const hubungan = str(d.hubungan) || "Anggota";
  const daftar = getAnggota(kk.id_kk);
  if (hubungan.toLowerCase() === "kepala keluarga") {
    const sudah = daftar.filter(
      (a) => a.hubungan.toLowerCase() === "kepala keluarga" && a.status.toLowerCase() === "aktif"
    );
    if (sudah.length > 0) {
      throw new Error("KK " + kk.id_kk + " sudah punya kepala keluarga.");
    }
  }
  tambahBaris(SHEET_ANGGOTA, {
    id_kk: kk.id_kk,
    nama: nama,
    hubungan: hubungan,
    jenis_kelamin: normalizeJK(d.jenis_kelamin),
    tanggal_lahir: str(d.tanggal_lahir),
    status: str(d.status) || "Aktif",
    catatan: str(d.catatan),
  });
  return daftar.concat([{ id_kk: kk.id_kk, nama: nama, hubungan: hubungan }]);
}

function ubahAnggota(idKK, namaLama, perubahan) {
  const kk = cariKeluarga(idKK);
  const daftar = getAnggota(kk.id_kk);
  const target = str(namaLama).toLowerCase();
  if (!target) throw new Error("Sebutkan nama anggota yang diubah.");
  const cocok = daftar.filter((a) => a.nama.toLowerCase() === target);
  if (!cocok.length) {
    throw new Error(
      "Anggota '" + str(namaLama) + "' tidak ditemukan di " + kk.id_kk +
      (daftar.length ? ". Anggota: " + daftar.map((a) => a.nama).join(", ") : ".")
    );
  }
  if (cocok.length > 1) {
    throw new Error(
      "Ada " + cocok.length + " anggota bernama '" + str(namaLama) +
      "'. Bedakan namanya dulu atau edit sheet Anggota."
    );
  }
  const a = cocok[0];
  const d = perubahan || {};
  const punya = (k) => Object.prototype.hasOwnProperty.call(d, k);
  const baru = {};

  if (punya("nama")) {
    const nama = str(d.nama);
    if (!nama) throw new Error("Nama anggota tidak boleh kosong.");
    const bentrok = daftar.filter(
      (x) => x._row !== a._row && x.nama.toLowerCase() === nama.toLowerCase()
    );
    if (bentrok.length) {
      throw new Error("Nama '" + nama + "' sudah dipakai anggota lain di KK ini.");
    }
    baru.nama = nama;
  }
  if (punya("hubungan")) {
    const hubungan = str(d.hubungan);
    if (!hubungan) throw new Error("Hubungan tidak boleh kosong.");
    if (hubungan.toLowerCase() === "kepala keluarga") {
      const lain = daftar.filter(
        (x) =>
          x._row !== a._row &&
          x.hubungan.toLowerCase() === "kepala keluarga" &&
          x.status.toLowerCase() === "aktif"
      );
      if (lain.length) {
        throw new Error("KK " + kk.id_kk + " sudah punya kepala keluarga aktif.");
      }
    }
    baru.hubungan = hubungan;
  }
  if (punya("jenis_kelamin")) {
    const jk = normalizeJK(d.jenis_kelamin);
    if (jk !== "L" && jk !== "P") throw new Error("Jenis kelamin harus L atau P.");
    baru.jenis_kelamin = jk;
  }
  if (punya("tanggal_lahir")) {
    const v = str(d.tanggal_lahir);
    if (!v || v === "-") {
      baru.tanggal_lahir = "";
    } else {
      const tgl = parseTanggal(v);
      if (!tgl) throw new Error("Tanggal lahir tidak valid. Gunakan YYYY-MM-DD.");
      baru.tanggal_lahir =
        tgl.getFullYear() + "-" + pad2(tgl.getMonth() + 1) + "-" + pad2(tgl.getDate());
    }
  }
  if (punya("status")) {
    const status = str(d.status);
    const kanonik = ["Aktif", "Pindah", "Meninggal"].filter(
      (s) => s.toLowerCase() === status.toLowerCase()
    )[0];
    if (!kanonik) throw new Error("Status harus Aktif, Pindah, atau Meninggal.");
    baru.status = kanonik;
  }
  if (punya("catatan")) {
    const c = str(d.catatan);
    baru.catatan = c === "-" ? "" : c;
  }
  if (!Object.keys(baru).length) throw new Error("Tidak ada perubahan.");

  Object.keys(baru).forEach((k) => setSel(SHEET_ANGGOTA, a._row, k, baru[k]));
  const kepala = a.hubungan.toLowerCase() === "kepala keluarga";
  if (baru.nama && kepala) {
    setSel(SHEET_KELUARGA, kk._row, "nama_kk", baru.nama);
  }
  return {
    id_kk: kk.id_kk,
    nama_kk: baru.nama && kepala ? baru.nama : kk.nama_kk,
    sebelum: a,
    sesudah: Object.assign({}, a, baru),
    perubahan: baru,
  };
}

function getTelegramUserRows() {
  return bacaTabel(SHEET_TELEGRAM_USER).rows
    .map((t) => ({
      id_telegram: str(t.id_telegram),
      username: str(t.username),
      nama: str(t.nama),
      id_kk: str(t.id_kk),
      peran: str(t.peran).toLowerCase() || "warga",
      status: str(t.status).toLowerCase() || TELEGRAM_MENUNGGU,
      diminta_pada: t.diminta_pada,
      diverifikasi_oleh: str(t.diverifikasi_oleh),
      diverifikasi_pada: t.diverifikasi_pada,
      _row: t._row,
    }))
    .filter((t) => t.id_telegram && t.id_kk);
}

function cariTelegramUser(idTelegram, idKK) {
  const id = str(idTelegram);
  const kk = str(idKK);
  return (
    getTelegramUserRows().filter((t) => t.id_telegram === id && t.id_kk === kk)[0] || null
  );
}

function getKkTerhubung(idTelegram) {
  const id = str(idTelegram);
  if (!id) return [];
  const keluarga = getKeluarga();
  return getTelegramUserRows()
    .filter((t) => t.id_telegram === id && t.status === TELEGRAM_AKTIF)
    .map((t) => {
      const kk = keluarga.filter((k) => k.id_kk === t.id_kk)[0];
      return kk
        ? {
            id_kk: kk.id_kk,
            no_rumah: kk.no_rumah,
            nama_kk: kk.nama_kk,
            status_kk: kk.status,
          }
        : null;
    })
    .filter(Boolean);
}

function isKkTerhubung(idTelegram, idKK) {
  return getKkTerhubung(idTelegram).some((k) => k.id_kk === str(idKK));
}

function batasTelegramPerKk() {
  return Math.max(0, parseAngka(getSetting("maks_telegram_per_kk")));
}

function batasKkPerTelegram() {
  return Math.max(0, parseAngka(getSetting("maks_kk_per_telegram")));
}

function hitungAkunKk(idKK) {
  const kk = str(idKK);
  return getTelegramUserRows().filter(
    (t) =>
      t.id_kk === kk &&
      (t.status === TELEGRAM_MENUNGGU || t.status === TELEGRAM_AKTIF)
  ).length;
}

function hitungKkAktifTelegram(idTelegram) {
  const id = str(idTelegram);
  const seen = {};
  getTelegramUserRows().forEach((t) => {
    if (t.id_telegram === id && t.status === TELEGRAM_AKTIF) seen[t.id_kk] = true;
  });
  return Object.keys(seen).length;
}

function ajukanKeterkaitan(idTelegram, username, nama, identifier) {
  const id = str(idTelegram);
  if (!id) throw new Error("ID Telegram tidak valid.");
  const kk = cariKeluarga(identifier);
  if (str(kk.status).toLowerCase() !== "aktif") {
    throw new Error(
      "KK " + kk.id_kk + " berstatus " + kk.status + " dan tidak bisa dihubungkan."
    );
  }
  const semua = getTelegramUserRows();
  const ada = semua.filter((t) => t.id_telegram === id && t.id_kk === kk.id_kk)[0];
  if (ada && ada.status === TELEGRAM_AKTIF) {
    return { id_telegram: id, id_kk: kk.id_kk, status: TELEGRAM_AKTIF, sudah: true, keluarga: kk };
  }
  if (ada && ada.status === TELEGRAM_MENUNGGU) {
    return { id_telegram: id, id_kk: kk.id_kk, status: TELEGRAM_MENUNGGU, sudah: true, keluarga: kk };
  }
  const batasKk = batasKkPerTelegram();
  if (batasKk > 0 && hitungKkAktifTelegram(id) >= batasKk) {
    throw new Error(
      "Akun ini sudah terhubung ke " + batasKk + " KK. Maksimal " + batasKk + " KK per akun."
    );
  }
  const batasAkun = batasTelegramPerKk();
  if (batasAkun > 0) {
    const sudah = semua.filter(
      (t) =>
        t.id_kk === kk.id_kk &&
        t.id_telegram !== id &&
        (t.status === TELEGRAM_MENUNGGU || t.status === TELEGRAM_AKTIF)
    ).length;
    if (sudah >= batasAkun) {
      throw new Error(
        "KK " + kk.id_kk + " sudah punya " + sudah + " akun terhubung/pending. Maksimal " +
          batasAkun + " akun per KK."
      );
    }
  }
  if (ada) {
    setSel(SHEET_TELEGRAM_USER, ada._row, "username", str(username));
    setSel(SHEET_TELEGRAM_USER, ada._row, "nama", str(nama));
    setSel(SHEET_TELEGRAM_USER, ada._row, "status", TELEGRAM_MENUNGGU);
    setSel(SHEET_TELEGRAM_USER, ada._row, "diminta_pada", new Date());
    setSel(SHEET_TELEGRAM_USER, ada._row, "diverifikasi_oleh", "");
    setSel(SHEET_TELEGRAM_USER, ada._row, "diverifikasi_pada", "");
  } else {
    tambahBaris(SHEET_TELEGRAM_USER, {
      id_telegram: id,
      username: str(username),
      nama: str(nama),
      id_kk: kk.id_kk,
      peran: "warga",
      status: TELEGRAM_MENUNGGU,
      diminta_pada: new Date(),
      diverifikasi_oleh: "",
      diverifikasi_pada: "",
    });
  }
  return { id_telegram: id, id_kk: kk.id_kk, status: TELEGRAM_MENUNGGU, sudah: false, keluarga: kk };
}

function barisUntukArg(arg) {
  const a = str(arg);
  if (!a) throw new Error("Sebutkan id_kk atau id_telegram.");
  const semua = getTelegramUserRows();
  if (/^\d+$/.test(a)) {
    const byId = semua.filter((t) => t.id_telegram === a);
    if (byId.length) return byId;
  }
  const kk = cariKeluarga(a);
  return semua.filter((t) => t.id_kk === kk.id_kk);
}

function verifikasiKeterkaitan(arg, oleh) {
  const rows = barisUntukArg(arg);
  const menunggu = rows.filter((t) => t.status === TELEGRAM_MENUNGGU);
  if (!menunggu.length) {
    const aktif = rows.filter((t) => t.status === TELEGRAM_AKTIF);
    if (aktif.length) {
      throw new Error("Akun untuk '" + str(arg) + "' sudah aktif.");
    }
    throw new Error("Tidak ada pengajuan menunggu untuk '" + str(arg) + "'.");
  }
  if (menunggu.length > 1) {
    throw new Error(
      "Ada lebih dari satu pengajuan. Gunakan id_telegram: " +
        menunggu.map((t) => t.id_telegram).join(", ")
    );
  }
  const t = menunggu[0];
  const batasAkun = batasTelegramPerKk();
  if (batasAkun > 0) {
    const aktifLain = getTelegramUserRows().filter(
      (x) =>
        x.id_kk === t.id_kk &&
        x.status === TELEGRAM_AKTIF &&
        x.id_telegram !== t.id_telegram
    ).length;
    if (aktifLain >= batasAkun) {
      throw new Error(
        "KK " + t.id_kk + " sudah punya " + batasAkun + " akun aktif. Cabut salah satu dulu."
      );
    }
  }
  const batasKk = batasKkPerTelegram();
  if (batasKk > 0) {
    const sudah = getKkTerhubung(t.id_telegram).some((k) => k.id_kk === t.id_kk);
    if (!sudah && hitungKkAktifTelegram(t.id_telegram) >= batasKk) {
      throw new Error(
        "Akun ini sudah terhubung ke " + batasKk + " KK. Maksimal " + batasKk + " KK per akun."
      );
    }
  }
  const sekarang = new Date();
  setSel(SHEET_TELEGRAM_USER, t._row, "status", TELEGRAM_AKTIF);
  setSel(SHEET_TELEGRAM_USER, t._row, "diverifikasi_oleh", str(oleh));
  setSel(SHEET_TELEGRAM_USER, t._row, "diverifikasi_pada", sekarang);
  return Object.assign({}, t, {
    status: TELEGRAM_AKTIF,
    diverifikasi_oleh: str(oleh),
    diverifikasi_pada: sekarang,
    keluarga: cariKeluarga(t.id_kk),
  });
}

function tolakKeterkaitan(arg, oleh) {
  const rows = barisUntukArg(arg);
  const menunggu = rows.filter((t) => t.status === TELEGRAM_MENUNGGU);
  if (!menunggu.length) {
    const aktif = rows.filter((t) => t.status === TELEGRAM_AKTIF);
    if (aktif.length) {
      throw new Error("Akun sudah aktif. Gunakan /cabut untuk memutuskan.");
    }
    throw new Error("Tidak ada pengajuan menunggu untuk '" + str(arg) + "'.");
  }
  if (menunggu.length > 1) {
    throw new Error(
      "Ada lebih dari satu pengajuan. Gunakan id_telegram: " +
        menunggu.map((t) => t.id_telegram).join(", ")
    );
  }
  const t = menunggu[0];
  const sekarang = new Date();
  setSel(SHEET_TELEGRAM_USER, t._row, "status", TELEGRAM_DITOLAK);
  setSel(SHEET_TELEGRAM_USER, t._row, "diverifikasi_oleh", str(oleh));
  setSel(SHEET_TELEGRAM_USER, t._row, "diverifikasi_pada", sekarang);
  return Object.assign({}, t, {
    status: TELEGRAM_DITOLAK,
    diverifikasi_oleh: str(oleh),
    diverifikasi_pada: sekarang,
    keluarga: cariKeluarga(t.id_kk),
  });
}

function cabutKeterkaitan(arg, oleh) {
  const rows = barisUntukArg(arg).filter((t) => t.status === TELEGRAM_AKTIF);
  if (!rows.length) {
    throw new Error("Tidak ada keterkaitan aktif untuk '" + str(arg) + "'.");
  }
  const sekarang = new Date();
  rows.forEach((t) => {
    setSel(SHEET_TELEGRAM_USER, t._row, "status", TELEGRAM_DICABUT);
    setSel(SHEET_TELEGRAM_USER, t._row, "diverifikasi_oleh", str(oleh));
    setSel(SHEET_TELEGRAM_USER, t._row, "diverifikasi_pada", sekarang);
  });
  return rows.map((t) =>
    Object.assign({}, t, {
      status: TELEGRAM_DICABUT,
      diverifikasi_oleh: str(oleh),
      diverifikasi_pada: sekarang,
    })
  );
}

function isPrivateChat(chatId) {
  const n = Number(chatId);
  return isFinite(n) && n > 0;
}

function notifPengajuanAdmin(hasil, username, nama) {
  const daftarAdmin = getAdminIds();
  if (!daftarAdmin.length) return;
  const kk = hasil.keluarga || {};
  const teks =
    "🔔 *Pengajuan Keterkaitan*\n\n" +
    "👤 " + escMd(nama || "-") +
    (username ? " (@" + escMd(username) + ")" : "") + "\n" +
    "🆔 id_telegram: `" + hasil.id_telegram + "`\n" +
    "🏠 KK: *" + kk.id_kk + "* · " + escMd(kk.no_rumah) + " · " + escMd(kk.nama_kk) + "\n\n" +
    "Setujui: `/verifikasi " + kk.id_kk + "`\n" +
    "Tolak: `/tolak " + kk.id_kk + "`";
  daftarAdmin.forEach((id) => {
    try {
      sendAdminMessage(id, teks);
    } catch (e) {
      Logger.log("Gagal kirim notifikasi ke admin " + id + ": " + e.toString());
    }
  });
}

function getTarifList() {
  return bacaTabel(SHEET_TARIF).rows
    .map((t) => ({
      berlaku_mulai: str(t.berlaku_mulai),
      nominal: parseAngka(t.nominal),
      keterangan: str(t.keterangan),
      _row: t._row,
    }))
    .filter((t) => t.berlaku_mulai && t.nominal > 0)
    .sort((a, b) => bandingPeriode(a.berlaku_mulai, b.berlaku_mulai));
}

function getTarifUntukPeriode(periode) {
  const target = str(periode).slice(0, 7) || periodeSekarang();
  let hasil = null;
  getTarifList().forEach((t) => {
    if (bandingPeriode(t.berlaku_mulai, target) <= 0) hasil = t;
  });
  if (hasil) return hasil.nominal;
  return parseAngka(getSetting("iuran_bulanan"));
}

function setTarif(periode, nominal, keterangan) {
  const p = parsePeriode(periode);
  if (!p || !p.bulanan) throw new Error("Periode tarif harus format YYYY-MM.");
  const angka = Math.round(Number(nominal));
  if (!isFinite(angka) || angka <= 0) throw new Error("Nominal tarif harus angka > 0.");
  if (isPeriodeTertutup(p.periode)) throw new Error("Periode " + p.periode + " sudah ditutup.");
  const pembagian = hitungPembagian(angka);
  const { rows } = bacaTabel(SHEET_TARIF);
  const ada = rows.filter((r) => str(r.berlaku_mulai) === p.periode)[0];
  if (ada) {
    setSel(SHEET_TARIF, ada._row, "nominal", angka);
    setSel(SHEET_TARIF, ada._row, "keterangan", str(keterangan));
  } else {
    tambahBaris(SHEET_TARIF, {
      berlaku_mulai: p.periode,
      nominal: angka,
      keterangan: str(keterangan),
    });
  }
  const diubah = sesuaikanTarifPeriode(p.periode, angka);
  return { periode: p.periode, nominal: angka, tagihanDiubah: diubah, pembagian: pembagian };
}

function sesuaikanTarifPeriode(periode, nominal) {
  let jumlah = 0;
  getTagihanPeriode(periode).forEach((t) => {
    if (t.status === TAGIHAN_BELUM && t.nominal !== nominal) {
      setSel(SHEET_TAGIHAN, t._row, "nominal", nominal);
      jumlah++;
    }
  });
  return jumlah;
}

function getAlokasiAktif() {
  const list = bacaTabel(SHEET_ALOKASI).rows
    .map((a) => ({
      kode: str(a.kode),
      nama: str(a.nama) || str(a.kode),
      nominal: Math.max(0, parseAngka(a.nominal)),
      sisa: toBool(a.sisa),
      keterangan: str(a.keterangan),
      _row: a._row,
    }))
    .filter((a) => a.kode);
  if (!list.length) {
    return DEFAULT_ALOKASI.map((a) => ({ ...a }));
  }
  return list;
}

function validasiAlokasi(list) {
  const daftar = list || getAlokasiAktif();
  if (!daftar.length) throw new Error("AlokasiIuran kosong. Jalankan seedAlokasiDefault().");
  const seen = {};
  daftar.forEach((a) => {
    if (!/^[a-z0-9]{1,8}$/.test(a.kode)) {
      throw new Error("Kode kantong '" + a.kode + "' tidak valid (huruf kecil/angka, maks 8).");
    }
    if (seen[a.kode]) throw new Error("Kode kantong duplikat: " + a.kode);
    seen[a.kode] = true;
    if (a.nominal < 0) throw new Error("Nominal kantong " + a.kode + " tidak boleh negatif.");
  });
  const sisa = daftar.filter((a) => a.sisa);
  if (sisa.length !== 1) {
    throw new Error("Harus ada tepat satu kantong bertanda sisa=TRUE (sekarang " + sisa.length + ").");
  }
  const totalTetap = daftar
    .filter((a) => !a.sisa)
    .reduce((total, a) => total + a.nominal, 0);
  return { list: daftar, sisaKode: sisa[0].kode, totalTetap: totalTetap };
}

function hitungPembagian(nominal) {
  const v = validasiAlokasi();
  const total = Math.round(Number(nominal) || 0);
  if (total <= 0) throw new Error("Nominal pembagian harus > 0.");
  const sisa = total - v.totalTetap;
  if (sisa < 0) {
    throw new Error(
      "Alokasi tetap (" + fmtRp(v.totalTetap) + ") melebihi nominal (" + fmtRp(total) + ")."
    );
  }
  return v.list
    .map((a) => ({
      kode: a.kode,
      nama: a.nama,
      nominal: a.sisa ? sisa : a.nominal,
    }))
    .filter((a) => a.nominal > 0);
}

function getTagihan() {
  return bacaTabel(SHEET_TAGIHAN).rows
    .map((t) => ({
      periode: str(t.periode),
      id_kk: str(t.id_kk),
      no_rumah: str(t.no_rumah),
      nama_kk: str(t.nama_kk),
      nominal: parseAngka(t.nominal),
      status: str(t.status).toLowerCase() || TAGIHAN_BELUM,
      tanggal_bayar: t.tanggal_bayar,
      dicatat_oleh: str(t.dicatat_oleh),
      catatan: str(t.catatan),
      _row: t._row,
    }))
    .filter((t) => t.periode && t.id_kk);
}

function getTagihanPeriode(periode) {
  const p = str(periode);
  return getTagihan().filter((t) => t.periode === p);
}

function cariTagihan(idKK, periode) {
  const id = str(idKK).toUpperCase();
  const p = str(periode).toUpperCase();
  const list = getTagihan().filter((t) => str(t.id_kk).toUpperCase() === id && str(t.periode).toUpperCase() === p);
  if (list.length) return list[0];
  // Fallback: periode tersimpan mungkin lebih panjang (mis. YYYY-MM-DD)
  const fallback = getTagihan().filter((t) => str(t.id_kk).toUpperCase() === id && str(t.periode).toUpperCase().startsWith(p));
  if (fallback.length === 1) return fallback[0];
  return null;
}

function isPeriodeTertutup(periode) {
  const p = str(periode);
  if (!p) return false;
  return getTutupBuku().some((t) => t.jenis === "bulan" && t.periode === p);
}

function pastikanTagihan(periode) {
  const p = parsePeriode(periode);
  if (!p || !p.bulanan) throw new Error("Periode tagihan harus format YYYY-MM.");
  if (bandingPeriode(p.periode, periodeSekarang()) > 0) return 0;
  if (isPeriodeTertutup(p.periode)) return 0;
  const tarif = getTarifUntukPeriode(p.periode);
  if (!tarif || tarif <= 0) throw new Error("Tarif periode " + p.periode + " belum diatur.");
  const ada = {};
  getTagihanPeriode(p.periode).forEach((t) => {
    ada[t.id_kk] = true;
  });
  const baru = getKeluargaBillable(p.periode).filter((k) => !ada[k.id_kk]);
  baru.forEach((k) => {
    tambahBaris(SHEET_TAGIHAN, {
      periode: p.periode,
      id_kk: k.id_kk,
      no_rumah: k.no_rumah,
      nama_kk: k.nama_kk,
      nominal: tarif,
      status: TAGIHAN_BELUM,
      tanggal_bayar: "",
      dicatat_oleh: "",
      catatan: "",
    });
  });
  return baru.length;
}

function backfillTagihan(dari, sampai) {
  const a = parsePeriode(dari);
  const b = parsePeriode(sampai);
  if (!a || !a.bulanan || !b || !b.bulanan) {
    throw new Error("Backfill butuh periode awal & akhir format YYYY-MM.");
  }
  if (bandingPeriode(a.periode, b.periode) > 0) {
    throw new Error("Periode awal harus <= periode akhir.");
  }
  let total = 0;
  daftarPeriode(a.periode, b.periode).forEach((p) => {
    total += pastikanTagihan(p);
  });
  return total;
}

function hitungTunggakanKK(idKK, sampaiPeriode) {
  const batas = str(sampaiPeriode) || periodeSekarang();
  return getTagihan()
    .filter(
      (t) =>
        t.id_kk === str(idKK) &&
        t.status === TAGIHAN_BELUM &&
        bandingPeriode(t.periode, batas) <= 0
    )
    .reduce((total, t) => total + t.nominal, 0);
}

function hitungTunggakan(sampaiPeriode) {
  const batas = str(sampaiPeriode) || periodeSekarang();
  return getTagihan()
    .filter((t) => t.status === TAGIHAN_BELUM && bandingPeriode(t.periode, batas) <= 0)
    .reduce((total, t) => total + t.nominal, 0);
}

function getBulanTunggakanKK(idKK, sampaiPeriode) {
  const batas = str(sampaiPeriode) || periodeSekarang();
  return getTagihan().filter(
    (t) =>
      t.id_kk === str(idKK) &&
      t.status === TAGIHAN_BELUM &&
      bandingPeriode(t.periode, batas) <= 0
  ).length;
}

function refPembayaran(periode, idKK) {
  return "BYR-" + str(periode).replace("-", "") + "-" + str(idKK).replace(/-/g, "");
}

function kasRefAda(ref, kode) {
  const r = str(ref);
  const k = str(kode).toLowerCase();
  return getKas().some((j) => j.ref === r && j.alokasi === k);
}

function catatPembayaran(keluarga, periodeList, oleh) {
  const kk = keluarga || {};
  if (!kk.id_kk) throw new Error("Data KK tidak valid.");
  const periods = [];
  (periodeList && periodeList.length ? periodeList : [periodeSekarang()]).forEach((p) => {
    const pp = parsePeriode(p);
    if (!pp || !pp.bulanan) throw new Error("Periode tidak valid: " + p);
    if (periods.indexOf(pp.periode) < 0) periods.push(pp.periode);
  });
  periods.forEach((p) => {
    if (isPeriodeTertutup(p)) throw new Error("Periode " + p + " sudah ditutup.");
    if (bandingPeriode(p, periodeSekarang()) > 0) {
      throw new Error("Tidak bisa membayar periode masa depan: " + p);
    }
    pastikanTagihan(p);
  });
  const target = periods.map((p) => {
    const t = cariTagihan(kk.id_kk, p);
    if (!t) {
      const tersedia = getTagihan()
        .filter((x) => str(x.id_kk).toUpperCase() === str(kk.id_kk).toUpperCase())
        .map((x) => str(x.periode))
        .filter(Boolean);
      const uniq = Array.from(new Set(tersedia));
      throw new Error(
        "KK " + kk.id_kk + " tidak ditagih pada " + p +
        ". Tersedia: " + (uniq.length ? uniq.join(", ") : "-") + "."
      );
    }
    if (t.status === TAGIHAN_LUNAS) {
      throw new Error("Tagihan " + kk.id_kk + " periode " + p + " sudah lunas.");
    }
    if (t.status !== TAGIHAN_BELUM) {
      throw new Error("Tagihan " + p + " berstatus '" + t.status + "' dan tidak bisa dibayar.");
    }
    return { periode: p, tagihan: t };
  });
  const detail = target.map((x) => ({
    periode: x.periode,
    nominal: x.tagihan.nominal,
    pembagian: hitungPembagian(x.tagihan.nominal),
  }));
  target.forEach((x) => {
    setSel(SHEET_TAGIHAN, x.tagihan._row, "status", TAGIHAN_LUNAS);
    setSel(SHEET_TAGIHAN, x.tagihan._row, "tanggal_bayar", new Date());
    setSel(SHEET_TAGIHAN, x.tagihan._row, "dicatat_oleh", str(oleh));
  });
  const kasBaru = [];
  detail.forEach((d) => {
    const ref = refPembayaran(d.periode, kk.id_kk);
    d.pembagian.forEach((b) => {
      if (kasRefAda(ref, b.kode)) return;
      tambahBaris(SHEET_KAS, {
        tanggal: new Date(),
        keterangan: "Iuran " + d.periode + " - " + kk.nama_kk + " (" + kk.id_kk + ")",
        jenis: JENIS_MASUK,
        nominal: b.nominal,
        alokasi: b.kode,
        ref: ref,
        dicatat_oleh: str(oleh),
      });
      kasBaru.push({ periode: d.periode, kode: b.kode, nominal: b.nominal });
    });
  });
  return {
    periode: periods,
    detail: detail,
    kasBaru: kasBaru,
    total: detail.reduce((total, d) => total + d.nominal, 0),
  };
}

function getKas() {
  return bacaTabel(SHEET_KAS).rows
    .map((j) => ({
      tanggal: parseTanggal(j.tanggal),
      keterangan: str(j.keterangan),
      jenis: str(j.jenis).toLowerCase(),
      nominal: parseAngka(j.nominal),
      alokasi: str(j.alokasi).toLowerCase() || ALOKASI_DEFAULT_KODE,
      ref: str(j.ref),
      dicatat_oleh: str(j.dicatat_oleh),
      _row: j._row,
    }))
    .filter((j) => j.jenis && j.nominal);
}

function efekKas(j) {
  if (j.jenis === JENIS_MASUK || j.jenis === JENIS_PINDAH_MASUK) return j.nominal;
  if (j.jenis === JENIS_KELUAR || j.jenis === JENIS_PINDAH_KELUAR) return -j.nominal;
  return 0;
}

function getSaldoMap() {
  let daftar;
  try {
    daftar = getAlokasiAktif();
  } catch (e) {
    daftar = DEFAULT_ALOKASI;
  }
  const map = {};
  daftar.forEach((a) => {
    map[a.kode] = 0;
  });
  getKas().forEach((j) => {
    if (!Object.prototype.hasOwnProperty.call(map, j.alokasi)) map[j.alokasi] = 0;
    map[j.alokasi] += efekKas(j);
  });
  return map;
}

function getSaldoKantong(kode) {
  const map = getSaldoMap();
  return Number(map[str(kode).toLowerCase()] || 0);
}

function getSaldoSemuaKantong() {
  const map = getSaldoMap();
  return Object.keys(map).map((kode) => {
    const alokasi = getAlokasiAktif().filter((a) => a.kode === kode)[0];
    return {
      kode: kode,
      nama: alokasi ? alokasi.nama : kode,
      saldo: map[kode],
    };
  });
}

function tambahKasManual(jenis, alokasi, nominal, keterangan, oleh, tanggal) {
  const j = str(jenis).toLowerCase();
  if (j !== JENIS_MASUK && j !== JENIS_KELUAR) {
    throw new Error("Jenis harus masuk atau keluar.");
  }
  const angka = Math.round(Number(nominal));
  if (!isFinite(angka) || angka <= 0) throw new Error("Nominal harus angka > 0.");
  const kode = str(alokasi).toLowerCase();
  const daftar = getAlokasiAktif();
  if (!daftar.some((a) => a.kode === kode)) {
    throw new Error("Kantong '" + kode + "' tidak dikenal. Lihat /alokasi.");
  }
  const tgl = tanggal ? parseTanggal(tanggal) : new Date();
  if (!tgl) throw new Error("Tanggal tidak valid.");
  const p = periodeDariTanggal(tgl);
  if (isPeriodeTertutup(p)) throw new Error("Periode " + p + " sudah ditutup.");
  if (j === JENIS_KELUAR) {
    const saldo = getSaldoKantong(kode);
    if (angka > saldo) {
      throw new Error("Saldo " + kode + " tidak cukup (" + fmtRp(saldo) + ").");
    }
  }
  tambahBaris(SHEET_KAS, {
    tanggal: tgl,
    keterangan: str(keterangan) || "Tanpa Keterangan",
    jenis: j,
    nominal: angka,
    alokasi: kode,
    ref: "",
    dicatat_oleh: str(oleh),
  });
  return { jenis: j, alokasi: kode, nominal: angka, saldo: getSaldoKantong(kode) };
}

function pindahKas(asal, tujuan, nominal, keterangan, oleh) {
  const dari = str(asal).toLowerCase();
  const ke = str(tujuan).toLowerCase();
  const daftar = getAlokasiAktif();
  if (!daftar.some((a) => a.kode === dari)) throw new Error("Kantong asal '" + dari + "' tidak dikenal.");
  if (!daftar.some((a) => a.kode === ke)) throw new Error("Kantong tujuan '" + ke + "' tidak dikenal.");
  if (dari === ke) throw new Error("Kantong asal dan tujuan tidak boleh sama.");
  const angka = Math.round(Number(nominal));
  if (!isFinite(angka) || angka <= 0) throw new Error("Nominal harus angka > 0.");
  const saldo = getSaldoKantong(dari);
  if (angka > saldo) throw new Error("Saldo " + dari + " tidak cukup (" + fmtRp(saldo) + ").");
  const p = periodeSekarang();
  if (isPeriodeTertutup(p)) throw new Error("Periode " + p + " sudah ditutup.");
  const ref = "TRF-" + formatStamp(new Date()).replace(/-/g, "");
  const ket = str(keterangan) || "Pindah kas";
  const sekarang = new Date();
  tambahBaris(SHEET_KAS, {
    tanggal: sekarang,
    keterangan: ket + " (" + dari + " -> " + ke + ")",
    jenis: JENIS_PINDAH_KELUAR,
    nominal: angka,
    alokasi: dari,
    ref: ref,
    dicatat_oleh: str(oleh),
  });
  tambahBaris(SHEET_KAS, {
    tanggal: sekarang,
    keterangan: ket + " (" + dari + " -> " + ke + ")",
    jenis: JENIS_PINDAH_MASUK,
    nominal: angka,
    alokasi: ke,
    ref: ref,
    dicatat_oleh: str(oleh),
  });
  return { dari: dari, ke: ke, nominal: angka, ref: ref, saldoAsal: getSaldoKantong(dari) };
}

function getMutasiKantong(kode, dari, sampai) {
  const k = str(kode).toLowerCase();
  const batasAwal = dari ? awalPeriode(dari) : null;
  const batasAkhir = sampai ? akhirPeriode(sampai) : null;
  return getKas()
    .filter((j) => j.alokasi === k)
    .filter((j) => {
      if (!j.tanggal) return false;
      if (batasAwal && j.tanggal < batasAwal) return false;
      if (batasAkhir && j.tanggal > batasAkhir) return false;
      return true;
    })
    .sort((a, b) => a.tanggal - b.tanggal);
}

function getTutupBuku() {
  return bacaTabel(SHEET_TUTUP_BUKU).rows
    .map((t) => ({
      periode: str(t.periode),
      jenis: str(t.jenis).toLowerCase() || "bulan",
      tarif: parseAngka(t.tarif),
      total_kk: parseAngka(t.total_kk),
      total_jiwa: parseAngka(t.total_jiwa),
      total_tagihan: parseAngka(t.total_tagihan),
      total_terbayar: parseAngka(t.total_terbayar),
      total_masuk: parseAngka(t.total_masuk),
      total_keluar: parseAngka(t.total_keluar),
      saldo_awal: parseAngka(t.saldo_awal),
      saldo_akhir: parseAngka(t.saldo_akhir),
      ditutup_oleh: str(t.ditutup_oleh),
      ditutup_pada: t.ditutup_pada,
      _row: t._row,
    }))
    .filter((t) => t.periode);
}

function getTutupBukuAlokasi() {
  return bacaTabel(SHEET_TUTUP_BUKU_ALOKASI).rows
    .map((t) => ({
      periode: str(t.periode),
      kode: str(t.kode).toLowerCase(),
      saldo_awal: parseAngka(t.saldo_awal),
      masuk: parseAngka(t.masuk),
      keluar: parseAngka(t.keluar),
      pindah_masuk: parseAngka(t.pindah_masuk),
      pindah_keluar: parseAngka(t.pindah_keluar),
      saldo_akhir: parseAngka(t.saldo_akhir),
      _row: t._row,
    }))
    .filter((t) => t.periode && t.kode);
}

function snapshotTerakhirSebelum(periode) {
  const list = getTutupBuku()
    .filter((t) => t.jenis === "bulan" && bandingPeriode(t.periode, periode) < 0)
    .sort((a, b) => bandingPeriode(a.periode, b.periode));
  return list.length ? list[list.length - 1] : null;
}

function snapshotAlokasiSebelum(periode) {
  const rows = getTutupBukuAlokasi().filter(
    (r) => /^\d{4}-\d{2}$/.test(r.periode) && bandingPeriode(r.periode, periode) < 0
  );
  if (!rows.length) return null;
  const max = rows.map((r) => r.periode).sort(bandingPeriode).pop();
  const map = {};
  rows
    .filter((r) => r.periode === max)
    .forEach((r) => {
      map[r.kode] = r.saldo_akhir;
    });
  return map;
}

function daftarKodeKantong() {
  let daftar;
  try {
    daftar = getAlokasiAktif();
  } catch (e) {
    daftar = DEFAULT_ALOKASI;
  }
  const hasil = daftar.map((a) => ({ kode: a.kode, nama: a.nama }));
  const ada = {};
  hasil.forEach((a) => {
    ada[a.kode] = true;
  });
  getKas().forEach((j) => {
    if (!ada[j.alokasi]) {
      ada[j.alokasi] = true;
      hasil.push({ kode: j.alokasi, nama: j.alokasi });
    }
  });
  return hasil;
}

function hitungKasPeriode(periode) {
  const awal = awalPeriode(periode);
  const akhir = akhirPeriode(periode);
  const snap = snapshotAlokasiSebelum(periode);
  const detail = {};
  daftarKodeKantong().forEach((a) => {
    detail[a.kode] = {
      kode: a.kode,
      nama: a.nama,
      saldo_awal: snap && snap[a.kode] !== undefined ? snap[a.kode] : 0,
      masuk: 0,
      keluar: 0,
      pindah_masuk: 0,
      pindah_keluar: 0,
      saldo_akhir: 0,
    };
  });
  getKas().forEach((j) => {
    if (!j.tanggal) return;
    if (!detail[j.alokasi]) {
      detail[j.alokasi] = {
        kode: j.alokasi,
        nama: j.alokasi,
        saldo_awal: snap && snap[j.alokasi] !== undefined ? snap[j.alokasi] : 0,
        masuk: 0,
        keluar: 0,
        pindah_masuk: 0,
        pindah_keluar: 0,
        saldo_akhir: 0,
      };
    }
    if (j.tanggal < awal) {
      if (!snap) detail[j.alokasi].saldo_awal += efekKas(j);
      return;
    }
    if (j.tanggal > akhir) return;
    if (j.jenis === JENIS_MASUK) detail[j.alokasi].masuk += j.nominal;
    else if (j.jenis === JENIS_KELUAR) detail[j.alokasi].keluar += j.nominal;
    else if (j.jenis === JENIS_PINDAH_MASUK) detail[j.alokasi].pindah_masuk += j.nominal;
    else if (j.jenis === JENIS_PINDAH_KELUAR) detail[j.alokasi].pindah_keluar += j.nominal;
  });
  const perKantong = Object.keys(detail).map((kode) => {
    const d = detail[kode];
    d.saldo_akhir = d.saldo_awal + d.masuk + d.pindah_masuk - d.keluar - d.pindah_keluar;
    return d;
  });
  return {
    perKantong: perKantong,
    totalMasuk: perKantong.reduce((t, d) => t + d.masuk, 0),
    totalKeluar: perKantong.reduce((t, d) => t + d.keluar, 0),
    totalSaldoAwal: perKantong.reduce((t, d) => t + d.saldo_awal, 0),
    totalSaldoAkhir: perKantong.reduce((t, d) => t + d.saldo_akhir, 0),
  };
}

function hitungRekapPeriode(periode) {
  const p = str(periode);
  const rows = getTagihanPeriode(p).filter((t) => t.status !== TAGIHAN_BATAL);
  const terbayar = rows.filter((t) => t.status === TAGIHAN_LUNAS);
  const belum = rows.filter((t) => t.status === TAGIHAN_BELUM);
  const bebas = rows.filter((t) => t.status === TAGIHAN_BEBAS);
  const ids = [];
  rows.forEach((t) => {
    if (ids.indexOf(t.id_kk) < 0) ids.push(t.id_kk);
  });
  return {
    periode: p,
    tarif: getTarifUntukPeriode(p),
    totalKK: rows.length,
    lunasKK: terbayar.length,
    belumKK: belum.length,
    dibebaskan: bebas.length,
    totalTagihan: rows.reduce((t, r) => t + r.nominal, 0),
    terbayar: terbayar.reduce((t, r) => t + r.nominal, 0),
    tunggakan: belum.reduce((t, r) => t + r.nominal, 0),
    totalJiwa: getJumlahJiwaUntukIds(ids),
  };
}

function tutupBuku(periode, oleh) {
  const p = parsePeriode(periode);
  if (!p) throw new Error("Format periode: YYYY-MM atau YYYY.");
  const sudah = getTutupBuku().filter((t) => t.periode === p.periode);
  if (sudah.length) throw new Error("Periode " + p.periode + " sudah ditutup.");
  if (p.bulanan) return tutupBukuBulanan(p.periode, oleh);
  return tutupBukuTahunan(p.tahun, oleh);
}

function tutupBukuBulanan(periode, oleh) {
  if (bandingPeriode(periode, periodeSekarang()) > 0) {
    throw new Error("Periode masa depan belum bisa ditutup.");
  }
  pastikanTagihan(periode);
  const rekap = hitungRekapPeriode(periode);
  const kas = hitungKasPeriode(periode);
  const selisih = Math.abs(kas.totalSaldoAkhir - kas.perKantong.reduce((t, d) => t + d.saldo_akhir, 0));
  if (selisih > 0.5) {
    throw new Error("Saldo kantong tidak konsisten (selisih " + fmtRp(selisih) + ").");
  }
  tambahBaris(SHEET_TUTUP_BUKU, {
    periode: periode,
    jenis: "bulan",
    tarif: rekap.tarif,
    total_kk: rekap.totalKK,
    total_jiwa: rekap.totalJiwa,
    total_tagihan: rekap.totalTagihan,
    total_terbayar: rekap.terbayar,
    total_masuk: kas.totalMasuk,
    total_keluar: kas.totalKeluar,
    saldo_awal: kas.totalSaldoAwal,
    saldo_akhir: kas.totalSaldoAkhir,
    ditutup_oleh: str(oleh),
    ditutup_pada: new Date(),
  });
  kas.perKantong.forEach((d) => {
    tambahBaris(SHEET_TUTUP_BUKU_ALOKASI, {
      periode: periode,
      kode: d.kode,
      saldo_awal: d.saldo_awal,
      masuk: d.masuk,
      keluar: d.keluar,
      pindah_masuk: d.pindah_masuk,
      pindah_keluar: d.pindah_keluar,
      saldo_akhir: d.saldo_akhir,
    });
  });
  return { periode: periode, jenis: "bulan", rekap: rekap, kas: kas };
}

function tutupBukuTahunan(tahun, oleh) {
  const label = String(tahun);
  const bulanRows = getTutupBuku().filter(
    (t) => t.jenis === "bulan" && t.periode.slice(0, 4) === label
  );
  const ada = {};
  bulanRows.forEach((t) => {
    ada[t.periode] = true;
  });
  const kurang = [];
  for (let b = 1; b <= 12; b++) {
    const p = label + "-" + pad2(b);
    if (!ada[p]) kurang.push(p);
  }
  if (kurang.length) {
    throw new Error("Tahun " + label + " belum lengkap. Bulan belum ditutup: " + kurang.join(", "));
  }
  bulanRows.sort((a, b) => bandingPeriode(a.periode, b.periode));
  const pertama = bulanRows[0];
  const terakhir = bulanRows[bulanRows.length - 1];
  const total = bulanRows.reduce(
    (acc, t) => {
      acc.totalKK = t.total_kk;
      acc.totalJiwa = t.total_jiwa;
      acc.tarif = t.tarif;
      acc.total_tagihan += t.total_tagihan;
      acc.total_terbayar += t.total_terbayar;
      acc.total_masuk += t.total_masuk;
      acc.total_keluar += t.total_keluar;
      return acc;
    },
    {
      tarif: terakhir.tarif,
      totalKK: terakhir.total_kk,
      totalJiwa: terakhir.total_jiwa,
      total_tagihan: 0,
      total_terbayar: 0,
      total_masuk: 0,
      total_keluar: 0,
    }
  );
  const alokasiRows = getTutupBukuAlokasi().filter(
    (r) => bulanRows.some((b) => b.periode === r.periode)
  );
  const perKantong = {};
  alokasiRows.forEach((r) => {
    if (!perKantong[r.kode]) {
      perKantong[r.kode] = {
        kode: r.kode,
        saldo_awal: 0,
        masuk: 0,
        keluar: 0,
        pindah_masuk: 0,
        pindah_keluar: 0,
        saldo_akhir: 0,
      };
    }
    const d = perKantong[r.kode];
    if (r.periode === pertama.periode) d.saldo_awal = r.saldo_awal;
    d.masuk += r.masuk;
    d.keluar += r.keluar;
    d.pindah_masuk += r.pindah_masuk;
    d.pindah_keluar += r.pindah_keluar;
    if (r.periode === terakhir.periode) d.saldo_akhir = r.saldo_akhir;
  });
  const daftar = Object.keys(perKantong).map((kode) => perKantong[kode]);
  const saldoAkhirKantong = daftar.reduce((t, d) => t + d.saldo_akhir, 0);
  if (Math.abs(saldoAkhirKantong - terakhir.saldo_akhir) > 0.5) {
    throw new Error("Saldo kantong tahunan tidak konsisten dengan TutupBuku bulanan.");
  }
  tambahBaris(SHEET_TUTUP_BUKU, {
    periode: label,
    jenis: "tahun",
    tarif: total.tarif,
    total_kk: total.totalKK,
    total_jiwa: total.totalJiwa,
    total_tagihan: total.total_tagihan,
    total_terbayar: total.total_terbayar,
    total_masuk: total.total_masuk,
    total_keluar: total.total_keluar,
    saldo_awal: pertama.saldo_awal,
    saldo_akhir: terakhir.saldo_akhir,
    ditutup_oleh: str(oleh),
    ditutup_pada: new Date(),
  });
  daftar.forEach((d) => {
    tambahBaris(SHEET_TUTUP_BUKU_ALOKASI, {
      periode: label,
      kode: d.kode,
      saldo_awal: d.saldo_awal,
      masuk: d.masuk,
      keluar: d.keluar,
      pindah_masuk: d.pindah_masuk,
      pindah_keluar: d.pindah_keluar,
      saldo_akhir: d.saldo_akhir,
    });
  });
  return { periode: label, jenis: "tahun", rekap: total, perKantong: daftar };
}

function progressBar(persen) {
  const p = Math.max(0, Math.min(100, Math.round(Number(persen) || 0)));
  const penuh = Math.round(p / 10);
  return "█".repeat(penuh) + "░".repeat(10 - penuh);
}

function hitungRekapRentang(dari, sampai) {
  const a = parsePeriode(dari);
  const b = parsePeriode(sampai);
  if (!a || !a.bulanan || !b || !b.bulanan) {
    throw new Error("Rentang harus format YYYY-MM.");
  }
  const periodeList = daftarPeriode(a.periode, b.periode);
  if (periodeList.length > 24) throw new Error("Rentang maksimal 24 bulan.");
  const perPeriode = periodeList.map((p) => {
    pastikanTagihan(p);
    return hitungRekapPeriode(p);
  });
  const penunggak = {};
  getTagihan()
    .filter(
      (t) =>
        t.status === TAGIHAN_BELUM &&
        bandingPeriode(t.periode, a.periode) >= 0 &&
        bandingPeriode(t.periode, b.periode) <= 0
    )
    .forEach((t) => {
      if (!penunggak[t.id_kk]) {
        penunggak[t.id_kk] = {
          id_kk: t.id_kk,
          nama_kk: t.nama_kk,
          no_rumah: t.no_rumah,
          total: 0,
          bulan: 0,
        };
      }
      penunggak[t.id_kk].total += t.nominal;
      penunggak[t.id_kk].bulan += 1;
    });
  const daftarPenunggak = Object.keys(penunggak)
    .map((k) => penunggak[k])
    .sort((x, y) => y.total - x.total);
  const terakhir = perPeriode[perPeriode.length - 1];
  return {
    dari: a.periode,
    sampai: b.periode,
    perPeriode: perPeriode,
    totalKK: terakhir ? terakhir.totalKK : 0,
    totalJiwa: terakhir ? terakhir.totalJiwa : 0,
    target: perPeriode.reduce((t, r) => t + r.totalTagihan, 0),
    terbayar: perPeriode.reduce((t, r) => t + r.terbayar, 0),
    tunggakan: perPeriode.reduce((t, r) => t + r.tunggakan, 0),
    dibebaskan: perPeriode.reduce((t, r) => t + r.dibebaskan, 0),
    penunggak: daftarPenunggak.slice(0, 5),
  };
}

function getDaftarKK(opsi) {
  const o = opsi || {};
  const batas = str(o.sampai) || periodeSekarang();
  const semua = o.semua ? getKeluarga() : getKeluargaAktif();
  const rows = semua.map((k) => ({
    id_kk: k.id_kk,
    no_rumah: k.no_rumah,
    nama_kk: k.nama_kk,
    status: k.status,
    jiwa: getJumlahJiwaKK(k.id_kk),
    tunggakan: hitungTunggakanKK(k.id_kk, batas),
    bulan: getBulanTunggakanKK(k.id_kk, batas),
    mulai_iuran: k.mulai_iuran,
  }));
  const urut = str(o.urut) || "rumah";
  rows.sort((a, b) => {
    if (urut === "tagihan") {
      if (b.tunggakan !== a.tunggakan) return b.tunggakan - a.tunggakan;
      return sortNoRumah(a, b);
    }
    if (urut === "nama") return naturalCompare(a.nama_kk, b.nama_kk);
    return sortNoRumah(a, b);
  });
  return rows;
}

function parseAdminIds(nilai) {
  return str(nilai)
    .split(/[\s,;]+/)
    .map((id) => str(id))
    .filter(Boolean);
}

function getAdminTambahan() {
  const hasil = [];
  parseAdminIds(getSetting("admin_tambahan")).forEach((id) => {
    if (hasil.indexOf(id) < 0) hasil.push(id);
  });
  return hasil;
}

function getAdminIds() {
  const hasil = [];
  ADMIN_IDS.concat(getAdminTambahan()).forEach((id) => {
    const v = str(id);
    if (v && hasil.indexOf(v) < 0) hasil.push(v);
  });
  return hasil;
}

function isAdmin(userId) {
  return getAdminIds().indexOf(str(userId)) >= 0;
}

function isAdminInti(userId) {
  return ADMIN_IDS.map((id) => str(id)).indexOf(str(userId)) >= 0;
}

function simpanAdminTambahan(ids) {
  const bersih = [];
  (ids || []).forEach((id) => {
    const v = str(id);
    if (v && bersih.indexOf(v) < 0) bersih.push(v);
  });
  setSetting("admin_tambahan", bersih.join(","));
  return bersih;
}

function setAdminIds(ids) {
  ADMIN_IDS.length = 0;
  if (Array.isArray(ids)) ids.forEach((id) => ADMIN_IDS.push(String(id)));
}

function setGroupChatId(id) {
  GROUP_CHAT_ID = id ? String(id) : "";
}

function getGroupChatId() {
  return GROUP_CHAT_ID;
}

function teksPerintah(text, cmd) {
  const s = str(text);
  if (s.toLowerCase().indexOf(cmd.toLowerCase()) !== 0) return "";
  return s.slice(cmd.length).trim();
}

function balas(chatId, teks) {
  sendTelegramMessage(chatId, teks);
}

function balasError(chatId, error, userId) {
  sendTelegramMessage(chatId, "⚠️ " + (error && error.message ? error.message : String(error)), userId);
}

function tolakAdmin(chatId, userId) {
  sendTelegramMessage(chatId, "⛔ *Akses Ditolak!*\n\nPerintah ini khusus untuk Pengurus RT.", userId);
}

function kirimTagihanKK(chatId, kk) {
  const rows = getTagihan()
    .filter((t) => t.id_kk === kk.id_kk)
    .sort((a, b) => bandingPeriode(a.periode, b.periode));
  if (!rows.length) {
    sendTelegramMessage(
      chatId,
      "ℹ️ Belum ada tagihan untuk " + kk.id_kk + ". Jalankan `backfillTagihanBulanan()` di editor."
    );
    return;
  }
  const tunggakan = rows
    .filter((t) => t.status === TAGIHAN_BELUM)
    .reduce((total, t) => total + t.nominal, 0);
  const belumPertama = rows.filter((t) => t.status === TAGIHAN_BELUM)[0];
  const daftar = rows.slice(-24).map((t) => {
    const tanda =
      t.status === TAGIHAN_LUNAS ? "✅" :
      t.status === TAGIHAN_BEBAS ? "🕊️" :
      t.status === TAGIHAN_BATAL ? "✖️" : "⏳";
    return (
      "• " + t.periode + "  " + tanda + " " + padKiri(fmtRp(t.nominal), 12) +
      (t.tanggal_bayar ? "  (" + formatTanggal(t.tanggal_bayar) + ")" : "")
    );
  });
  sendTelegramMessage(
    chatId,
    "🧾 *TAGIHAN " + kk.id_kk + " — " + escMd(kk.nama_kk) + "*\n" +
      "🏠 " + escMd(kk.no_rumah) + " · Status KK: " + escMd(kk.status) + "\n\n" +
      daftar.join("\n") +
      "\n\n⏳ Total tunggakan: *" + fmtRp(tunggakan) + "*\n" +
      (belumPertama
        ? "Ketik `/bayar " + kk.id_kk + " " + belumPertama.periode + "` untuk mencatat pembayaran."
        : "Semua tagihan sudah lunas ✅")
  );
}

function kirimTunggakanKK(chatId, kk) {
  const rows = getTagihan()
    .filter((t) => t.id_kk === kk.id_kk && t.status === TAGIHAN_BELUM)
    .sort((a, b) => bandingPeriode(a.periode, b.periode));
  const total = rows.reduce((t, r) => t + r.nominal, 0);
  sendTelegramMessage(
    chatId,
    "⏳ *TUNGGAKAN " + kk.id_kk + "*\n" +
      "👤 " + escMd(kk.nama_kk) + " · 🏠 " + escMd(kk.no_rumah) + "\n\n" +
      (rows.length
        ? rows.map((t) => "• " + t.periode + " — " + fmtRp(t.nominal)).join("\n")
        : "• Tidak ada tunggakan 🎉") +
      "\n\nTotal: *" + fmtRp(total) + "*"
  );
}

function ringkasanKkTerhubung(chatId, daftarKk) {
  const baris = daftarKk.map(
    (k) =>
      "• *" + k.id_kk + "* " + escMd(k.no_rumah) + " " + escMd(k.nama_kk) + "\n" +
      "  ⏳ " + fmtRp(hitungTunggakanKK(k.id_kk)) + " (" +
      getBulanTunggakanKK(k.id_kk) + " bln)"
  );
  sendTelegramMessage(
    chatId,
    "👛 *Akun ini terhubung ke " + daftarKk.length + " KK:*\n\n" +
      baris.join("\n") +
      "\n\nKetik `/tagihan <id_kk>` atau `/tunggakan <id_kk>` untuk rincian."
  );
}

function penunggakPeriode(periode, limit) {
  const map = {};
  getTagihanPeriode(periode)
    .filter((t) => t.status === TAGIHAN_BELUM)
    .forEach((t) => {
      if (!map[t.id_kk]) map[t.id_kk] = { id_kk: t.id_kk, nama: t.nama_kk, no: t.no_rumah, total: 0, bulan: 0 };
      map[t.id_kk].total += t.nominal;
      map[t.id_kk].bulan += 1;
    });
  return Object.keys(map)
    .map((k) => map[k])
    .sort((a, b) => b.total - a.total)
    .slice(0, limit || 5);
}

function formatRekapBulanan(r) {
  const persen = r.totalTagihan > 0 ? Math.round((r.terbayar / r.totalTagihan) * 100) : 0;
  const top = penunggakPeriode(r.periode, 5);
  const terkunci = isPeriodeTertutup(r.periode);
  return (
    "📊 *REKAP IURAN — " + labelPeriode(r.periode).toUpperCase() + "*" + (terkunci ? " 🔒" : "") + "\n\n" +
    "🎯 Target: *" + fmtRp(r.totalTagihan) + "*  (" + r.totalKK + " KK × " + fmtRp(r.tarif) + ")\n" +
    "✅ Terbayar: *" + fmtRp(r.terbayar) + "*  (" + r.lunasKK + " KK · " + persen + "%)\n" +
    "⏳ Tunggakan: *" + fmtRp(r.tunggakan) + "*  (" + r.belumKK + " KK)\n" +
    "👥 Jiwa terdampak: " + r.totalJiwa + " orang\n" +
    (r.dibebaskan ? "🕊️ Dibebaskan: " + r.dibebaskan + " KK\n" : "") +
    "\nProgres: " + progressBar(persen) + " " + persen + "%\n\n" +
    "*Penunggak teratas:*\n" +
    (top.length
      ? top.map(
          (d) => "• " + d.id_kk + " " + escMd(d.no) + " " + escMd(d.nama) + " — " + fmtRp(d.total)
        ).join("\n")
      : "• Tidak ada 🎉")
  );
}

function formatRekapRentang(r) {
  const persen = r.target > 0 ? Math.round((r.terbayar / r.target) * 100) : 0;
  const jumlahTertutup = r.perPeriode.filter((p) => isPeriodeTertutup(p.periode)).length;
  const tandaKunci =
    r.perPeriode.length && jumlahTertutup === r.perPeriode.length ? " 🔒" : "";
  const bulanan = r.perPeriode.map((p) => {
    const tanda = p.tunggakan > 0 ? "⏳" : "✅";
    return (
      "• " + p.periode + "  " + tanda + " " +
      padKiri(fmtRp(p.terbayar), 12) + " / " + padKiri(fmtRp(p.totalTagihan), 12) +
      (isPeriodeTertutup(p.periode) ? " 🔒" : "")
    );
  });
  return (
    "📊 *REKAP IURAN — " + r.dari.slice(0, 4) + "* (" +
    labelPeriode(r.dari) + " – " + labelPeriode(r.sampai) + ")" + tandaKunci + "\n\n" +
    "🎯 Target: *" + fmtRp(r.target) + "*\n" +
    "✅ Terbayar: *" + fmtRp(r.terbayar) + "* (" + persen + "%)\n" +
    "⏳ Tunggakan: *" + fmtRp(r.tunggakan) + "*\n" +
    "👥 KK aktif: " + r.totalKK + " · Jiwa: " + r.totalJiwa + "\n" +
    (r.dibebaskan ? "🕊️ Dibebaskan: " + r.dibebaskan + " KK-bulan\n" : "") +
    "\n" + progressBar(persen) + " " + persen + "%\n\n" +
    "*Per bulan:*\n" + bulanan.join("\n") + "\n\n" +
    "*Penunggak teratas:*\n" +
    (r.penunggak.length
      ? r.penunggak.map(
          (d) => "• " + d.id_kk + " " + escMd(d.no_rumah) + " " + escMd(d.nama_kk) +
            " — " + fmtRp(d.total) + " (" + d.bulan + " bln)"
        ).join("\n")
      : "• Tidak ada 🎉")
  );
}

function formatDaftarKK(rows, meta) {
  const kepala = padKanan("No", 5);
  const nama = padKanan("Nama KK", 22);
  const jiwa = padKanan("Jiwa", 5);
  const tagih = padKiri("Tunggakan", 14);
  const garis = "─".repeat(48);
  const isi = rows.map((r) => {
    let nm = r.nama_kk.length > 21 ? r.nama_kk.slice(0, 20) + "…" : r.nama_kk;
    return (
      padKanan(r.no_rumah, 5) +
      padKanan(nm, 22) +
      padKanan(r.jiwa, 5) +
      padKiri(r.tunggakan ? fmtRp(r.tunggakan) : "-", 14)
    );
  });
  return (
    "📋 *DAFTAR KK* — s.d. " + labelPeriode(meta.sampai).toUpperCase() + "\n\n" +
    "```\n" + kepala + nama + jiwa + tagih + "\n" + garis + "\n" + isi.join("\n") + "\n```\n\n" +
    meta.totalKK + " KK · " + meta.totalJiwa + " jiwa · Total tunggakan " + fmtRp(meta.totalTunggakan) +
    (meta.totalHalaman > 1 ? "\nHalaman " + meta.halaman + "/" + meta.totalHalaman : "")
  );
}

function formatSaldoKas(judul, saldoList, total, masuk, keluar) {
  const baris = saldoList.map(
    (s) => padKanan(s.kode, 8) + padKanan(s.nama, 26) + padKiri(fmtRp(s.saldo), 14)
  );
  return (
    "💰 *" + judul + "*\n\n" +
    "```\n" + padKanan("kode", 8) + padKanan("kantong", 26) + padKiri("saldo", 14) + "\n" +
    "─".repeat(48) + "\n" + baris.join("\n") + "\n" +
    "─".repeat(48) + "\n" +
    padKanan("TOTAL", 34) + padKiri(fmtRp(total), 14) + "\n```\n" +
    (masuk !== undefined ? "\n📥 Masuk: " + fmtRp(masuk) + "\n📤 Keluar: " + fmtRp(keluar) : "")
  );
}

function getProcessedUpdateIds() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty("PROCESSED_UPDATE_IDS");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveProcessedUpdateIds(ids) {
  try {
    PropertiesService.getScriptProperties().setProperty("PROCESSED_UPDATE_IDS", JSON.stringify(ids));
  } catch (e) {
    // ignore
  }
}

function isAckOnly() {
  try {
    return PropertiesService.getScriptProperties().getProperty("ACK_ONLY") === "true";
  } catch (e) {
    return false;
  }
}

function isProcessed(updateId) {
  if (updateId == null) return false;
  return getProcessedUpdateIds().indexOf(String(updateId)) >= 0;
}

function markProcessed(updateId) {
  if (updateId == null) return;
  const ids = getProcessedUpdateIds();
  const key = String(updateId);
  if (ids.indexOf(key) < 0) {
    ids.push(key);
    if (ids.length > 200) ids.splice(0, ids.length - 200);
    saveProcessedUpdateIds(ids);
  }
}

function getWebhookInfo() {
  const url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/getWebhookInfo";
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
  return response.getContentText();
}

function deleteWebhook(dropPending) {
  const url =
    "https://api.telegram.org/bot" + TELEGRAM_TOKEN +
    "/deleteWebhook?drop_pending_updates=" + (dropPending ? "true" : "false");
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
  return response.getContentText();
}

function setWebhook(dropPending) {
  let url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/setWebhook?url=" + WEBHOOK_URL;
  if (dropPending !== false) url += "&drop_pending_updates=true";
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
  return response.getContentText();
}

function pecahPesan(text, max) {
  const batas = max || 3500;
  const s = str(text);
  if (s.length <= batas) return [s];
  const hasil = [];
  let buf = "";
  s.split("\n").forEach((line) => {
    if ((buf + "\n" + line).length > batas) {
      if (buf) hasil.push(buf);
      buf = line;
    } else {
      buf = buf ? buf + "\n" + line : line;
    }
  });
  if (buf) hasil.push(buf);
  return hasil;
}

function footerMenuUntukUser(userId) {
  const id = str(userId);
  if (!id) return "";
  if (isAdminInti(id)) {
    return "\n\n`/untukwarga` - Menu warga\n`/untukadmin` - Menu admin\n`/system` - Menu system";
  }
  if (isAdmin(id)) {
    return "\n\n`/untukwarga` - Menu warga\n`/untukadmin` - Menu admin";
  }
  try {
    const terdaftar = getTelegramUserRows().some((t) => t.id_telegram === id);
    if (terdaftar) return "\n\n`/untukwarga` - Menu warga";
  } catch (e) {
    // abaikan
  }
  return "";
}

function sendTelegramMessage(chatId, text, userId) {
  const url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage";
  let pesan = str(text);
  const uid = userId;
  const footer = footerMenuUntukUser(uid);
  if (footer && pesan.indexOf("/untukwarga") < 0 && pesan.indexOf("/untukadmin") < 0 && pesan.indexOf("/system") < 0) {
    pesan = pesan + footer;
  }
  const potongan = pecahPesan(pesan);
  try {
    const props = PropertiesService.getScriptProperties();
    props.setProperty("LAST_REPLY_TEXT", pesan);
    props.setProperty("LAST_REPLY_CHAT", String(chatId));
  } catch (e) {
    // abaikan
  }
  potongan.forEach((teks) => {
    const payload = { chat_id: chatId, text: teks, parse_mode: "Markdown" };
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
    };
    try {
      const res = UrlFetchApp.fetch(url, options);
      Logger.log(res.getContentText());
    } catch (error) {
      const pesan = error && error.toString ? error.toString() : String(error);
      const salahFormat = /(400|bad request|can't parse entities|can't find end of the entity)/i.test(pesan);
      if (!salahFormat) {
        Logger.log("Error: " + pesan);
        return;
      }
      Logger.log("Markdown gagal, kirim ulang sebagai teks biasa: " + pesan);
      try {
        const fallback = { chat_id: chatId, text: teks };
        const res = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify(fallback),
        });
        Logger.log(res.getContentText());
      } catch (err2) {
        Logger.log(
          "Fallback gagal: " + (err2 && err2.toString ? err2.toString() : String(err2))
        );
      }
    }
  });
}

function sendAdminMessage(chatId, text) {
  const prefix = "👮 *ADMIN*\n\n";
  return sendTelegramMessage(chatId, prefix + text);
}

function getScriptCache() {
  try {
    return CacheService.getScriptCache();
  } catch (e) {
    return null;
  }
}

function cacheGet(key) {
  const c = getScriptCache();
  if (!c) return null;
  try {
    return c.get(key);
  } catch (e) {
    return null;
  }
}

function cachePut(key, value, ttl) {
  const c = getScriptCache();
  if (!c) return;
  try {
    c.put(key, value, ttl || 60);
  } catch (e) {
    // ignore
  }
}

function kasCacheVersion() {
  try {
    const p = PropertiesService.getScriptProperties();
    return p.getProperty("KAS_CACHE_VERSION") || "0";
  } catch (e) {
    return "0";
  }
}

function invalidateKasCache() {
  try {
    const p = PropertiesService.getScriptProperties();
    const v = Number(p.getProperty("KAS_CACHE_VERSION") || "0") + 1;
    p.setProperty("KAS_CACHE_VERSION", String(v));
  } catch (e) {
    // ignore
  }
}

function getBotUsername() {
  try {
    const props = PropertiesService.getScriptProperties();
    const cached = props.getProperty("BOT_USERNAME");
    if (cached) return cached;
    const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/getMe");
    const data = JSON.parse(res.getContentText());
    if (data && data.ok && data.result && data.result.username) {
      props.setProperty("BOT_USERNAME", data.result.username);
      return data.result.username;
    }
  } catch (e) {
    Logger.log("getBotUsername error: " + e.toString());
  }
  return "";
}

function cmdLink(teksPerintah) {
  const u = getBotUsername();
  if (!u) return "`" + teksPerintah + "`";
  const url = "https://t.me/" + u + "?text=" + encodeURIComponent(teksPerintah);
  return "[" + teksPerintah + "](" + url + ")";
}

function pollTelegram() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log("pollTelegram: could not acquire lock");
    return;
  }
  try {
    const props = PropertiesService.getScriptProperties();
    const lastId = Number(props.getProperty("LAST_UPDATE_ID") || 0);
    const offset = lastId > 0 ? lastId + 1 : 0;
    const url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/getUpdates?offset=" + offset + "&timeout=5";
    const res = UrlFetchApp.fetch(url);
    const data = JSON.parse(res.getContentText());
    if (!data || !data.ok) {
      Logger.log("pollTelegram getUpdates error: " + res.getContentText());
      return;
    }
    const updates = data.result || [];
    let maxId = lastId;
    updates.forEach((u) => {
      if (u.update_id > maxId) maxId = u.update_id;
      if (u.message && u.message.text) {
        const chatId = u.message.chat.id;
        const userId = u.message.from.id;
        const text = str(u.message.text);
        const senderName = (u.message.from && u.message.from.first_name) || "Warga";
        const username = (u.message.from && u.message.from.username) || "";
        handleCommand(chatId, text, senderName, userId, username);
        markProcessed(u.update_id);
      }
    });
    if (maxId > lastId) props.setProperty("LAST_UPDATE_ID", String(maxId));
    Logger.log("pollTelegram processed " + updates.length + " updates");
  } catch (e) {
    Logger.log("pollTelegram error: " + e.toString());
  } finally {
    lock.releaseLock();
  }
}

function setupPollingTrigger() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction && t.getHandlerFunction() === "pollTelegram") {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger("pollTelegram").timeBased().everyMinutes(1).create();
  try {
    deleteWebhook(true);
  } catch (e) {
    Logger.log("setupPollingTrigger deleteWebhook error: " + e.toString());
  }
  Logger.log("Polling trigger created (every 1 minute)");
}

function stopPollingTrigger() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction && t.getHandlerFunction() === "pollTelegram") {
      ScriptApp.deleteTrigger(t);
    }
  });
  Logger.log("Polling trigger removed");
}

function migrasiKasAlokasi(dryRun) {
  const sheet = getSpreadsheet(SHEET_KAS);
  if (!sheet) return { diubah: 0, dilewati: 0, pesan: "Tab Kas tidak ada" };
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { diubah: 0, dilewati: 0, pesan: "Kas kosong" };
  const header = values[0].map((v) => str(v).toLowerCase());
  let kolAlokasi = header.indexOf("alokasi");
  let kolRef = header.indexOf("ref");
  const headerBaru = header.slice();
  if (kolAlokasi < 0) {
    kolAlokasi = headerBaru.length;
    headerBaru.push("alokasi");
  }
  if (kolRef < 0) {
    kolRef = headerBaru.length;
    headerBaru.push("ref");
  }
  const perluHeader = headerBaru.length !== header.length;
  let diubah = 0;
  let dilewati = 0;
  if (!dryRun && perluHeader) {
    sheet.getRange(1, 1, 1, headerBaru.length).setValues([headerBaru]);
  }
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const alokasi = str(row[kolAlokasi]);
    const ref = str(row[kolRef]);
    if (!alokasi) {
      if (!dryRun) sheet.getRange(i + 1, kolAlokasi + 1).setValue(ALOKASI_DEFAULT_KODE);
      diubah++;
    } else {
      dilewati++;
    }
    if (!ref && !dryRun) {
      sheet.getRange(i + 1, kolRef + 1).setValue("LEGACY-" + (i + 1));
    }
  }
  return { diubah: diubah, dilewati: dilewati, dryRun: dryRun === true };
}

function migrasiWarga(dryRun) {
  const sheet = getSpreadsheet("Warga");
  if (!sheet) return { dibuat: 0, dilewati: 0, error: 0, pesan: "Tab Warga tidak ada" };
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1).filter((r) => r.some((c) => str(c) !== ""));
  const existing = getKeluarga();
  let dibuat = 0;
  let dilewati = 0;
  let error = 0;
  rows.forEach((r) => {
    const nama = str(r[0]);
    const noHp = str(r[1]);
    const rumah = str(r[2]);
    const jk = str(r[3]);
    const alamat = str(r[4]);
    const catatan = str(r[5]);
    if (!nama || !rumah) {
      error++;
      return;
    }
    const sudah = existing.filter(
      (k) =>
        k.no_rumah.toUpperCase() === rumah.toUpperCase() &&
        k.nama_kk.toUpperCase() === nama.toUpperCase()
    );
    if (sudah.length) {
      dilewati++;
      return;
    }
    if (dryRun) {
      dibuat++;
      return;
    }
    const kk = tambahKeluarga(
      {
        nama_kk: nama,
        no_hp: noHp,
        no_rumah: rumah,
        alamat: alamat,
        catatan: catatan,
        jenis_kelamin: jk,
      },
      "migrasi"
    );
    existing.push(kk);
    dibuat++;
  });
  if (!dryRun && dibuat > 0) {
    aman(() => {
      if (!getSpreadsheet("Warga_lama")) sheet.setName("Warga_lama");
    });
  }
  return { dibuat: dibuat, dilewati: dilewati, error: error, dryRun: dryRun === true };
}

function backupSpreadsheet(ss) {
  if (typeof DriveApp === "undefined" || !DriveApp) {
    throw new Error("DriveApp tidak tersedia. Backup tidak bisa dibuat.");
  }
  const id = ss && typeof ss.getId === "function" ? ss.getId() : SPREADSHEET_ID;
  const nama = "pakrt-backup-" + formatStamp(new Date());
  const file = DriveApp.getFileById(id);
  const copy = file.makeCopy(nama);
  return { id: copy && copy.getId ? copy.getId() : "", nama: nama };
}

function terapkanSchema(sheet, nama) {
  const header = SHEET_SCHEMA[nama];
  if (!header) return;
  const range = sheet.getRange(1, 1, 1, header.length);
  range.setValues([header]);
  aman(() => range.setFontWeight("bold"));
  aman(() => range.setBackground("#e8f0fe"));
  aman(() => sheet.setFrozenRows(1));
  header.forEach((h, i) => {
    aman(() => sheet.setColumnWidth(i + 1, Math.max(120, h.length * 10 + 40)));
  });
  const validasi = {
    Setting: { kolom: "tipe", daftar: ["angka", "boolean", "teks"] },
    Keluarga: { kolom: "status", daftar: ["Aktif", "Pindah", "Nonaktif"] },
    Anggota: { kolom: "status", daftar: ["Aktif", "Pindah", "Meninggal"] },
    Tagihan: { kolom: "status", daftar: ["belum", "lunas", "bebas", "batal"] },
    Kas: { kolom: "jenis", daftar: ["masuk", "keluar", "pindah_masuk", "pindah_keluar"] },
  };
  const aturan = validasi[nama];
  if (aturan && typeof SpreadsheetApp.newDataValidation === "function") {
    aman(() => {
      const idx = header.indexOf(aturan.kolom);
      if (idx < 0) return;
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(aturan.daftar, true)
        .setAllowInvalid(true)
        .build();
      sheet.getRange(2, idx + 1, 999, 1).setDataValidation(rule);
    });
  }
}

function seedSettings() {
  const rows = bacaTabel(SHEET_SETTING).rows;
  const ada = {};
  rows.forEach((r) => {
    ada[str(r.kunci)] = true;
  });
  let jumlah = 0;
  Object.keys(DEFAULT_SETTINGS).forEach((k) => {
    if (ada[k]) return;
    tambahBaris(SHEET_SETTING, {
      kunci: k,
      nilai: DEFAULT_SETTINGS[k].nilai,
      tipe: DEFAULT_SETTINGS[k].tipe,
      keterangan: DEFAULT_SETTINGS[k].keterangan,
    });
    jumlah++;
  });
  return jumlah;
}

function seedTarifAwal() {
  if (getTarifList().length) return 0;
  tambahBaris(SHEET_TARIF, {
    berlaku_mulai: str(getSetting("backfill_mulai")) || periodeSekarang(),
    nominal: parseAngka(getSetting("iuran_bulanan")) || 50000,
    keterangan: "Tarif awal",
  });
  return 1;
}

function seedAlokasiDefault() {
  if (bacaTabel(SHEET_ALOKASI).rows.some((a) => str(a.kode))) return 0;
  DEFAULT_ALOKASI.forEach((a) => {
    tambahBaris(SHEET_ALOKASI, a);
  });
  return DEFAULT_ALOKASI.length;
}

function setupSheets(opsi) {
  const o = opsi || {};
  const mode = str(o.mode) || "safe";
  if (["safe", "reset", "fresh"].indexOf(mode) < 0) {
    throw new Error("Mode harus safe/reset/fresh.");
  }
  const dryRun = o.dryRun === true;
  let ss = o.spreadsheet;
  if (!ss) {
    const id = str(o.spreadsheetId) || SPREADSHEET_ID;
    if (!id) {
      throw new Error("SPREADSHEET_ID belum diisi. Isi konstanta SPREADSHEET_ID di kode.gs.");
    }
    ss = SpreadsheetApp.openById(id);
  }
  const hapus = mode === "safe" ? [] : mode === "reset" ? SHEET_SKEMA.slice() : SHEET_SKEMA.concat(SHEET_DATA);
  const ada = {};
  ss.getSheets().forEach((s) => {
    ada[s.getName()] = s;
  });
  const akanHapus = hapus.filter((n) => ada[n]);
  const akanBuat = [];
  if (mode === "safe") {
    Object.keys(SHEET_SCHEMA).forEach((n) => {
      if (!ada[n]) akanBuat.push(n);
    });
  } else {
    hapus.forEach((n) => {
      if (!ada[n] || akanHapus.indexOf(n) >= 0) akanBuat.push(n);
    });
  }
  const rencana = {
    mode: mode,
    dryRun: dryRun,
    akanHapus: akanHapus,
    akanBuat: akanBuat,
    backup: mode !== "safe" && o.backup !== false,
  };
  if (dryRun) {
    Logger.log("setupSheets dryRun: " + JSON.stringify(rencana));
    return rencana;
  }
  let backup = null;
  if (rencana.backup) backup = backupSpreadsheet(ss);
  aman(() => ss.setSpreadsheetTimeZone("Asia/Jakarta"));
  aman(() => ss.setLocale("id_ID"));
  let temp = null;
  if (akanHapus.length) {
    temp = ss.insertSheet("_init_temp");
  }
  akanHapus.forEach((n) => {
    aman(() => ss.deleteSheet(ada[n]));
  });
  akanBuat.forEach((n) => {
    const sheet = ss.getSheetByName(n) || ss.insertSheet(n);
    terapkanSchema(sheet, n);
  });
  // Pastikan sheet data selalu ada tanpa menghapus isinya
  SHEET_DATA.forEach((n) => {
    if (ss.getSheetByName(n)) return;
    const sheet = ss.insertSheet(n);
    terapkanSchema(sheet, n);
  });
  if (temp) aman(() => ss.deleteSheet(temp));
  const seed = {
    setting: seedSettings(),
    tarif: seedTarifAwal(),
    alokasi: seedAlokasiDefault(),
  };
  let backfill = 0;
  if (o.backfill === true) {
    backfill = backfillTagihan(
      str(getSetting("backfill_mulai")) || periodeSekarang(),
      periodeSekarang()
    );
  }
  return {
    mode: mode,
    dihapus: akanHapus,
    dibuat: akanBuat,
    seed: seed,
    backfill: backfill,
    backup: backup,
  };
}

function initSheets() {
  return setupSheets({ mode: "safe" });
}

function resetSheetSkemaDryRun() {
  return setupSheets({ mode: "reset", dryRun: true });
}

function resetSheetSkema() {
  return setupSheets({ mode: "reset", backup: true });
}

function resetSemuaSheetDryRun() {
  return setupSheets({ mode: "fresh", dryRun: true });
}

function resetSemuaSheet() {
  return setupSheets({ mode: "fresh", backup: true });
}

function backfillTagihanBulanan() {
  return backfillTagihan(
    str(getSetting("backfill_mulai")) || periodeSekarang(),
    periodeSekarang()
  );
}

function migrasiKasAlokasiDryRun() {
  return migrasiKasAlokasi(true);
}

function migrasiWargaDryRun() {
  return migrasiWarga(true);
}

function backupSekarang() {
  return backupSpreadsheet(SpreadsheetApp.openById(SPREADSHEET_ID));
}

function cekToken() {
  const r = UrlFetchApp.fetch("https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/getMe");
  Logger.log(r.getContentText());
  return r.getContentText();
}

function cekKirim(pesan) {
  const target = (ADMIN_IDS && ADMIN_IDS.length) ? ADMIN_IDS[0] : "";
  if (!target) {
    Logger.log("ADMIN_IDS belum diisi.");
    return "admin root kosong";
  }
  const teks = pesan === null || pesan === undefined || pesan === "" ? "tes langsung" : String(pesan);
  sendTelegramMessage(target, teks);
  return "terkirim ke " + target;
}


// Node/Jest compatibility
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        str,
        aman,
        parseAngka,
        fmtRp,
        toBool,
        parseTanggal,
        formatTanggal,
        formatTanggalMDY,
        formatStamp,
        pad2,
        escMd,
        naturalCompare,
        sortNoRumah,
        padKanan,
        padKiri,
        periodeSekarang,
        periodeDariTanggal,
        parsePeriode,
        bandingPeriode,
        tambahBulan,
        daftarPeriode,
        awalPeriode,
        akhirPeriode,
        namaBulan,
        labelPeriode,
        getSpreadsheet,
        bacaTabel,
        tambahBaris,
        setSel,
        konversiNilai,
        getSettings,
        getSetting,
        setSetting,
        generateIdKK,
        getKeluarga,
        getKeluargaAktif,
        getKeluargaBillable,
        getAnggota,
        getAnggotaAktif,
        getJumlahJiwaKK,
        getJumlahJiwa,
        getJumlahJiwaUntukIds,
        normalizeJK,
        cariKeluarga,
        tambahKeluarga,
        tambahAnggota,
        ubahAnggota,
        getTelegramUserRows,
        cariTelegramUser,
        getKkTerhubung,
        isKkTerhubung,
        batasTelegramPerKk,
        batasKkPerTelegram,
        hitungAkunKk,
        hitungKkAktifTelegram,
        ajukanKeterkaitan,
        barisUntukArg,
        verifikasiKeterkaitan,
        tolakKeterkaitan,
        cabutKeterkaitan,
        isPrivateChat,
        notifPengajuanAdmin,
        getTarifList,
        getTarifUntukPeriode,
        setTarif,
        sesuaikanTarifPeriode,
        getAlokasiAktif,
        validasiAlokasi,
        hitungPembagian,
        getTagihan,
        getTagihanPeriode,
        cariTagihan,
        isPeriodeTertutup,
        pastikanTagihan,
        backfillTagihan,
        hitungTunggakanKK,
        hitungTunggakan,
        getBulanTunggakanKK,
        refPembayaran,
        kasRefAda,
        catatPembayaran,
        getKas,
        efekKas,
        getSaldoMap,
        getSaldoKantong,
        getSaldoSemuaKantong,
        tambahKasManual,
        pindahKas,
        getMutasiKantong,
        getTutupBuku,
        getTutupBukuAlokasi,
        snapshotTerakhirSebelum,
        snapshotAlokasiSebelum,
        daftarKodeKantong,
        hitungKasPeriode,
        hitungRekapPeriode,
        tutupBuku,
        tutupBukuBulanan,
        tutupBukuTahunan,
        progressBar,
        hitungRekapRentang,
        getDaftarKK,
        parseAdminIds,
        getAdminTambahan,
        getAdminIds,
        isAdmin,
        isAdminInti,
        simpanAdminTambahan,
        setAdminIds,
        setGroupChatId,
        getGroupChatId,
        teksPerintah,
        balas,
        balasError,
        tolakAdmin,
        kirimTagihanKK,
        kirimTunggakanKK,
        ringkasanKkTerhubung,
        penunggakPeriode,
        formatRekapBulanan,
        formatRekapRentang,
        formatDaftarKK,
        formatSaldoKas,
        getProcessedUpdateIds,
        saveProcessedUpdateIds,
        isAckOnly,
        isProcessed,
        markProcessed,
        getWebhookInfo,
        deleteWebhook,
        setWebhook,
        pecahPesan,
        sendTelegramMessage,
        sendAdminMessage,
        getBotUsername,
        getScriptCache, cacheGet, cachePut, kasCacheVersion, invalidateKasCache,
        cmdLink,
        pollTelegram,
        setupPollingTrigger,
        stopPollingTrigger,
        migrasiKasAlokasi,
        migrasiWarga,
        backupSpreadsheet,
        terapkanSchema,
        seedSettings,
        seedTarifAwal,
        seedAlokasiDefault,
        setupSheets,
        initSheets,
        resetSheetSkemaDryRun,
        resetSheetSkema,
        resetSemuaSheetDryRun,
        resetSemuaSheet,
        backfillTagihanBulanan,
        migrasiKasAlokasiDryRun,
        migrasiWargaDryRun,
        backupSekarang,
        cekToken,
        cekKirim,
    };
}

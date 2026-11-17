const { pakrt, buatSheet } = require("./helpers/fixtures");
const { setSpreadsheet, createMockSheet } = require("./helpers/mockSheet");

const SKEMA = ["Setting", "Keluarga", "Anggota", "TarifIuran", "AlokasiIuran", "Tagihan", "TutupBuku", "TutupBukuAlokasi", "TelegramUser"];

function pasangBackup() {
  const calls = [];
  global.DriveApp = {
    getFileById: (id) => ({
      makeCopy: (nama) => {
        calls.push({ id, nama });
        return {
          getId: () => "backup-id",
          getName: () => nama,
        };
      },
    }),
  };
  return calls;
}

function buatSpreadsheet(extra) {
  const sheets = Object.assign(
    {
      Kas: buatSheet("Kas", [
        { tanggal: new Date(2024, 0, 5), keterangan: "Iuran", jenis: "masuk", nominal: 50000, alokasi: "kasrt" },
      ]),
      Pengumuman: buatSheet("Pengumuman", [
        { timestamp: new Date(2024, 0, 1), kategori: "Umum", isi: "Halo", pengirim: "RT" },
      ]),
    },
    extra || {}
  );
  return setSpreadsheet(sheets);
}

describe("setupSheets", () => {
  beforeEach(() => {
    pakrt.setAdminIds([]);
    delete global.DriveApp;
  });

  test("mode safe membuat sheet yang belum ada tanpa menghapus data", () => {
    const kas = buatSheet("Kas", [
      { tanggal: new Date(2024, 0, 5), keterangan: "Iuran", jenis: "masuk", nominal: 50000, alokasi: "kasrt" },
    ]);
    const ss = setSpreadsheet({ Kas: kas });
    const hasil = pakrt.setupSheets({ spreadsheet: ss, mode: "safe" });
    expect(hasil.mode).toBe("safe");
    expect(hasil.dihapus).toEqual([]);
    expect(hasil.backup).toBeNull();
    SKEMA.forEach((nama) => {
      expect(ss.getSheetByName(nama)).not.toBeNull();
    });
    expect(ss.getSheetByName("Kas")).toBe(kas);
    expect(kas._data.length).toBe(2);
    expect(pakrt.bacaTabel("Setting").rows.length).toBe(Object.keys(pakrt.DEFAULT_SETTINGS).length);
    expect(pakrt.getTarifList().length).toBe(1);
    expect(pakrt.getAlokasiAktif().length).toBe(3);
  });

  test("mode safe mempertahankan isi sheet skema yang sudah ada", () => {
    const keluarga = buatSheet("Keluarga", [
      { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
    ]);
    const ss = buatSpreadsheet({ Keluarga: keluarga });
    pakrt.setupSheets({ spreadsheet: ss, mode: "safe" });
    expect(ss.getSheetByName("Keluarga")).toBe(keluarga);
    expect(pakrt.getKeluarga().length).toBe(1);
  });

  test("mode reset menghapus & membuat ulang sheet skema, data Kas/Pengumuman aman", () => {
    const backup = pasangBackup();
    const kas = buatSheet("Kas", [
      { tanggal: new Date(2024, 0, 5), keterangan: "Iuran", jenis: "masuk", nominal: 50000, alokasi: "kasrt" },
    ]);
    const pengumuman = buatSheet("Pengumuman", [
      { timestamp: new Date(2024, 0, 1), kategori: "Umum", isi: "Halo", pengirim: "RT" },
    ]);
    const keluarga = buatSheet("Keluarga", [
      { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
    ]);
    const ss = setSpreadsheet({ Kas: kas, Pengumuman: pengumuman, Keluarga: keluarga });

    const hasil = pakrt.setupSheets({ spreadsheet: ss, mode: "reset" });

    expect(hasil.dihapus.sort()).toEqual(["Keluarga"]);
    expect(hasil.dibuat.sort()).toEqual(SKEMA.slice().sort());
    expect(backup.length).toBe(1);
    expect(hasil.backup.nama).toMatch(/^pakrt-backup-/);
    expect(ss.getSheetByName("Kas")).toBe(kas);
    expect(kas._data.length).toBe(2);
    expect(ss.getSheetByName("Pengumuman")).toBe(pengumuman);
    expect(pakrt.getKeluarga().length).toBe(0);
    expect(pakrt.bacaTabel("Setting").rows.length).toBe(Object.keys(pakrt.DEFAULT_SETTINGS).length);
  });

  test("mode fresh juga menghapus data Kas/Pengumuman", () => {
    const backup = pasangBackup();
    const kas = buatSheet("Kas", [
      { tanggal: new Date(2024, 0, 5), keterangan: "Iuran", jenis: "masuk", nominal: 50000, alokasi: "kasrt" },
    ]);
    const ss = setSpreadsheet({ Kas: kas });
    const hasil = pakrt.setupSheets({ spreadsheet: ss, mode: "fresh" });
    expect(hasil.mode).toBe("fresh");
    expect(backup.length).toBe(1);
    const kasBaru = ss.getSheetByName("Kas");
    expect(kasBaru).not.toBe(kas);
    expect(pakrt.getKas().length).toBe(0);
    expect(pakrt.bacaTabel("Pengumuman").rows.length).toBe(0);
  });

  test("dryRun hanya mengembalikan rencana tanpa mengubah apapun", () => {
    const backup = pasangBackup();
    const ss = buatSpreadsheet();
    const sebelum = Object.keys(ss._sheets).sort();
    const hasil = pakrt.setupSheets({ spreadsheet: ss, mode: "reset", dryRun: true });
    expect(hasil.dryRun).toBe(true);
    expect(hasil.akanBuat.sort()).toEqual(SKEMA.slice().sort());
    expect(hasil.akanHapus).toEqual([]);
    expect(backup.length).toBe(0);
    expect(Object.keys(ss._sheets).sort()).toEqual(sebelum);
  });

  test("dryRun mode safe menandai sheet yang akan dibuat", () => {
    const ss = buatSpreadsheet();
    const hasil = pakrt.setupSheets({ spreadsheet: ss, mode: "safe", dryRun: true });
    expect(hasil.akanHapus).toEqual([]);
    expect(hasil.akanBuat.sort()).toEqual(SKEMA.slice().sort());
  });

  test("mode tidak dikenal ditolak", () => {
    const ss = buatSpreadsheet();
    expect(() => pakrt.setupSheets({ spreadsheet: ss, mode: "ngawur" })).toThrow(/safe\/reset\/fresh/);
  });

  test("backup gagal jika DriveApp tidak tersedia", () => {
    const ss = buatSpreadsheet();
    expect(() => pakrt.setupSheets({ spreadsheet: ss, mode: "reset" })).toThrow(/DriveApp/);
  });

  test("backup bisa dimatikan eksplisit", () => {
    const backup = pasangBackup();
    const ss = buatSpreadsheet();
    const hasil = pakrt.setupSheets({ spreadsheet: ss, mode: "reset", backup: false });
    expect(backup.length).toBe(0);
    expect(hasil.backup).toBeNull();
  });

  test("backfill otomatis saat diminta", () => {
    const ss = buatSpreadsheet({
      Keluarga: buatSheet("Keluarga", [
        { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2026-01" },
      ]),
    });
    const hasil = pakrt.setupSheets({ spreadsheet: ss, mode: "safe", backfill: true });
    expect(hasil.backfill).toBeGreaterThan(0);
    expect(pakrt.getTagihan().length).toBe(hasil.backfill);
  });

  test("wrapper editor tersedia & tetap memakai SPREADSHEET_ID", () => {
    expect(typeof pakrt.initSheets).toBe("function");
    expect(typeof pakrt.resetSheetSkema).toBe("function");
    expect(typeof pakrt.resetSheetSkemaDryRun).toBe("function");
    expect(typeof pakrt.resetSemuaSheet).toBe("function");
    expect(typeof pakrt.resetSemuaSheetDryRun).toBe("function");
    expect(typeof pakrt.backfillTagihanBulanan).toBe("function");
    // SPREADSHEET_ID di repo kosong -> wrapper menolak jalan
    expect(() => pakrt.initSheets()).toThrow(/SPREADSHEET_ID/);
  });
});

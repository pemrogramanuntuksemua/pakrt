const { pakrt, buatSheet, dasar, admin, teksTerakhir } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2024-01" },
            { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Aktif", mulai_iuran: "2024-01" },
            { id_kk: "KK-003", no_rumah: "A10", nama_kk: "Andi", status: "Aktif", mulai_iuran: "2024-01" },
            { id_kk: "KK-004", no_rumah: "A3", nama_kk: "Pindah", status: "Pindah", mulai_iuran: "2024-01" },
          ]),
          Anggota: buatSheet("Anggota", [
            { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
            { id_kk: "KK-002", nama: "Siti", hubungan: "Kepala Keluarga", jenis_kelamin: "P", status: "Aktif" },
            { id_kk: "KK-003", nama: "Andi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
            { id_kk: "KK-003", nama: "Ani", hubungan: "Istri", jenis_kelamin: "P", status: "Aktif" },
          ]),
          TarifIuran: buatSheet("TarifIuran", [{ berlaku_mulai: "2024-01", nominal: 50000, keterangan: "awal" }]),
          Tagihan: buatSheet("Tagihan", [
            { periode: "2024-01", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "lunas" },
            { periode: "2024-01", id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", nominal: 50000, status: "belum" },
            { periode: "2024-01", id_kk: "KK-003", no_rumah: "A10", nama_kk: "Andi", nominal: 50000, status: "belum" },
            { periode: "2024-02", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "lunas" },
            { periode: "2024-02", id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", nominal: 50000, status: "lunas" },
            { periode: "2024-02", id_kk: "KK-003", no_rumah: "A10", nama_kk: "Andi", nominal: 50000, status: "belum" },
          ]),
        },
        extra || {}
      )
    )
  );
}

describe("rekap per periode", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("hitungRekapPeriode menghitung target, terbayar, tunggakan, jiwa", () => {
    setup();
    const r = pakrt.hitungRekapPeriode("2024-01");
    expect(r.totalKK).toBe(3);
    expect(r.lunasKK).toBe(1);
    expect(r.belumKK).toBe(2);
    expect(r.totalTagihan).toBe(150000);
    expect(r.terbayar).toBe(50000);
    expect(r.tunggakan).toBe(100000);
    expect(r.totalJiwa).toBe(4);
  });

  test("hitungRekapRentang menjumlahkan beberapa bulan & menandai penunggak", () => {
    setup();
    const r = pakrt.hitungRekapRentang("2024-01", "2024-02");
    expect(r.dari).toBe("2024-01");
    expect(r.sampai).toBe("2024-02");
    expect(r.perPeriode.length).toBe(2);
    expect(r.target).toBe(300000);
    expect(r.tunggakan).toBe(150000);
    expect(r.terbayar).toBe(150000);
    expect(r.penunggak[0]).toMatchObject({ id_kk: "KK-003", total: 100000, bulan: 2 });
    expect(r.penunggak[1]).toMatchObject({ id_kk: "KK-002", total: 50000, bulan: 1 });
  });

  test("hitungRekapRentang menolak rentang > 24 bulan", () => {
    setup();
    expect(() => pakrt.hitungRekapRentang("2024-01", "2026-01")).toThrow(/24 bulan/);
  });

  test("progressBar membulatkan persen", () => {
    expect(pakrt.progressBar(100)).toBe("██████████");
    expect(pakrt.progressBar(0)).toBe("░░░░░░░░░░");
    expect(pakrt.progressBar(33)).toBe("███░░░░░░░");
  });

  test("handleRekap non-admin ditolak", () => {
    setup();
    pakrt.handleRekap(1, "/rekap 2024-01", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("handleRekap satu periode menampilkan rekap bulanan", () => {
    admin();
    setup();
    pakrt.handleRekap(1, "/rekap 2024-01", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("REKAP IURAN — JANUARI 2024");
    expect(text).toContain("Rp 150.000");
    expect(text).toContain("Rp 50.000");
    expect(text).toContain("Rp 100.000");
    expect(text).toContain("KK-002");
    expect(text).toContain("KK-003");
  });

  test("handleRekap periode tertutup diberi penanda 🔒", () => {
    admin();
    setup({
      TutupBuku: buatSheet("TutupBuku", [{ periode: "2024-01", jenis: "bulan" }]),
    });
    pakrt.handleRekap(1, "/rekap 2024-01", "X", 1);
    expect(teksTerakhir()).toContain("🔒");
  });

  test("handleRekap rentang menampilkan ringkasan per bulan", () => {
    admin();
    setup();
    pakrt.handleRekap(1, "/rekap 2024-01..2024-02", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Januari 2024 – Februari 2024");
    expect(text).toContain("Per bulan:");
    expect(text).toContain("2024-01");
    expect(text).toContain("2024-02");
  });

  test("handleRekap format salah -> error", () => {
    admin();
    setup();
    pakrt.handleRekap(1, "/rekap 2024-13", "X", 1);
    expect(teksTerakhir()).toContain("Format");
  });
});

describe("daftar KK", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("getDaftarKK hanya aktif secara default & urut nomor rumah natural", () => {
    setup();
    const rows = pakrt.getDaftarKK();
    expect(rows.map((r) => r.no_rumah)).toEqual(["A1", "A2", "A10"]);
    expect(rows.map((r) => r.id_kk)).toEqual(["KK-001", "KK-002", "KK-003"]);
    expect(rows[2].tunggakan).toBe(100000);
    expect(rows[2].bulan).toBe(2);
    expect(rows[2].jiwa).toBe(2);
  });

  test("getDaftarKK semua & urut tagihan", () => {
    setup();
    const semua = pakrt.getDaftarKK({ semua: true });
    expect(semua.length).toBe(4);
    const urut = pakrt.getDaftarKK({ urut: "tagihan" });
    expect(urut[0].id_kk).toBe("KK-003");
    expect(urut[urut.length - 1].tunggakan).toBe(0);
  });

  test("handleDaftar non-admin ditolak", () => {
    setup();
    pakrt.handleDaftar(1, "/daftar", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("handleDaftar menampilkan tabel & ringkasan", () => {
    admin();
    setup();
    pakrt.handleDaftar(1, "/daftar", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("DAFTAR KK");
    expect(text).toContain("Total tunggakan Rp 150.000");
    expect(text).toContain("A10");
    expect(text).toContain("3 KK · 4 jiwa");
  });

  test("handleDaftar kosong -> arahan tambahkk", () => {
    admin();
    setSpreadsheet(dasar());
    pakrt.handleDaftar(1, "/daftar", "X", 1);
    expect(teksTerakhir()).toContain("Belum ada KK");
  });
});

const { pakrt, buatSheet, dasar, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

describe("tarif iuran", () => {
  test("tarif efektif memakai baris terbaru <= periode", () => {
    setSpreadsheet(
      dasar({
        TarifIuran: buatSheet("TarifIuran", [
          { berlaku_mulai: "2026-01", nominal: 50000, keterangan: "awal" },
          { berlaku_mulai: "2026-07", nominal: 60000, keterangan: "naik" },
        ]),
      })
    );
    expect(pakrt.getTarifUntukPeriode("2026-06")).toBe(50000);
    expect(pakrt.getTarifUntukPeriode("2026-07")).toBe(60000);
    expect(pakrt.getTarifUntukPeriode("2027-01")).toBe(60000);
  });

  test("periode sebelum tarif pertama -> fallback setting", () => {
    setSpreadsheet(
      dasar({
        TarifIuran: buatSheet("TarifIuran", [{ berlaku_mulai: "2026-01", nominal: 50000 }]),
      })
    );
    expect(pakrt.getTarifUntukPeriode("2025-12")).toBe(50000);
  });

  test("setTarif menambah baris dan hanya mengubah tagihan belum", () => {
    setSpreadsheet(
      dasar({
        Tagihan: buatSheet("Tagihan", [
          { periode: "2026-03", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "belum" },
          { periode: "2026-03", id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", nominal: 50000, status: "lunas" },
        ]),
      })
    );
    const hasil = pakrt.setTarif("2026-03", 55000, "Kenaikan");
    expect(hasil.periode).toBe("2026-03");
    expect(hasil.tagihanDiubah).toBe(1);
    const rows = baca("Tagihan");
    expect(rows.filter((r) => r.status === "belum")[0].nominal).toBe(55000);
    expect(rows.filter((r) => r.status === "lunas")[0].nominal).toBe(50000);
    expect(pakrt.getTarifUntukPeriode("2026-03")).toBe(55000);
  });

  test("setTarif ditolak jika alokasi tetap melebihi tarif", () => {
    setSpreadsheet(dasar());
    expect(() => pakrt.setTarif("2026-04", 40000, "Terlalu rendah")).toThrow(/melebihi/);
  });

  test("setTarif menolak periode tertutup", () => {
    setSpreadsheet(
      dasar({
        TutupBuku: buatSheet("TutupBuku", [
          {
            periode: "2026-02",
            jenis: "bulan",
            tarif: 50000,
            total_kk: 1,
            total_jiwa: 1,
            total_tagihan: 50000,
            total_terbayar: 0,
            total_masuk: 0,
            total_keluar: 0,
            saldo_awal: 0,
            saldo_akhir: 0,
          },
        ]),
      })
    );
    expect(() => pakrt.setTarif("2026-02", 55000, "x")).toThrow(/ditutup/);
  });
});

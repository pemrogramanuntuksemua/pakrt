const { pakrt, buatSheet, dasar, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

describe("kas multi-kantong", () => {
  test("tambahKasManual masuk & keluar", () => {
    setSpreadsheet(dasar());
    pakrt.tambahKasManual("masuk", "kasrt", 50000, "Iuran", "Bendahara");
    expect(pakrt.getSaldoKantong("kasrt")).toBe(50000);
    pakrt.tambahKasManual("keluar", "kasrt", 20000, "ATK", "Bendahara");
    expect(pakrt.getSaldoKantong("kasrt")).toBe(30000);
    expect(baca("Kas").length).toBe(2);
  });

  test("keluar melebihi saldo kantong ditolak", () => {
    setSpreadsheet(dasar());
    pakrt.tambahKasManual("masuk", "dkmt", 5000, "Iuran", "X");
    expect(() => pakrt.tambahKasManual("keluar", "dkmt", 10000, "Santunan", "X")).toThrow(/tidak cukup/);
    expect(baca("Kas").length).toBe(1);
  });

  test("kantong tidak dikenal ditolak", () => {
    setSpreadsheet(dasar());
    expect(() => pakrt.tambahKasManual("masuk", "lain", 1000, "x", "X")).toThrow(/tidak dikenal/);
  });

  test("pindahKas menulis dua baris dengan ref sama dan total tetap", () => {
    setSpreadsheet(dasar());
    pakrt.tambahKasManual("masuk", "kasrt", 50000, "Iuran", "X");
    const totalAwal = pakrt.getSaldoSemuaKantong().reduce((t, s) => t + s.saldo, 0);
    const hasil = pakrt.pindahKas("kasrt", "dkmt", 10000, "Surplus", "X");
    const kas = baca("Kas");
    expect(kas.length).toBe(3);
    const pindah = kas.filter((j) => j.ref === hasil.ref);
    expect(pindah.length).toBe(2);
    expect(pindah.map((j) => j.jenis).sort()).toEqual(["pindah_keluar", "pindah_masuk"]);
    expect(pakrt.getSaldoKantong("kasrt")).toBe(40000);
    expect(pakrt.getSaldoKantong("dkmt")).toBe(10000);
    const totalAkhir = pakrt.getSaldoSemuaKantong().reduce((t, s) => t + s.saldo, 0);
    expect(totalAkhir).toBe(totalAwal);
  });

  test("pindahKas menolak asal = tujuan & saldo kurang", () => {
    setSpreadsheet(dasar());
    pakrt.tambahKasManual("masuk", "kasrt", 10000, "Iuran", "X");
    expect(() => pakrt.pindahKas("kasrt", "kasrt", 1000, "x", "X")).toThrow(/tidak boleh sama/);
    expect(() => pakrt.pindahKas("kasrt", "dkmt", 20000, "x", "X")).toThrow(/tidak cukup/);
  });

  test("transaksi pada periode tertutup ditolak", () => {
    setSpreadsheet(
      dasar({
        TutupBuku: buatSheet("TutupBuku", [
          {
            periode: "2024-01",
            jenis: "bulan",
            tarif: 50000,
            total_kk: 1,
            total_jiwa: 1,
            total_tagihan: 50000,
            total_terbayar: 50000,
            total_masuk: 50000,
            total_keluar: 0,
            saldo_awal: 0,
            saldo_akhir: 50000,
          },
        ]),
      })
    );
    expect(() =>
      pakrt.tambahKasManual("masuk", "kasrt", 1000, "x", "X", new Date(2024, 0, 15))
    ).toThrow(/ditutup/);
  });

  test("getMutasiKantong memfilter periode", () => {
    setSpreadsheet(
      dasar({
        Kas: buatSheet("Kas", [
          { tanggal: new Date(2024, 0, 5), keterangan: "Jan", jenis: "masuk", nominal: 1000, alokasi: "kasrt" },
          { tanggal: new Date(2024, 1, 5), keterangan: "Feb", jenis: "masuk", nominal: 2000, alokasi: "kasrt" },
          { tanggal: new Date(2024, 1, 6), keterangan: "Lain", jenis: "masuk", nominal: 3000, alokasi: "dkmt" },
        ]),
      })
    );
    const feb = pakrt.getMutasiKantong("kasrt", "2024-02", "2024-02");
    expect(feb.length).toBe(1);
    expect(feb[0].keterangan).toBe("Feb");
  });
});

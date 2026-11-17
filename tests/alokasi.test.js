const { pakrt, buatSheet, dasar } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function alokasi(rows) {
  return buatSheet(
    "AlokasiIuran",
    rows.map((r) => ({
      kode: r.kode,
      nama: r.nama || r.kode,
      nominal: r.nominal || 0,
      sisa: r.sisa,
      keterangan: r.keterangan || "",
    }))
  );
}

describe("alokasi & pembagian iuran", () => {
  test("tanpa sheet AlokasiIuran memakai default", () => {
    setSpreadsheet({});
    const list = pakrt.getAlokasiAktif();
    expect(list.map((a) => a.kode)).toEqual(["kasrt", "dkmt", "kamsih"]);
  });

  test("pembagian 50.000 -> 5.000 / 5.000 / 40.000", () => {
    setSpreadsheet(dasar());
    expect(pakrt.hitungPembagian(50000)).toEqual([
      { kode: "kasrt", nama: "Kas RT", nominal: 5000 },
      { kode: "dkmt", nama: "Dana Kematian", nominal: 5000 },
      { kode: "kamsih", nama: "Keamanan & Kebersihan", nominal: 40000 },
    ]);
  });

  test("tarif naik 60.000 -> kantong sisa menyesuaikan", () => {
    setSpreadsheet(dasar());
    const hasil = pakrt.hitungPembagian(60000);
    expect(hasil.filter((b) => b.kode === "kasrt")[0].nominal).toBe(15000);
    expect(hasil.filter((b) => b.kode === "dkmt")[0].nominal).toBe(5000);
    expect(hasil.filter((b) => b.kode === "kamsih")[0].nominal).toBe(40000);
  });

  test("nominal di bawah total tetap -> ditolak", () => {
    setSpreadsheet(dasar());
    expect(() => pakrt.hitungPembagian(40000)).toThrow(/melebihi/);
  });

  test("tepat satu kantong sisa", () => {
    setSpreadsheet(
      dasar({
        AlokasiIuran: alokasi([
          { kode: "kasrt", nominal: 0, sisa: true },
          { kode: "dkmt", nominal: 5000, sisa: true },
        ]),
      })
    );
    expect(() => pakrt.validasiAlokasi()).toThrow(/tepat satu/);
  });

  test("kode invalid (huruf besar/spasi/lebih dari 8) ditolak", () => {
    setSpreadsheet(
      dasar({
        AlokasiIuran: alokasi([
          { kode: "KasRT", nominal: 0, sisa: true },
          { kode: "dkmt", nominal: 5000 },
        ]),
      })
    );
    expect(() => pakrt.validasiAlokasi()).toThrow(/tidak valid/);
  });

  test("kode duplikat ditolak", () => {
    setSpreadsheet(
      dasar({
        AlokasiIuran: alokasi([
          { kode: "kasrt", nominal: 0, sisa: true },
          { kode: "kasrt", nominal: 5000 },
        ]),
      })
    );
    expect(() => pakrt.validasiAlokasi()).toThrow(/duplikat/);
  });

  test("kantong bernominal 0 dilewati", () => {
    setSpreadsheet(
      dasar({
        AlokasiIuran: alokasi([
          { kode: "kasrt", nominal: 0, sisa: true },
          { kode: "dkmt", nominal: 0 },
        ]),
      })
    );
    expect(pakrt.hitungPembagian(50000)).toEqual([
      { kode: "kasrt", nama: "kasrt", nominal: 50000 },
    ]);
  });
});

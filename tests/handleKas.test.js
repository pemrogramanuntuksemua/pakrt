const { pakrt, buatSheet, dasar, teksTerakhir } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function kas(rows) {
  return buatSheet("Kas", rows);
}

describe("handleKas", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    global.__resetCache();
    global.PropertiesService.getScriptProperties().setProperty("KAS_CACHE_VERSION", "0");
  });

  test("tab Kas belum ada -> pesan peringatan", () => {
    setSpreadsheet({});
    pakrt.handleKas(1, "/kas", "X", 1);
    expect(teksTerakhir()).toContain("Tab 'Kas' belum dibuat");
  });

  test("header saja -> saldo nol per kantong", () => {
    setSpreadsheet(dasar({ Kas: kas([]) }));
    pakrt.handleKas(1, "/kas", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("kasrt");
    expect(text).toContain("dkmt");
    expect(text).toContain("kamsih");
    expect(text).toContain("TOTAL");
    expect(text).toContain("Rp 0");
  });

  test("menghitung saldo per kantong dan total", () => {
    setSpreadsheet(
      dasar({
        Kas: kas([
          { tanggal: new Date(2026, 0, 5), keterangan: "Iuran", jenis: "masuk", nominal: 50000, alokasi: "kasrt" },
          { tanggal: new Date(2026, 0, 6), keterangan: "Iuran", jenis: "masuk", nominal: 5000, alokasi: "dkmt" },
          { tanggal: new Date(2026, 0, 7), keterangan: "Honor", jenis: "keluar", nominal: 20000, alokasi: "kasrt" },
        ]),
      })
    );
    pakrt.handleKas(1, "/kas", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Rp 35.000");
  });

  test("/kas <kode> menampilkan mutasi kantong", () => {
    setSpreadsheet(
      dasar({
        Kas: kas([
          { tanggal: new Date(2026, 0, 5), keterangan: "Iuran Budi", jenis: "masuk", nominal: 50000, alokasi: "kasrt" },
          { tanggal: new Date(2026, 0, 6), keterangan: "Beli ATK", jenis: "keluar", nominal: 5000, alokasi: "kasrt" },
        ]),
      })
    );
    pakrt.handleKas(1, "/kas kasrt", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Kas RT");
    expect(text).toContain("Iuran Budi");
    expect(text).toContain("Beli ATK");
    expect(text).toContain("Rp 45.000");
  });

  test("/kas <kode> tidak dikenal -> error", () => {
    setSpreadsheet(dasar({ Kas: kas([]) }));
    pakrt.handleKas(1, "/kas ngawur", "X", 1);
    expect(teksTerakhir()).toContain("tidak dikenal");
  });

  test("/kas YYYY-MM menampilkan saldo akhir periode", () => {
    setSpreadsheet(
      dasar({
        Kas: kas([
          { tanggal: new Date(2026, 0, 5), keterangan: "Masuk Jan", jenis: "masuk", nominal: 50000, alokasi: "kasrt" },
          { tanggal: new Date(2026, 1, 5), keterangan: "Masuk Feb", jenis: "masuk", nominal: 60000, alokasi: "kasrt" },
        ]),
      })
    );
    pakrt.handleKas(1, "/kas 2026-01", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Januari 2026");
    expect(text).toContain("Rp 50.000");
    expect(text).not.toContain("Rp 110.000");
  });
});

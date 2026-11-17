const { pakrt, buatSheet, dasar, admin, teksTerakhir, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function kas(rows) {
  return buatSheet("Kas", rows);
}

describe("handleTambahKas", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("non-admin -> akses ditolak", () => {
    pakrt.handleTambahKas(1, "/tambahkas masuk#kasrt#50000#Iuran", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("format lama (tanpa alokasi) -> pesan perubahan format", () => {
    admin();
    setSpreadsheet(dasar());
    pakrt.handleTambahKas(1, "/tambahkas masuk#50000#Iuran", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Format /tambahkas berubah");
    expect(text).toContain("jenis#alokasi#nominal#keterangan");
  });

  test("format benar tapi jenis invalid -> format salah", () => {
    admin();
    setSpreadsheet(dasar());
    pakrt.handleTambahKas(1, "/tambahkas foo#kasrt#1000#x", "X", 1);
    expect(teksTerakhir()).toContain("Format Salah");
  });

  test("kantong tidak dikenal -> error", () => {
    admin();
    setSpreadsheet(dasar());
    pakrt.handleTambahKas(1, "/tambahkas masuk#ngawur#1000#x", "X", 1);
    expect(teksTerakhir()).toContain("tidak dikenal");
  });

  test("masuk valid -> satu baris Kas dengan alokasi", () => {
    admin();
    const sheet = kas([]);
    setSpreadsheet(dasar({ Kas: sheet }));
    pakrt.handleTambahKas(1, "/tambahkas masuk#kasrt#50000#Iuran Budi", "Bendahara", 1);
    const rows = baca("Kas");
    expect(rows.length).toBe(1);
    expect(rows[0].jenis).toBe("masuk");
    expect(rows[0].alokasi).toBe("kasrt");
    expect(rows[0].nominal).toBe(50000);
    expect(rows[0].keterangan).toBe("Iuran Budi");
    expect(teksTerakhir()).toContain("Kas Berhasil Dicatat");
  });

  test("keluar melebihi saldo kantong -> ditolak", () => {
    admin();
    setSpreadsheet(dasar({ Kas: kas([]) }));
    pakrt.handleTambahKas(1, "/tambahkas keluar#kasrt#10000#ATK", "X", 1);
    expect(teksTerakhir()).toContain("tidak cukup");
    expect(baca("Kas").length).toBe(0);
  });

  test("keluar dalam saldo -> tercatat", () => {
    admin();
    setSpreadsheet(
      dasar({
        Kas: kas([
          { tanggal: new Date(2026, 0, 2), keterangan: "Iuran", jenis: "masuk", nominal: 50000, alokasi: "kamsih" },
        ]),
      })
    );
    pakrt.handleTambahKas(1, "/tambahkas keluar#kamsih#40000#Honor satpam", "X", 1);
    const rows = baca("Kas");
    expect(rows.length).toBe(2);
    expect(rows[1].alokasi).toBe("kamsih");
    expect(rows[1].jenis).toBe("keluar");
    expect(teksTerakhir()).toContain("Saldo kantong");
  });

  test("tab Kas tidak ada -> peringatan", () => {
    admin();
    setSpreadsheet(dasar({ Kas: null }));
    pakrt.handleTambahKas(1, "/tambahkas masuk#kasrt#10000#Iuran", "X", 1);
    expect(teksTerakhir()).toContain("belum dibuat");
  });
});

const pakrt = require("../kode");
const { setSpreadsheet, createMockSheet } = require("./helpers/mockSheet");

function lastPayloadText() {
  const calls = global.UrlFetchApp.fetch.mock.calls;
  return JSON.parse(calls[calls.length - 1][1].payload).text;
}

describe("handleTambahKas", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
    pakrt.setAdminIds([]);
  });

  test("non-admin -> akses ditolak", () => {
    pakrt.handleTambahKas(1, "/tambahkas masuk 10000 Iuran", "X", 999);
    expect(lastPayloadText()).toContain("Akses Ditolak");
  });

  test("format salah (tanpa spasi) -> format error", () => {
    pakrt.setAdminIds([1]);
    pakrt.handleTambahKas(1, "/tambahkas", "X", 1);
    expect(lastPayloadText()).toContain("Format Salah");
  });

  test("jenis/nominal invalid -> format error", () => {
    pakrt.setAdminIds([1]);
    pakrt.handleTambahKas(1, "/tambahkas foo abc ket", "X", 1);
    expect(lastPayloadText()).toContain("Format salah atau nominal");
  });

  test("valid masuk -> appendRow dan sukses", () => {
    pakrt.setAdminIds([1]);
    const sheet = createMockSheet([["tanggal", "ket", "jenis", "nominal"]]);
    setSpreadsheet({ Kas: sheet });
    pakrt.handleTambahKas(1, "/tambahkas masuk 50000 Iuran Budi", "X", 1);
    expect(sheet._appended.length).toBe(1);
    const row = sheet._appended[0];
    expect(row[1]).toBe("Iuran Budi");
    expect(row[2]).toBe("Masuk");
    expect(row[3]).toBe(50000);
    expect(lastPayloadText()).toContain("Kas Berhasil Dicatat");
  });

  test("valid keluar tanpa keterangan -> 'Tanpa Keterangan'", () => {
    pakrt.setAdminIds([1]);
    const sheet = createMockSheet([["tanggal", "ket", "jenis", "nominal"]]);
    setSpreadsheet({ Kas: sheet });
    pakrt.handleTambahKas(1, "/tambahkas keluar 20000", "X", 1);
    expect(sheet._appended[0][1]).toBe("Tanpa Keterangan");
    expect(sheet._appended[0][2]).toBe("Keluar");
  });

  test("tab Kas tidak ada -> peringatan", () => {
    pakrt.setAdminIds([1]);
    setSpreadsheet({});
    pakrt.handleTambahKas(1, "/tambahkas masuk 10000 Iuran", "X", 1);
    expect(lastPayloadText()).toContain("Tab 'Kas' belum dibuat");
  });
});

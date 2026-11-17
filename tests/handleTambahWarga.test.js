const pakrt = require("../kode");
const { setSpreadsheet, createMockSheet } = require("./helpers/mockSheet");

function lastPayloadText() {
  const calls = global.UrlFetchApp.fetch.mock.calls;
  return JSON.parse(calls[calls.length - 1][1].payload).text;
}

describe("handleTambahWarga", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
    pakrt.setAdminIds([]);
  });

  test("non-admin -> akses ditolak", () => {
    pakrt.handleTambahWarga(1, "/tambahwarga A#1#2#L#Jl#cat", "X", 999);
    expect(lastPayloadText()).toContain("Akses Ditolak");
  });

  test("format kurang -> format error", () => {
    pakrt.setAdminIds([1]);
    pakrt.handleTambahWarga(1, "/tambahwarga A#1#2#L", "X", 1);
    expect(lastPayloadText()).toContain("Format Salah");
  });

  test("valid 5 kolom + catatan kosong -> appendRow", () => {
    pakrt.setAdminIds([1]);
    const sheet = createMockSheet([["nama", "hp", "rumah", "jk", "alamat", "catatan"]]);
    setSpreadsheet({ Warga: sheet });
    pakrt.handleTambahWarga(1, "/tambahwarga Budi#0812#12#Laki-laki#Jl. Mawar", "X", 1);
    expect(sheet._appended.length).toBe(1);
    const row = sheet._appended[0];
    expect(row[0]).toBe("Budi");
    expect(row[1]).toBe("0812");
    expect(row[2]).toBe("12");
    expect(row[3]).toBe("Laki-laki");
    expect(row[4]).toBe("Jl. Mawar");
    expect(row[5]).toBe("");
    expect(lastPayloadText()).toContain("Warga Berhasil Ditambahkan");
  });

  test("valid 6 kolom dengan catatan", () => {
    pakrt.setAdminIds([1]);
    const sheet = createMockSheet([["nama", "hp", "rumah", "jk", "alamat", "catatan"]]);
    setSpreadsheet({ Warga: sheet });
    pakrt.handleTambahWarga(1, "/tambahwarga Budi#0812#12#Laki-laki#Jl. Mawar#aktif", "X", 1);
    expect(sheet._appended[0][5]).toBe("aktif");
  });

  test("tab Warga tidak ada -> peringatan", () => {
    pakrt.setAdminIds([1]);
    setSpreadsheet({});
    pakrt.handleTambahWarga(1, "/tambahwarga Budi#0812#12#L#Jl", "X", 1);
    expect(lastPayloadText()).toContain("Tab 'Warga' belum dibuat");
  });
});

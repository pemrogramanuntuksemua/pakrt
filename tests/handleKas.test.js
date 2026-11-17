const pakrt = require("../kode");
const { setSpreadsheet, createMockSheet } = require("./helpers/mockSheet");

function lastPayloadText() {
  const calls = global.UrlFetchApp.fetch.mock.calls;
  const last = calls[calls.length - 1];
  return JSON.parse(last[1].payload).text;
}

describe("handleKas", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
  });

  test("tab Kas belum ada -> pesan peringatan", () => {
    setSpreadsheet({});
    pakrt.handleKas(1, "/kas", "X", 1);
    expect(lastPayloadText()).toContain("Tab 'Kas' belum dibuat");
  });

  test("hanya header -> belum ada transaksi", () => {
    const sheet = createMockSheet([["tanggal", "ket", "jenis", "nominal"]]);
    setSpreadsheet({ Kas: sheet });
    pakrt.handleKas(1, "/kas", "X", 1);
    expect(lastPayloadText()).toContain("Belum ada catatan transaksi kas");
  });

  test("menghitung total masuk/keluar dan saldo", () => {
    const rows = [
      ["tanggal", "ket", "jenis", "nominal"],
      [new Date("2024-01-01"), "Iuran", "Masuk", 50000],
      [new Date("2024-01-02"), "Beli", "Keluar", 20000],
    ];
    const sheet = createMockSheet(rows);
    setSpreadsheet({ Kas: sheet });
    pakrt.handleKas(1, "/kas", "X", 1);
    const text = lastPayloadText();
    expect(text).toContain("Rp 50.000");
    expect(text).toContain("Rp 20.000");
    expect(text).toContain("Rp 30.000");
  });

  test("menampilkan 3 transaksi terakhir", () => {
    const rows = [["tanggal", "ket", "jenis", "nominal"]];
    for (let i = 1; i <= 5; i++) {
      rows.push([new Date(`2024-01-0${i}`), `Ket${i}`, i % 2 === 0 ? "Keluar" : "Masuk", i * 1000]);
    }
    const sheet = createMockSheet(rows);
    setSpreadsheet({ Kas: sheet });
    pakrt.handleKas(1, "/kas", "X", 1);
    const text = lastPayloadText();
    expect(text).toContain("Ket3");
    expect(text).toContain("Ket4");
    expect(text).toContain("Ket5");
    expect(text).not.toContain("Ket1\n");
  });

  test("nominal tidak valid dihitung 0", () => {
    const rows = [
      ["tanggal", "ket", "jenis", "nominal"],
      [new Date("2024-01-01"), "X", "Masuk", "abc"],
    ];
    const sheet = createMockSheet(rows);
    setSpreadsheet({ Kas: sheet });
    pakrt.handleKas(1, "/kas", "X", 1);
    expect(lastPayloadText()).toContain("Rp 0");
  });
});

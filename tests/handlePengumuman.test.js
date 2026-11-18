const pakrt = require("../main");
const { setSpreadsheet, createMockSheet } = require("./helpers/mockSheet");

function lastPayloadText() {
  const calls = global.UrlFetchApp.fetch.mock.calls;
  return JSON.parse(calls[calls.length - 1][1].payload).text;
}

describe("handlePengumuman", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
  });

  test("tab tidak ada -> peringatan", () => {
    setSpreadsheet({});
    pakrt.handlePengumuman(1, "/pengumuman", "X", 1);
    expect(lastPayloadText()).toContain("Tab 'Pengumuman' belum dibuat");
  });

  test("kosong -> belum ada pengumuman", () => {
    const sheet = createMockSheet([["tgl", "kat", "isi"]]);
    setSpreadsheet({ Pengumuman: sheet });
    pakrt.handlePengumuman(1, "/pengumuman", "X", 1);
    expect(lastPayloadText()).toContain("Belum ada pengumuman penting");
  });

  test("menampilkan pengumuman terbaru (maks 5, urutan terbalik)", () => {
    const rows = [["tgl", "kat", "isi"]];
    for (let i = 1; i <= 7; i++) {
      rows.push([new Date(`2024-01-0${i}`), `Kat${i}`, `Isi${i}`]);
    }
    const sheet = createMockSheet(rows);
    setSpreadsheet({ Pengumuman: sheet });
    pakrt.handlePengumuman(1, "/pengumuman", "X", 1);
    const text = lastPayloadText();
    expect(text).toContain("Isi7");
    expect(text).toContain("Isi6");
    expect(text).toContain("Isi3");
    expect(text).not.toContain("Isi1");
    expect(text).not.toContain("Isi2");
  });
});

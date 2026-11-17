const pakrt = require("../kode");
const { setSpreadsheet, createMockSheet } = require("./helpers/mockSheet");

function payloadTexts() {
  return global.UrlFetchApp.fetch.mock.calls.map((c) => {
    try {
      return JSON.parse(c[1].payload).text;
    } catch (e) {
      return "";
    }
  });
}

describe("handleBuatPengumuman", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
    pakrt.setAdminIds([]);
    pakrt.setGroupChatId("");
  });

  test("non-admin -> akses ditolak", () => {
    pakrt.handleBuatPengumuman(1, "/buatpengumuman Info Halo", "X", 999);
    expect(payloadTexts()[0]).toContain("Akses Ditolak");
  });

  test("format salah -> format error", () => {
    pakrt.setAdminIds([1]);
    pakrt.handleBuatPengumuman(1, "/buatpengumuman Info", "X", 1);
    expect(payloadTexts()[0]).toContain("Format Salah");
  });

  test("valid -> appendRow dan sukses", () => {
    pakrt.setAdminIds([1]);
    const sheet = createMockSheet([["tgl", "kat", "isi", "oleh"]]);
    setSpreadsheet({ Pengumuman: sheet });
    pakrt.handleBuatPengumuman(1, "/buatpengumuman Info Halo warga", "Budi", 1);
    expect(sheet._appended.length).toBe(1);
    const row = sheet._appended[0];
    expect(row[1]).toBe("Info");
    expect(row[2]).toBe("Halo warga");
    expect(row[3]).toBe("Budi");
    expect(payloadTexts()[0]).toContain("Pengumuman Berhasil Disimpan");
  });

  test("broadcast ke grup jika GROUP_CHAT_ID diisi", () => {
    pakrt.setAdminIds([1]);
    pakrt.setGroupChatId("999");
    const sheet = createMockSheet([["tgl", "kat", "isi", "oleh"]]);
    setSpreadsheet({ Pengumuman: sheet });
    pakrt.handleBuatPengumuman(1, "/buatpengumuman Info Halo", "Budi", 1);
    const texts = payloadTexts();
    expect(texts.length).toBe(2);
    expect(texts[0]).toContain("PENGUMUMAN RT");
    expect(texts[1]).toContain("Pengumuman Berhasil Disimpan");
  });

  test("tab tidak ada -> peringatan", () => {
    pakrt.setAdminIds([1]);
    setSpreadsheet({});
    pakrt.handleBuatPengumuman(1, "/buatpengumuman Info Halo", "Budi", 1);
    expect(payloadTexts()[0]).toContain("Tab 'Pengumuman' belum dibuat");
  });
});

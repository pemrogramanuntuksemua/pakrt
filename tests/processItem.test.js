const pakrt = require("../kode");
const { setSpreadsheet } = require("./helpers/mockSheet");
const { buatSheet } = require("./helpers/fixtures");

function payloadTexts() {
  return global.UrlFetchApp.fetch.mock.calls.map((c) => {
    try {
      return JSON.parse(c[1].payload).text;
    } catch (e) {
      return "";
    }
  });
}

describe("processItem", () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
    pakrt.setAdminIds([]);
    pakrt.setGroupChatId("");
    setSpreadsheet({});
  });

  test("mendispatch /start ke handleStart", () => {
    pakrt.processItem(1, "/start", "Bre", 1);
    const texts = payloadTexts();
    expect(texts.length).toBe(1);
    expect(texts[0]).toContain("Selamat datang");
    expect(texts[0]).toContain("Bre");
  });

  test("mendispatch /warga", () => {
    setSpreadsheet({
      Keluarga: buatSheet("Keluarga", [
        { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
        { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Aktif" },
      ]),
      Anggota: buatSheet("Anggota", []),
    });
    pakrt.processItem(1, "/warga", "Bre", 1);
    expect(payloadTexts()[0]).toContain("KK aktif: *2*");
  });

  test("case-insensitive pada prefix", () => {
    pakrt.processItem(1, "/START", "Bre", 1);
    expect(payloadTexts().length).toBe(1);
  });

  test("perintah tidak dikenal tidak mengirim pesan", () => {
    pakrt.processItem(1, "halo bot", "Bre", 1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("chatId kosong di handleCommand mengembalikan failed", () => {
    const res = pakrt.handleCommand(null, "/start", "Bre", 1);
    expect(res).toBeTruthy();
  });

  test("handleCommand dengan chatId valid memproses perintah", () => {
    pakrt.handleCommand(1, "/start", "Bre", 1);
    expect(fetchMock).toHaveBeenCalled();
  });
});

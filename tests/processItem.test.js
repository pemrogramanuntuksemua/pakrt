const pakrt = require("../main");
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
    const sheet = createMockSheet([["h"], ["a"], ["b"]]);
    setSpreadsheet({ Warga: sheet });
    pakrt.processItem(1, "/warga", "Bre", 1);
    expect(payloadTexts()[0]).toContain("2 Kepala Keluarga");
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

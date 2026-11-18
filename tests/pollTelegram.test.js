const pakrt = require("../main");
const { setSpreadsheet } = require("./helpers/mockSheet");

function resetProps() {
  global.PropertiesService.getScriptProperties().setProperty("LAST_UPDATE_ID", "0");
  global.PropertiesService.getScriptProperties().setProperty("PROCESSED_UPDATE_IDS", "[]");
}

describe("pollTelegram", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn();
    global.UrlFetchApp = { fetch: fetchMock };
    setSpreadsheet({});
    pakrt.setAdminIds([]);
    pakrt.setGroupChatId("");
    resetProps();
  });

  test("memproses update dan menyimpan offset", () => {
    fetchMock.mockImplementation((url) => {
      if (String(url).includes("getUpdates")) {
        return {
          getContentText: () =>
            JSON.stringify({
              ok: true,
              result: [
                {
                  update_id: 10,
                  message: { chat: { id: 1 }, from: { id: 2, first_name: "X" }, text: "/start" },
                },
              ],
            }),
        };
      }
      return { getContentText: () => "" };
    });

    pakrt.pollTelegram();

    // sendMessage harus terpanggil oleh handleStart
    expect(fetchMock).toHaveBeenCalled();
    const lastUpdate = global.PropertiesService.getScriptProperties().getProperty("LAST_UPDATE_ID");
    expect(lastUpdate).toBe("10");
  });

  test("tidak memproses jika tidak ada update baru", () => {
    global.PropertiesService.getScriptProperties().setProperty("LAST_UPDATE_ID", "10");
    fetchMock.mockImplementation((url) => {
      if (String(url).includes("getUpdates")) {
        return {
          getContentText: () => JSON.stringify({ ok: true, result: [] }),
        };
      }
      return { getContentText: () => "" };
    });

    pakrt.pollTelegram();
    const sendCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes("sendMessage"));
    expect(sendCalls.length).toBe(0);
  });

  test("getUpdates error tidak crash", () => {
    fetchMock.mockImplementation(() => ({
      getContentText: () => JSON.stringify({ ok: false, description: "bad" }),
    }));
    expect(() => pakrt.pollTelegram()).not.toThrow();
  });
});

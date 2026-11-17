const pakrt = require("../kode");
const { setSpreadsheet } = require("./helpers/mockSheet");

function resetProps() {
  global.PropertiesService.getScriptProperties().setProperty("PROCESSED_UPDATE_IDS", "[]");
}

describe("doPost", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
    resetProps();
    setSpreadsheet({});
    pakrt.setAdminIds([]);
    pakrt.setGroupChatId("");
  });

  test("memproses update baru dan mengembalikan success", () => {
    const e = {
      postData: {
        contents: JSON.stringify({
          update_id: 1001,
          message: { chat: { id: 1 }, from: { id: 2, first_name: "X" }, text: "/start" },
        }),
      },
    };
    const res = pakrt.doPost(e);
    // respons HTML; cukup pastikan fetch terpanggil
    expect(fetchMock).toHaveBeenCalled();
  });

  test("update duplikat diabaikan (tidak memproses ulang)", () => {
    const payload = {
      update_id: 2002,
      message: { chat: { id: 1 }, from: { id: 2, first_name: "X" }, text: "/start" },
    };
    const e = { postData: { contents: JSON.stringify(payload) } };
    pakrt.doPost(e);
    const callsBefore = fetchMock.mock.calls.length;
    pakrt.doPost(e);
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  test("update tanpa update_id tetap diproses", () => {
    const e = {
      postData: {
        contents: JSON.stringify({
          message: { chat: { id: 1 }, from: { id: 2, first_name: "X" }, text: "/start" },
        }),
      },
    };
    pakrt.doPost(e);
    expect(fetchMock).toHaveBeenCalled();
  });
});

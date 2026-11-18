const pakrt = require("../main");

describe("handleAdmin", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
  });

  test("mengirim pesan fungsi admin belum berfungsi", () => {
    pakrt.handleAdmin(1, "/admin", "X", 1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.text).toBe("Fungsi Admin Belum Berfungsi");
  });
});

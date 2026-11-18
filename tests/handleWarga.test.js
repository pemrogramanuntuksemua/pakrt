const pakrt = require("../main");
const { setSpreadsheet, createMockSheet } = require("./helpers/mockSheet");

function lastPayloadText() {
  const calls = global.UrlFetchApp.fetch.mock.calls;
  return JSON.parse(calls[calls.length - 1][1].payload).text;
}

describe("handleWarga", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
  });

  test("tab tidak ada -> 0 warga", () => {
    setSpreadsheet({});
    pakrt.handleWarga(1, "/warga", "X", 1);
    expect(lastPayloadText()).toContain("0 Kepala Keluarga");
  });

  test("menghitung jumlah baris data (minus header)", () => {
    const sheet = createMockSheet([["h"], ["a"], ["b"], ["c"]]);
    setSpreadsheet({ Warga: sheet });
    pakrt.handleWarga(1, "/warga", "X", 1);
    expect(lastPayloadText()).toContain("3 Kepala Keluarga");
  });
});

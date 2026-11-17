const pakrt = require("../kode");

function payload(call) {
  return JSON.parse(call[1].payload);
}

describe("sendTelegramMessage", () => {
  test("mengirim dengan parse_mode Markdown saat sukses", () => {
    const fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
    pakrt.sendTelegramMessage(42, "*halo*");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(payload(fetchMock.mock.calls[0])).toEqual({
      chat_id: 42,
      text: "*halo*",
      parse_mode: "Markdown",
    });
  });

  test("fallback ke teks biasa saat error parse entities", () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error(
          "Request failed for https://api.telegram.org returned code 400. " +
            "Truncated server response: {\"ok\":false,\"description\":\"Bad Request: can't parse entities\"}"
        );
      })
      .mockImplementationOnce(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
    pakrt.sendTelegramMessage(42, "contoh id_kk rusak");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(payload(fetchMock.mock.calls[0]).parse_mode).toBe("Markdown");
    const kedua = payload(fetchMock.mock.calls[1]);
    expect(kedua.parse_mode).toBeUndefined();
    expect(kedua.chat_id).toBe(42);
    expect(kedua.text).toBe("contoh id_kk rusak");
  });

  test("tidak retry untuk error non-format", () => {
    const fetchMock = jest.fn(() => {
      throw new Error("Request failed returned code 500");
    });
    global.UrlFetchApp = { fetch: fetchMock };
    pakrt.sendTelegramMessage(42, "halo");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

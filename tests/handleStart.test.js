const pakrt = require("../kode");

describe("handleStart", () => {
  let fetchMock;
  beforeEach(() => {
    fetchMock = jest.fn(() => ({ getContentText: () => "" }));
    global.UrlFetchApp = { fetch: fetchMock };
  });

  test("mengirim pesan sambutan dengan nama pengirim dan daftar perintah", () => {
    pakrt.handleStart(42, "/start", "Budi", 1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].payload);
    expect(payload.chat_id).toBe(42);
    expect(payload.text).toContain("Halo, *Budi*");
    expect(payload.text).toContain("/kas");
    expect(payload.text).toContain("/pengumuman");
    expect(payload.text).toContain("/tambahkas");
    expect(payload.text).toContain("/admin");
    expect(payload.text).toContain("`/gabung <id_kk>`");
    expect(payload.text).toContain(
      "`/tambahanggota id_kk#Nama#Hubungan#L/P#YYYY-MM-DD`"
    );
    expect(payload.text).not.toContain("**Pakrt**");
  });
});

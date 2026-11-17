const { pakrt, teksTerakhir } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

describe("handleTambahWarga (usang)", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    setSpreadsheet({});
  });

  test("mengarahkan ke /tambahkk dan /tambahanggota", () => {
    pakrt.handleTambahWarga(1, "/tambahwarga A#1#2#L#Jl#cat", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("sudah diganti");
    expect(text).toContain("/tambahkk");
    expect(text).toContain("/tambahanggota");
  });
});

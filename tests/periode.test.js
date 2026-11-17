const { pakrt } = require("./helpers/fixtures");

describe("helper periode", () => {
  test("parsePeriode bulanan & tahunan", () => {
    expect(pakrt.parsePeriode("2026-11")).toMatchObject({
      periode: "2026-11",
      tahun: 2026,
      bulan: 11,
      bulanan: true,
    });
    expect(pakrt.parsePeriode("2026")).toMatchObject({ periode: "2026", tahun: 2026, bulanan: false });
  });

  test("parsePeriode menolak format/bulan invalid", () => {
    expect(pakrt.parsePeriode("2026-13")).toBeNull();
    expect(pakrt.parsePeriode("11-2026")).toBeNull();
    expect(pakrt.parsePeriode("")).toBeNull();
  });

  test("tambahBulan melewati batas tahun", () => {
    expect(pakrt.tambahBulan("2026-12", 1)).toBe("2027-01");
    expect(pakrt.tambahBulan("2026-01", -1)).toBe("2025-12");
  });

  test("daftarPeriode inklusif", () => {
    expect(pakrt.daftarPeriode("2026-01", "2026-03")).toEqual(["2026-01", "2026-02", "2026-03"]);
  });

  test("bandingPeriode", () => {
    expect(pakrt.bandingPeriode("2026-01", "2026-02")).toBe(-1);
    expect(pakrt.bandingPeriode("2026-02", "2026-02")).toBe(0);
    expect(pakrt.bandingPeriode("2026-03", "2026-02")).toBe(1);
  });

  test("periodeDariTanggal & labelPeriode", () => {
    expect(pakrt.periodeDariTanggal(new Date(2026, 10, 17))).toBe("2026-11");
    expect(pakrt.labelPeriode("2026-11")).toBe("November 2026");
    expect(pakrt.labelPeriode("2026")).toBe("2026");
  });

  test("awal & akhir periode", () => {
    expect(pakrt.awalPeriode("2026-02").getDate()).toBe(1);
    expect(pakrt.akhirPeriode("2026-02").getDate()).toBe(28);
    expect(pakrt.akhirPeriode("2024-02").getDate()).toBe(29);
  });
});

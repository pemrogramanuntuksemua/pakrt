const { pakrt, buatSheet, dasar } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

describe("setting", () => {
  beforeEach(() => {
    pakrt.setAdminIds([]);
  });

  test("tanpa sheet Setting -> nilai default", () => {
    setSpreadsheet({});
    const nilai = pakrt.getSettings();
    expect(nilai.iuran_bulanan).toBe(50000);
    expect(nilai.nama_rt).toBe("RT 001");
    expect(pakrt.getSetting("iuran_bulanan")).toBe(50000);
  });

  test("setSetting menambah baris baru & konversi tipe", () => {
    setSpreadsheet(dasar({ Setting: buatSheet("Setting", []) }));
    pakrt.setSetting("nama_rt", "RT 009");
    expect(pakrt.getSetting("nama_rt")).toBe("RT 009");

    pakrt.setSetting("iuran_bulanan", "65000");
    expect(pakrt.getSetting("iuran_bulanan")).toBe(65000);
  });

  test("setSetting memperbarui baris yang sudah ada", () => {
    setSpreadsheet(
      dasar({
        Setting: buatSheet("Setting", [
          { kunci: "nama_rt", nilai: "RT 001", tipe: "teks", keterangan: "" },
        ]),
      })
    );
    pakrt.setSetting("nama_rt", "RT 002");
    const rows = pakrt.bacaTabel("Setting").rows;
    expect(rows.filter((r) => r.kunci === "nama_rt").length).toBe(1);
    expect(pakrt.getSetting("nama_rt")).toBe("RT 002");
  });

  test("kunci tidak dikenal tetap tersimpan sebagai teks", () => {
    setSpreadsheet(dasar({ Setting: buatSheet("Setting", []) }));
    pakrt.setSetting("custom_kunci", "halo");
    expect(pakrt.getSetting("custom_kunci")).toBe("halo");
  });

  test("boolean dikonversi", () => {
    setSpreadsheet(dasar({ Setting: buatSheet("Setting", []) }));
    pakrt.setSetting("reminder_aktif", "true");
    expect(pakrt.getSetting("reminder_aktif")).toBe(true);
  });
});

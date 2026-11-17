const { pakrt, buatSheet, dasar } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function settingAdmin(nilai) {
  setSpreadsheet(
    dasar({
      Setting: buatSheet("Setting", [
        { kunci: "admin_tambahan", nilai: nilai, tipe: "teks", keterangan: "" },
      ]),
    })
  );
}

describe("isAdmin", () => {
  beforeEach(() => {
    pakrt.setAdminIds([]);
    setSpreadsheet({});
  });

  test("mengembalikan false untuk user yang tidak terdaftar", () => {
    expect(pakrt.isAdmin(123)).toBe(false);
    expect(pakrt.isAdmin("999")).toBe(false);
  });

  test("mengembalikan true untuk admin yang terdaftar", () => {
    pakrt.setAdminIds([123, "456"]);
    expect(pakrt.isAdmin(123)).toBe(true);
    expect(pakrt.isAdmin("456")).toBe(true);
    expect(pakrt.isAdmin("123")).toBe(true);
  });

  test("admin tambahan dari Setting juga dianggap admin", () => {
    pakrt.setAdminIds([123]);
    settingAdmin("777, 888");
    expect(pakrt.isAdmin(777)).toBe(true);
    expect(pakrt.isAdmin("888")).toBe(true);
    expect(pakrt.isAdmin(999)).toBe(false);
  });

  test("pemisah spasi/titik koma, duplikat, dan kosong diabaikan", () => {
    pakrt.setAdminIds([456]);
    settingAdmin(" 123, 456 456;789 , ");
    expect(pakrt.getAdminIds()).toEqual(["456", "123", "789"]);
    expect(pakrt.getAdminTambahan()).toEqual(["123", "456", "789"]);
  });

  test("isAdminInti hanya mengenali ADMIN_IDS", () => {
    pakrt.setAdminIds([123]);
    settingAdmin("777");
    expect(pakrt.isAdminInti(123)).toBe(true);
    expect(pakrt.isAdminInti(777)).toBe(false);
  });

  test("menghapus dari Setting mencabut akses admin", () => {
    settingAdmin("777");
    expect(pakrt.isAdmin(777)).toBe(true);
    pakrt.simpanAdminTambahan([]);
    expect(pakrt.isAdmin(777)).toBe(false);
    expect(pakrt.getAdminTambahan()).toEqual([]);
  });
});

const { pakrt, buatSheet, dasar, admin, teksTerakhir, semuaTeks } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Setting: buatSheet("Setting", []),
        },
        extra || {}
      )
    )
  );
}

function settingAdmin(nilai) {
  setup({
    Setting: buatSheet("Setting", [
      { kunci: "admin_tambahan", nilai: nilai, tipe: "teks", keterangan: "" },
    ]),
  });
}

describe("handleAdmin", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
    pakrt.setGroupChatId("");
    setSpreadsheet({});
  });

  test("non-admin ditolak", () => {
    setup();
    pakrt.handleAdmin(1, "/admin", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("/admin menampilkan admin inti dan tambahan", () => {
    admin();
    settingAdmin("77, 88");
    pakrt.handleAdmin(1, "/admin", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("ADMIN PAKRT");
    expect(text).toContain("Inti (kode)");
    expect(text).toContain("`1`");
    expect(text).toContain("Tambahan (Setting)");
    expect(text).toContain("`77`");
    expect(text).toContain("`88`");
  });

  test("admin inti menambah satu & beberapa ID sekaligus", () => {
    admin();
    setup();
    pakrt.handleAdmin(1, "/admin tambah#64, 65", "Pengurus", 1);
    const teks = semuaTeks();
    expect(teks.join("\n")).toContain("Admin ditambahkan");
    expect(teks.join("\n")).toContain("`64`");
    expect(teks.join("\n")).toContain("`65`");
    expect(pakrt.getAdminTambahan()).toEqual(["64", "65"]);
    expect(pakrt.isAdmin(64)).toBe(true);
    expect(teks.filter((t) => t.indexOf("ditambahkan sebagai admin") >= 0).length).toBe(2);
  });

  test("ID non-angka ditolak dan tidak menyimpan apa pun", () => {
    admin();
    setup();
    pakrt.handleAdmin(1, "/admin tambah#abc", "X", 1);
    expect(teksTerakhir()).toContain("harus berupa angka");
    expect(pakrt.getAdminTambahan()).toEqual([]);
  });

  test("penambahan duplikat & admin inti tidak menggandakan data", () => {
    admin();
    settingAdmin("77");
    pakrt.handleAdmin(1, "/admin tambah#77", "X", 1);
    expect(teksTerakhir()).toContain("Tidak ada admin baru");
    expect(teksTerakhir()).toContain("Sudah terdaftar");
    expect(pakrt.getAdminTambahan()).toEqual(["77"]);

    pakrt.handleAdmin(1, "/admin tambah#1", "X", 1);
    expect(teksTerakhir()).toContain("Sudah admin inti");
    expect(pakrt.getAdminTambahan()).toEqual(["77"]);
  });

  test("tanpa ID -> petunjuk format", () => {
    admin();
    setup();
    pakrt.handleAdmin(1, "/admin tambah", "X", 1);
    expect(teksTerakhir()).toContain("Sebutkan id_telegram");
  });

  test("aksi tidak dikenal -> petunjuk format", () => {
    admin();
    setup();
    pakrt.handleAdmin(1, "/admin ngawur", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan");
  });

  test("admin inti menghapus admin tambahan", () => {
    admin();
    settingAdmin("77,88");
    pakrt.handleAdmin(1, "/admin hapus#77", "X", 1);
    expect(teksTerakhir()).toContain("Admin dihapus");
    expect(pakrt.getAdminTambahan()).toEqual(["88"]);
    expect(pakrt.isAdmin(77)).toBe(false);
    expect(pakrt.isAdmin(88)).toBe(true);
  });

  test("admin inti tidak bisa dihapus lewat /admin", () => {
    admin();
    settingAdmin("77");
    pakrt.handleAdmin(1, "/admin hapus#1", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Tidak ada admin tambahan yang dihapus");
    expect(text).toContain("Admin inti tidak bisa dihapus");
    expect(pakrt.getAdminTambahan()).toEqual(["77"]);
  });

  test("admin tambahan bisa memakai perintah lain tapi tidak mengelola daftar admin", () => {
    admin();
    settingAdmin("77");
    pakrt.handleAdmin(1, "/admin", "X", 77);
    expect(teksTerakhir()).toContain("ADMIN PAKRT");

    pakrt.handleAdmin(1, "/admin tambah#99", "X", 77);
    expect(teksTerakhir()).toContain("Hanya admin inti");
    expect(pakrt.getAdminTambahan()).toEqual(["77"]);
  });
});

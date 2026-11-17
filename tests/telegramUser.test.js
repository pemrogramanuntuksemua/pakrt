const { pakrt, buatSheet, dasar, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif" },
            { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Aktif" },
            { id_kk: "KK-003", no_rumah: "A3", nama_kk: "Pindah", status: "Pindah" },
          ]),
          TelegramUser: buatSheet("TelegramUser", []),
        },
        extra || {}
      )
    )
  );
}

function telegram(rows) {
  return buatSheet("TelegramUser", rows);
}

describe("keterkaitan Telegram - data", () => {
  beforeEach(() => {
    pakrt.setAdminIds([]);
  });

  test("identitas default: maks 2 akun/KK dan 5 KK/akun", () => {
    setSpreadsheet({});
    expect(pakrt.batasTelegramPerKk()).toBe(2);
    expect(pakrt.batasKkPerTelegram()).toBe(5);
  });

  test("pengajuan baru menyimpan baris menunggu", () => {
    setup();
    const hasil = pakrt.ajukanKeterkaitan("77", "budi", "Budi", "KK-001");
    expect(hasil.status).toBe("menunggu");
    expect(hasil.sudah).toBe(false);
    const rows = baca("TelegramUser");
    expect(rows.length).toBe(1);
    expect(rows[0].id_telegram).toBe("77");
    expect(rows[0].username).toBe("budi");
    expect(rows[0].nama).toBe("Budi");
    expect(rows[0].id_kk).toBe("KK-001");
    expect(rows[0].status).toBe("menunggu");
    expect(rows[0].peran).toBe("warga");
    expect(pakrt.getKkTerhubung("77")).toEqual([]);
  });

  test("pengajuan idempoten untuk pasangan akun + KK yang sama", () => {
    setup();
    pakrt.ajukanKeterkaitan("77", "budi", "Budi", "KK-001");
    const ulang = pakrt.ajukanKeterkaitan("77", "budi2", "Budi", "KK-001");
    expect(ulang.sudah).toBe(true);
    expect(ulang.status).toBe("menunggu");
    expect(baca("TelegramUser").length).toBe(1);
  });

  test("KK nonaktif atau tidak ada ditolak", () => {
    setup();
    expect(() => pakrt.ajukanKeterkaitan("77", "", "X", "KK-003")).toThrow(/tidak bisa dihubungkan/);
    expect(() => pakrt.ajukanKeterkaitan("77", "", "X", "KK-999")).toThrow(/tidak ditemukan/);
  });

  test("maksimal 2 akun (menunggu + aktif) per KK", () => {
    setup({
      TelegramUser: telegram([
        { id_telegram: "10", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "11", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    expect(() => pakrt.ajukanKeterkaitan("12", "", "X", "KK-001")).toThrow(/Maksimal 2 akun per KK/);
    expect(pakrt.ajukanKeterkaitan("12", "", "X", "KK-002").status).toBe("menunggu");
  });

  test("akun yang ditolak/dicabut tidak dihitung kuota", () => {
    setup({
      TelegramUser: telegram([
        { id_telegram: "10", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "11", id_kk: "KK-001", status: "ditolak" },
        { id_telegram: "12", id_kk: "KK-001", status: "dicabut" },
      ]),
    });
    expect(pakrt.ajukanKeterkaitan("13", "", "X", "KK-001").status).toBe("menunggu");
  });

  test("batas KK per akun dihormati", () => {
    setup({
      Setting: buatSheet("Setting", [
        { kunci: "maks_kk_per_telegram", nilai: 1, tipe: "angka", keterangan: "" },
      ]),
      TelegramUser: telegram([{ id_telegram: "77", id_kk: "KK-001", status: "aktif" }]),
    });
    expect(() => pakrt.ajukanKeterkaitan("77", "", "X", "KK-002")).toThrow(/Maksimal 1 KK per akun/);
  });

  test("batas 0 berarti tanpa batas", () => {
    setup({
      Setting: buatSheet("Setting", [
        { kunci: "maks_telegram_per_kk", nilai: 0, tipe: "angka", keterangan: "" },
        { kunci: "maks_kk_per_telegram", nilai: 0, tipe: "angka", keterangan: "" },
      ]),
      TelegramUser: telegram([
        { id_telegram: "10", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "11", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "77", id_kk: "KK-002", status: "aktif" },
      ]),
    });
    expect(pakrt.ajukanKeterkaitan("12", "", "X", "KK-001").status).toBe("menunggu");
    expect(pakrt.ajukanKeterkaitan("77", "", "X", "KK-001").status).toBe("menunggu");
  });

  test("verifikasi mengaktifkan & getKkTerhubung mengembalikan KK", () => {
    setup();
    pakrt.ajukanKeterkaitan("77", "budi", "Budi", "KK-001");
    const t = pakrt.verifikasiKeterkaitan("KK-001", "Pengurus");
    expect(t.status).toBe("aktif");
    expect(t.diverifikasi_oleh).toBe("Pengurus");
    const row = baca("TelegramUser")[0];
    expect(row.status).toBe("aktif");
    expect(row.diverifikasi_oleh).toBe("Pengurus");
    expect(pakrt.getKkTerhubung("77")).toEqual([
      { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status_kk: "Aktif" },
    ]);
    expect(pakrt.isKkTerhubung("77", "KK-001")).toBe(true);
    expect(pakrt.isKkTerhubung("77", "KK-002")).toBe(false);
  });

  test("verifikasi ambigu jika satu KK punya >1 pengajuan", () => {
    setup({
      TelegramUser: telegram([
        { id_telegram: "10", id_kk: "KK-001", status: "menunggu" },
        { id_telegram: "11", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    expect(() => pakrt.verifikasiKeterkaitan("KK-001", "X")).toThrow(/lebih dari satu/);
    const t = pakrt.verifikasiKeterkaitan("11", "X");
    expect(t.id_telegram).toBe("11");
    expect(baca("TelegramUser").filter((r) => r.status === "aktif").length).toBe(1);
  });

  test("verifikasi menolak jika kuota 2 akun sudah penuh", () => {
    setup({
      TelegramUser: telegram([
        { id_telegram: "10", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "11", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "12", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    expect(() => pakrt.verifikasiKeterkaitan("KK-001", "X")).toThrow(/sudah punya 2 akun aktif/);
  });

  test("verifikasi tanpa pengajuan / sudah aktif ditolak", () => {
    setup({
      TelegramUser: telegram([{ id_telegram: "10", id_kk: "KK-001", status: "aktif" }]),
    });
    expect(() => pakrt.verifikasiKeterkaitan("KK-001", "X")).toThrow(/sudah aktif/);
    expect(() => pakrt.verifikasiKeterkaitan("KK-002", "X")).toThrow(/Tidak ada pengajuan/);
  });

  test("tolak mengubah status & bisa mengajukan ulang", () => {
    setup();
    pakrt.ajukanKeterkaitan("77", "", "Budi", "KK-001");
    const t = pakrt.tolakKeterkaitan("KK-001", "Pengurus");
    expect(t.status).toBe("ditolak");
    expect(baca("TelegramUser")[0].status).toBe("ditolak");
    const ulang = pakrt.ajukanKeterkaitan("77", "", "Budi", "KK-001");
    expect(ulang.sudah).toBe(false);
    expect(ulang.status).toBe("menunggu");
    expect(baca("TelegramUser").length).toBe(1);
    expect(baca("TelegramUser")[0].status).toBe("menunggu");
  });

  test("tolak akun aktif -> arahkan /cabut", () => {
    setup({
      TelegramUser: telegram([{ id_telegram: "10", id_kk: "KK-001", status: "aktif" }]),
    });
    expect(() => pakrt.tolakKeterkaitan("KK-001", "X")).toThrow(/Gunakan \/cabut/);
  });

  test("cabut memutus keterkaitan aktif", () => {
    setup({
      TelegramUser: telegram([
        { id_telegram: "10", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "11", id_kk: "KK-001", status: "aktif" },
        { id_telegram: "12", id_kk: "KK-001", status: "menunggu" },
      ]),
    });
    const rows = pakrt.cabutKeterkaitan("KK-001", "Pengurus");
    expect(rows.length).toBe(2);
    expect(baca("TelegramUser").filter((r) => r.status === "dicabut").length).toBe(2);
    expect(baca("TelegramUser").filter((r) => r.status === "menunggu").length).toBe(1);
    expect(pakrt.getKkTerhubung("10")).toEqual([]);
    expect(() => pakrt.cabutKeterkaitan("KK-001", "X")).toThrow(/Tidak ada keterkaitan aktif/);
  });
});

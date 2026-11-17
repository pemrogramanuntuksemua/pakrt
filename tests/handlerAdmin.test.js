const { pakrt, buatSheet, dasar, admin, teksTerakhir, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Setting: buatSheet("Setting", []),
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2024-01" },
            { id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", status: "Aktif", mulai_iuran: "2024-01" },
          ]),
          Anggota: buatSheet("Anggota", [
            { id_kk: "KK-001", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
            { id_kk: "KK-002", nama: "Siti", hubungan: "Kepala Keluarga", jenis_kelamin: "P", status: "Aktif" },
          ]),
          TarifIuran: buatSheet("TarifIuran", [{ berlaku_mulai: "2024-01", nominal: 50000, keterangan: "awal" }]),
          Tagihan: buatSheet("Tagihan", [
            { periode: "2024-01", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "belum" },
            { periode: "2024-01", id_kk: "KK-002", no_rumah: "A2", nama_kk: "Siti", nominal: 50000, status: "lunas", tanggal_bayar: new Date(2024, 0, 9) },
          ]),
          Kas: buatSheet("Kas", [
            { tanggal: new Date(2024, 0, 9), keterangan: "Iuran Siti", jenis: "masuk", nominal: 5000, alokasi: "kasrt" },
            { tanggal: new Date(2024, 0, 9), keterangan: "Iuran Siti", jenis: "masuk", nominal: 5000, alokasi: "dkmt" },
            { tanggal: new Date(2024, 0, 9), keterangan: "Iuran Siti", jenis: "masuk", nominal: 40000, alokasi: "kamsih" },
          ]),
        },
        extra || {}
      )
    )
  );
}

describe("handler pengaturan", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("/setting non-admin ditolak", () => {
    setup();
    pakrt.handleSetting(1, "/setting", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("/setting menampilkan daftar kunci", () => {
    admin();
    setup();
    pakrt.handleSetting(1, "/setting", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("PENGATURAN PAKRT");
    expect(text).toContain("iuran_bulanan");
    expect(text).toContain("jatuh_tempo_hari");
    expect(text).toContain("admin_tambahan");
  });

  test("/set admin_tambahan ditolak dan diarahkan ke /admin", () => {
    admin();
    setup();
    pakrt.handleSet(1, "/set admin_tambahan 99", "X", 1);
    expect(teksTerakhir()).toContain("/admin tambah");
    expect(pakrt.getAdminTambahan()).toEqual([]);
  });

  test("/set non-admin ditolak", () => {
    setup();
    pakrt.handleSet(1, "/set nama_rt RT 009", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("/set menyimpan nilai teks", () => {
    admin();
    setup();
    pakrt.handleSet(1, "/set nama_rt RT 009", "X", 1);
    expect(teksTerakhir()).toContain("Pengaturan disimpan");
    expect(pakrt.getSetting("nama_rt")).toBe("RT 009");
  });

  test("/set iuran_bulanan memperbarui tarif & tagihan belum", () => {
    admin();
    setup();
    pakrt.handleSet(1, "/set iuran_bulanan 65000 2024-05", "Bendahara", 1);
    const text = teksTerakhir();
    expect(text).toContain("Tarif diperbarui");
    expect(text).toContain("Rp 65.000");
    expect(pakrt.getTarifUntukPeriode("2024-05")).toBe(65000);
    expect(text).toContain("kasrt");
  });

  test("/set kunci tidak dikenal -> error", () => {
    admin();
    setup();
    pakrt.handleSet(1, "/set ngawur 1", "X", 1);
    expect(teksTerakhir()).toContain("tidak dikenal");
  });

  test("/set tanpa nilai -> petunjuk format", () => {
    admin();
    setup();
    pakrt.handleSet(1, "/set nama_rt", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan");
  });

  test("/tarif menampilkan riwayat & tarif aktif", () => {
    admin();
    setup();
    pakrt.handleTarif(1, "/tarif", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("TARIF IURAN");
    expect(text).toContain("2024-01");
    expect(text).toContain("Berlaku sekarang");
    expect(text).toContain("Rp 50.000");
  });

  test("/tarif non-admin ditolak", () => {
    setup();
    pakrt.handleTarif(1, "/tarif", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("/alokasi menampilkan pembagian kantong", () => {
    setup();
    pakrt.handleAlokasi(1, "/alokasi", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("ALOKASI IURAN");
    expect(text).toContain("kasrt");
    expect(text).toContain("dkmt");
    expect(text).toContain("kamsih");
    expect(text).toContain("TOTAL");
    expect(text).toContain("Rp 50.000");
  });
});

describe("handler KK & anggota", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("/tambahkk non-admin ditolak", () => {
    setup();
    pakrt.handleTambahKK(1, "/tambahkk Andi#0812#B5#Jl. Baru#", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("/tambahkk membuat KK baru + baris anggota kepala keluarga", () => {
    admin();
    setup();
    pakrt.handleTambahKK(1, "/tambahkk Andi#0812#B5#Jl. Baru#Catatan", "Bendahara", 1);
    const text = teksTerakhir();
    expect(text).toContain("KK Berhasil Ditambahkan");
    const keluarga = pakrt.getKeluarga();
    const baru = keluarga.filter((k) => k.nama_kk === "Andi")[0];
    expect(baru).toBeDefined();
    expect(baru.no_rumah).toBe("B5");
    expect(baru.no_hp).toBe("0812");
    const anggota = pakrt.getAnggota(baru.id_kk);
    expect(anggota.length).toBe(1);
    expect(anggota[0].hubungan).toBe("Kepala Keluarga");
    expect(text).toContain(baru.id_kk);
  });

  test("/tambahkk tanpa nama/rumah -> format salah", () => {
    admin();
    setup();
    pakrt.handleTambahKK(1, "/tambahkk Andi", "X", 1);
    expect(teksTerakhir()).toContain("Format Salah");
  });

  test("/tambahanggota menambah anggota", () => {
    admin();
    setup();
    pakrt.handleTambahAnggota(1, "/tambahanggota KK-001#Rina#Istri#P#2010-05-01", "X", 1);
    expect(teksTerakhir()).toContain("Anggota Berhasil Ditambahkan");
    const anggota = pakrt.getAnggota("KK-001");
    expect(anggota.length).toBe(2);
    expect(anggota[1].nama).toBe("Rina");
    expect(anggota[1].jenis_kelamin).toBe("P");
  });

  test("/tambahanggota format salah -> petunjuk", () => {
    admin();
    setup();
    pakrt.handleTambahAnggota(1, "/tambahanggota KK-001", "X", 1);
    expect(teksTerakhir()).toContain("Format Salah");
  });

  test("/tambahanggota non-admin ditolak", () => {
    setup();
    pakrt.handleTambahAnggota(1, "/tambahanggota KK-001#Rina", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });
});

describe("handler tagihan & tunggakan", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("/tagihan tanpa argumen -> petunjuk", () => {
    admin();
    setup();
    pakrt.handleTagihan(1, "/tagihan", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan");
  });

  test("/tagihan menampilkan rincian & tunggakan", () => {
    admin();
    setup();
    pakrt.handleTagihan(1, "/tagihan KK-001", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("TAGIHAN KK-001 — Budi");
    expect(text).toContain("2024-01");
    expect(text).toContain("Total tunggakan");
    expect(text).toContain("Rp 50.000");
  });

  test("/tagihan semua lunas -> tanpa ajakan bayar", () => {
    admin();
    setup({
      Tagihan: buatSheet("Tagihan", [
        { periode: "2024-01", id_kk: "KK-001", no_rumah: "A1", nama_kk: "Budi", nominal: 50000, status: "lunas", tanggal_bayar: new Date(2024, 0, 9) },
      ]),
    });
    pakrt.handleTagihan(1, "/tagihan KK-001", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("Semua tagihan sudah lunas");
    expect(text).not.toContain("/bayar KK-001");
  });

  test("/tagihan non-admin tanpa keterkaitan -> arahan /gabung", () => {
    setup();
    pakrt.handleTagihan(1, "/tagihan KK-001", "X", 999);
    expect(teksTerakhir()).toContain("hanya bisa melihat tagihan KK yang terhubung");
  });

  test("/tunggakan global merangkum penunggak", () => {
    admin();
    setup();
    pakrt.handleTunggakan(1, "/tunggakan", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("TUNGGAKAN IURAN");
    expect(text).toContain("KK menunggak: *1*");
    expect(text).toContain("KK-001");
    expect(text).toContain("Rp 50.000");
  });

  test("/tunggakan per KK", () => {
    admin();
    setup();
    pakrt.handleTunggakan(1, "/tunggakan KK-001", "X", 1);
    const text = teksTerakhir();
    expect(text).toContain("TUNGGAKAN KK-001");
    expect(text).toContain("2024-01");
    expect(text).toContain("Total: *Rp 50.000*");
  });

  test("/tunggakan non-admin tanpa keterkaitan -> arahan /gabung", () => {
    setup();
    pakrt.handleTunggakan(1, "/tunggakan", "X", 999);
    expect(teksTerakhir()).toContain("belum terhubung");
  });
});

describe("handler pindah kas & tutup buku", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("/pindahkas memindahkan saldo antar kantong", () => {
    admin();
    setup({
      Kas: buatSheet("Kas", [
        { tanggal: new Date(2024, 0, 9), keterangan: "Iuran", jenis: "masuk", nominal: 50000, alokasi: "kasrt" },
      ]),
    });
    pakrt.handlePindahKas(1, "/pindahkas kasrt#dkmt#10000#Surplus", "Bendahara", 1);
    const text = teksTerakhir();
    expect(text).toContain("Dana berhasil dipindahkan");
    expect(text).toContain("Sisa kasrt: *Rp 40.000*");
    expect(pakrt.getSaldoKantong("dkmt")).toBe(10000);
  });

  test("/pindahkas format salah -> error", () => {
    admin();
    setup();
    pakrt.handlePindahKas(1, "/pindahkas kasrt#dkmt", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan");
  });

  test("/pindahkas saldo kurang -> error", () => {
    admin();
    setup();
    pakrt.handlePindahKas(1, "/pindahkas kasrt#dkmt#10000#x", "X", 1);
    expect(teksTerakhir()).toContain("tidak cukup");
  });

  test("/pindahkas non-admin ditolak", () => {
    setup();
    pakrt.handlePindahKas(1, "/pindahkas kasrt#dkmt#1000#x", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("/tutupbuku non-admin ditolak", () => {
    setup();
    pakrt.handleTutupBuku(1, "/tutupbuku 2024-01", "X", 999);
    expect(teksTerakhir()).toContain("Akses Ditolak");
  });

  test("/tutupbuku tanpa argumen -> petunjuk", () => {
    admin();
    setup();
    pakrt.handleTutupBuku(1, "/tutupbuku", "X", 1);
    expect(teksTerakhir()).toContain("Gunakan");
  });

  test("/tutupbuku bulanan menulis snapshot", () => {
    admin();
    setup();
    pakrt.handleTutupBuku(1, "/tutupbuku 2024-01", "Bendahara", 1);
    const text = teksTerakhir();
    expect(text).toContain("TUTUP BUKU JANUARI 2024");
    expect(text).toContain("Saldo akhir");
    expect(baca("TutupBuku").length).toBe(1);
    expect(baca("TutupBukuAlokasi").length).toBe(3);
  });
});

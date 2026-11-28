const { pakrt, buatSheet, dasar, admin, teksTerakhir, baca } = require("./helpers/fixtures");
const { setSpreadsheet } = require("./helpers/mockSheet");

function setup(extra) {
  setSpreadsheet(
    dasar(
      Object.assign(
        {
          Keluarga: buatSheet("Keluarga", [
            { id_kk: "KK055", no_rumah: "55", nama_kk: "Budi", status: "Aktif", mulai_iuran: "2024-01" },
          ]),
          Anggota: buatSheet("Anggota", [
            { id_kk: "KK055", nama: "Budi", hubungan: "Kepala Keluarga", jenis_kelamin: "L", status: "Aktif" },
          ]),
          TarifIuran: buatSheet("TarifIuran", [
            { berlaku_mulai: "2024-01", nominal: 50000, keterangan: "awal" },
          ]),
        },
        extra || {}
      )
    )
  );
}

function tambahRumahTambahan(noRumah, induk) {
  pakrt.handleTambahKK(
    1,
    "/tambahkk Budi#0812#" + noRumah + "#Jl. Mawar##" + induk + "#rumah_tambahan",
    "Bendahara",
    1
  );
}

function netPerKantong() {
  const hasil = {};
  baca("Kas").forEach((j) => {
    hasil[j.alokasi] = (hasil[j.alokasi] || 0) + pakrt.efekKas(j);
  });
  return hasil;
}

function tagihanMap() {
  const hasil = {};
  baca("Tagihan").forEach((t) => {
    hasil[t.id_kk] = t;
  });
  return hasil;
}

describe("rumah tambahan", () => {
  beforeEach(() => {
    global.UrlFetchApp = { fetch: jest.fn(() => ({ getContentText: () => "" })) };
    pakrt.setAdminIds([]);
  });

  test("/tambahkk rumah tambahan menyimpan induk, flag, dan mulai iuran dari induk", () => {
    admin();
    setup();
    tambahRumahTambahan("57", "KK055");
    const kk = pakrt.cariKeluarga("57");
    expect(kk.id_kk).toBe("KK057");
    expect(kk.id_kk_induk).toBe("KK055");
    expect(kk.rumah_tambahan).toBe(true);
    expect(kk.mulai_iuran).toBe("2024-01");
    expect(baca("Keluarga").length).toBe(2);
    expect(pakrt.getAnggota("KK057").length).toBe(1);
    expect(teksTerakhir()).toContain("Rumah tambahan dari");
    expect(teksTerakhir()).toContain("tagihan 50%");
  });

  test("tiga rumah: tagihan 50.000 + 25.000 + 25.000, jiwa tetap 1", () => {
    admin();
    setup();
    tambahRumahTambahan("57", "KK055");
    tambahRumahTambahan("59", "KK055");
    expect(pakrt.pastikanTagihan("2024-01")).toBe(3);

    const t = tagihanMap();
    expect(Object.keys(t).sort()).toEqual(["KK055", "KK057", "KK059"]);
    expect(t.KK055.nominal).toBe(50000);
    expect(t.KK055.faktor).toBe(1);
    expect(t.KK055.kasrt_saja).toBe(false);
    expect(t.KK057.nominal).toBe(25000);
    expect(t.KK057.faktor).toBe(0.5);
    expect(t.KK057.kasrt_saja).toBe(true);
    expect(t.KK059.nominal).toBe(25000);
    expect(t.KK059.faktor).toBe(0.5);
    expect(t.KK059.kasrt_saja).toBe(true);

    const rekap = pakrt.hitungRekapPeriode("2024-01");
    expect(rekap.totalKK).toBe(3);
    expect(rekap.totalTagihan).toBe(100000);
    expect(rekap.totalJiwa).toBe(1);
    expect(pakrt.getJumlahJiwaKK("KK057")).toBe(0);
    expect(pakrt.getJumlahJiwa("2024-01")).toBe(1);
    expect(pakrt.formatRekapBulanan(rekap)).toContain("3 unit tagihan · tarif dasar");
  });

  test("cicilan rumah tambahan lunas di kasrt saja, tanpa transfer", () => {
    admin();
    setup();
    tambahRumahTambahan("57", "KK055");
    pakrt.pastikanTagihan("2024-01");

    pakrt.handleBayar(1, "/bayar 57#2024-01=10000", "Bendahara", 1);
    expect(pakrt.cariTagihan("KK057", "2024-01").status).toBe("sebagian");
    expect(pakrt.cariTagihan("KK057", "2024-01").sisa).toBe(15000);

    pakrt.handleBayar(1, "/bayar 57#2024-01=15000", "Bendahara", 1);
    expect(pakrt.cariTagihan("KK057", "2024-01").status).toBe("lunas");
    expect(baca("Pembayaran").map((b) => b.nominal)).toEqual([10000, 15000]);

    const kas = baca("Kas").filter((j) => j.ref.indexOf("BYR-202401-KK057") === 0);
    expect(kas.length).toBe(2);
    expect(kas.every((j) => j.jenis === "masuk" && j.alokasi === "kasrt")).toBe(true);
    expect(netPerKantong()).toEqual({ kasrt: 25000 });
    expect(teksTerakhir()).toContain("lunas ✅");
  });

  test("rumah utama tetap mentransfer alokasi tetap saat lunas", () => {
    admin();
    setup();
    pakrt.pastikanTagihan("2024-01");
    pakrt.handleBayar(1, "/bayar 55#2024-01", "Bendahara", 1);
    const kas = baca("Kas");
    expect(kas.filter((j) => j.jenis === "masuk").length).toBe(1);
    expect(kas.filter((j) => j.jenis === "pindah_keluar").length).toBe(1);
    expect(kas.filter((j) => j.jenis === "pindah_masuk").length).toBe(2);
    expect(netPerKantong()).toEqual({ kasrt: 5000, dkmt: 5000, kamsih: 40000 });
  });

  test("mengubah tarif tidak menimpa tagihan rumah tambahan", () => {
    admin();
    setup();
    tambahRumahTambahan("57", "KK055");
    pakrt.pastikanTagihan("2024-01");
    pakrt.setTarif("2024-01", 60000, "tarif baru");
    const t = tagihanMap();
    expect(t.KK055.nominal).toBe(60000);
    expect(t.KK057.nominal).toBe(30000);
    expect(t.KK057.faktor).toBe(0.5);
  });

  test("rumah tambahan wajib punya induk yang bukan rumah tambahan", () => {
    admin();
    setup();
    pakrt.handleTambahKK(1, "/tambahkk Budi#0812#57#Jl. Mawar##rumah_tambahan", "Bendahara", 1);
    expect(teksTerakhir()).toContain("butuh id_kk_induk");

    tambahRumahTambahan("57", "KK055");
    pakrt.handleTambahKK(1, "/tambahkk Budi#0812#59#Jl. Mawar##KK057#rumah_tambahan", "Bendahara", 1);
    expect(teksTerakhir()).toContain("Induk rumah tambahan harus berupa rumah utama");
    expect(baca("Keluarga").length).toBe(2);
  });

  test("cari berdasarkan nama jadi ambigu, disarankan pakai id_kk/no_rumah", () => {
    admin();
    setup();
    tambahRumahTambahan("57", "KK055");
    expect(() => pakrt.cariKeluarga("Budi")).toThrow(/lebih dari satu KK/);
    expect(() => pakrt.cariKeluarga("Budi")).toThrow(/id_kk atau no_rumah/);
    expect(pakrt.cariKeluarga("57").id_kk).toBe("KK057");
  });
});

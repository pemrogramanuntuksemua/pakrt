const pakrt = require("../../main");
const { createMockSheet } = require("./mockSheet");

function buatSheet(nama, objs) {
  const skema = pakrt.SHEET_SCHEMA[nama];
  if (!skema) throw new Error("Skema tidak dikenal: " + nama);
  const data = [skema.slice()];
  (objs || []).forEach((obj) => {
    data.push(skema.map((kolom) => (obj[kolom] === undefined || obj[kolom] === null ? "" : obj[kolom])));
  });
  return createMockSheet(data, { name: nama });
}

function baca(nama) {
  return pakrt.bacaTabel(nama).rows;
}

function dasar(extra) {
  return Object.assign(
    {
      Keluarga: buatSheet("Keluarga", []),
      Anggota: buatSheet("Anggota", []),
      TarifIuran: buatSheet("TarifIuran", [
        { berlaku_mulai: "2026-01", nominal: 50000, keterangan: "Tarif awal" },
      ]),
      AlokasiIuran: buatSheet("AlokasiIuran", pakrt.DEFAULT_ALOKASI),
      Tagihan: buatSheet("Tagihan", []),
      Kas: buatSheet("Kas", []),
      TutupBuku: buatSheet("TutupBuku", []),
      TutupBukuAlokasi: buatSheet("TutupBukuAlokasi", []),
    },
    extra || {}
  );
}

function admin() {
  pakrt.setAdminIds([1]);
}

function teksTerakhir() {
  const calls = global.UrlFetchApp.fetch.mock.calls;
  return JSON.parse(calls[calls.length - 1][1].payload).text;
}

function semuaTeks() {
  return global.UrlFetchApp.fetch.mock.calls.map((c) => {
    try {
      return JSON.parse(c[1].payload).text;
    } catch (e) {
      return "";
    }
  });
}

module.exports = { pakrt, buatSheet, baca, dasar, admin, teksTerakhir, semuaTeks };

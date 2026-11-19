const SPREADSHEET_ID = "";
const TELEGRAM_TOKEN = "";
const WEBHOOK_URL = ""; // Diisi setelah di-deploy

// Daftar ID Telegram pengurus inti (Admin) yang diizinkan input kas & pengumuman
// Cara cek ID Telegram bisa via bot @userinfobot
const ADMIN_IDS = [];

// ID Group Telegram warga RT untuk auto-broadcast pengumuman (opsional)
let GROUP_CHAT_ID = "";

const SHEET_SETTING = "Setting";
const SHEET_KELUARGA = "Keluarga";
const SHEET_ANGGOTA = "Anggota";
const SHEET_TARIF = "TarifIuran";
const SHEET_ALOKASI = "AlokasiIuran";
const SHEET_TAGIHAN = "Tagihan";
const SHEET_KAS = "Kas";
const SHEET_TUTUP_BUKU = "TutupBuku";
const SHEET_TUTUP_BUKU_ALOKASI = "TutupBukuAlokasi";
const SHEET_PENGUMUMAN = "Pengumuman";
const SHEET_TELEGRAM_USER = "TelegramUser";

const SHEET_SCHEMA = {
  Setting: ["kunci", "nilai", "tipe", "keterangan"],
  Keluarga: ["id_kk", "no_rumah", "nama_kk", "no_hp", "alamat", "status", "mulai_iuran", "catatan"],
  Anggota: ["id_kk", "nama", "hubungan", "jenis_kelamin", "tanggal_lahir", "status", "catatan"],
  TarifIuran: ["berlaku_mulai", "nominal", "keterangan"],
  AlokasiIuran: ["kode", "nama", "nominal", "sisa", "keterangan"],
  Tagihan: ["periode", "id_kk", "no_rumah", "nama_kk", "nominal", "status", "tanggal_bayar", "dicatat_oleh", "catatan"],
  Kas: ["tanggal", "keterangan", "jenis", "nominal", "alokasi", "ref", "dicatat_oleh"],
  TutupBuku: ["periode", "jenis", "tarif", "total_kk", "total_jiwa", "total_tagihan", "total_terbayar", "total_masuk", "total_keluar", "saldo_awal", "saldo_akhir", "ditutup_oleh", "ditutup_pada"],
  TutupBukuAlokasi: ["periode", "kode", "saldo_awal", "masuk", "keluar", "pindah_masuk", "pindah_keluar", "saldo_akhir"],
  TelegramUser: ["id_telegram", "username", "nama", "id_kk", "peran", "status", "diminta_pada", "diverifikasi_oleh", "diverifikasi_pada"],
  Pengumuman: ["timestamp", "kategori", "isi", "pengirim"],
};

// Sheet yang dihapus saat mode "reset"
const SHEET_SKEMA = [
  SHEET_SETTING, SHEET_KELUARGA, SHEET_ANGGOTA, SHEET_TARIF, SHEET_ALOKASI,
  SHEET_TAGIHAN, SHEET_TUTUP_BUKU, SHEET_TUTUP_BUKU_ALOKASI, SHEET_TELEGRAM_USER,
];

// Sheet data yang dipertahankan saat "reset", hanya dihapus pada "fresh"
const SHEET_DATA = [SHEET_KAS, SHEET_PENGUMUMAN];

const CMD_START = "/start";
const CMD_KAS = "/kas";
const CMD_TAMBAHKAS = "/tambahkas";
const CMD_PINDAHKAS = "/pindahkas";
const CMD_WARGA = "/warga";
const CMD_TAMBAHWARGA = "/tambahwarga";
const CMD_TAMBAHKK = "/tambahkk";
const CMD_TAMBAHANGGOTA = "/tambahanggota";
const CMD_EDITANGGOTA = "/editanggota";
const CMD_ADMIN = "/admin";
const CMD_PENGUMUMAN = "/pengumuman";
const CMD_BUATPENGUMUMAN = "/buatpengumuman";
const CMD_SETTING = "/setting";
const CMD_SET = "/set";
const CMD_TARIF = "/tarif";
const CMD_ALOKASI = "/alokasi";
const CMD_TAGIHAN = "/tagihan";
const CMD_BAYAR = "/bayar";
const CMD_TUNGGAKAN = "/tunggakan";
const CMD_REKAP = "/rekap";
const CMD_DAFTAR = "/daftar";
const CMD_TUTUPBUKU = "/tutupbuku";
const CMD_GABUNG = "/gabung";
const CMD_SAYA = "/saya";
const CMD_UNTUKWARGA = "/untukwarga";
const CMD_UNTUKADMIN = "/untukadmin";
const CMD_SYSTEM = "/system";
const CMD_VERIFIKASI = "/verifikasi";
const CMD_TOLAK = "/tolak";
const CMD_CABUT = "/cabut";
const CMD_CABUTKK = "/cabutkk";

const TAGIHAN_BELUM = "belum";
const TAGIHAN_LUNAS = "lunas";
const TAGIHAN_BEBAS = "bebas";
const TAGIHAN_BATAL = "batal";

const JENIS_MASUK = "masuk";
const JENIS_KELUAR = "keluar";
const JENIS_PINDAH_MASUK = "pindah_masuk";
const JENIS_PINDAH_KELUAR = "pindah_keluar";

const ALOKASI_DEFAULT_KODE = "kasrt";

const DEFAULT_SETTINGS = {
  iuran_bulanan: { nilai: 50000, tipe: "angka", keterangan: "Tarif iuran default per KK" },
  jatuh_tempo_hari: { nilai: 10, tipe: "angka", keterangan: "Tanggal jatuh tempo tiap bulan" },
  nama_rt: { nilai: "RT 001", tipe: "teks", keterangan: "Nama RT" },
  reminder_aktif: { nilai: false, tipe: "boolean", keterangan: "Pengingat otomatis (belum aktif)" },
  iuran_mulai_default: { nilai: "2026-01", tipe: "teks", keterangan: "Periode mulai iuran KK baru" },
  backfill_mulai: { nilai: "2026-01", tipe: "teks", keterangan: "Periode awal backfill tagihan" },
  maks_telegram_per_kk: { nilai: 2, tipe: "angka", keterangan: "Maks akun Telegram per KK (0 = tanpa batas)" },
  maks_kk_per_telegram: { nilai: 5, tipe: "angka", keterangan: "Maks KK aktif per akun Telegram (0 = tanpa batas)" },
  admin_tambahan: { nilai: "", tipe: "teks", keterangan: "ID Telegram admin tambahan, pisahkan dengan koma" },
};

const DEFAULT_ALOKASI = [
  { kode: "kasrt", nama: "Kas RT", nominal: 0, sisa: true, keterangan: "Penampung selisih tarif, operasional" },
  { kode: "dkmt", nama: "Dana Kematian", nominal: 5000, sisa: false, keterangan: "Santunan warga" },
  { kode: "kamsih", nama: "Keamanan & Kebersihan", nominal: 40000, sisa: false, keterangan: "Honor petugas" },
];

const TELEGRAM_MENUNGGU = "menunggu";
const TELEGRAM_AKTIF = "aktif";
const TELEGRAM_DITOLAK = "ditolak";
const TELEGRAM_DICABUT = "dicabut";

// Lazy PREFIX_HANDLERS (kompatibel GAS & Node)
const _G = (typeof global !== "undefined") ? global : (typeof globalThis !== "undefined" ? globalThis : this);
let PREFIX_HANDLERS = null;
function getPrefixHandlers() {
    if (!PREFIX_HANDLERS) {
        PREFIX_HANDLERS = {
            [CMD_START]: _G.handleStart,
            [CMD_ADMIN]: _G.handleAdmin,
            [CMD_KAS]: _G.handleKas,
            [CMD_TAMBAHKAS]: _G.handleTambahKas,
            [CMD_PINDAHKAS]: _G.handlePindahKas,
            [CMD_WARGA]: _G.handleWarga,
            [CMD_TAMBAHWARGA]: _G.handleTambahWarga,
            [CMD_TAMBAHKK]: _G.handleTambahKK,
            [CMD_TAMBAHANGGOTA]: _G.handleTambahAnggota,
            [CMD_EDITANGGOTA]: _G.handleEditAnggota,
            [CMD_PENGUMUMAN]: _G.handlePengumuman,
            [CMD_BUATPENGUMUMAN]: _G.handleBuatPengumuman,
            [CMD_SETTING]: _G.handleSetting,
            [CMD_SET]: _G.handleSet,
            [CMD_TARIF]: _G.handleTarif,
            [CMD_ALOKASI]: _G.handleAlokasi,
            [CMD_TAGIHAN]: _G.handleTagihan,
            [CMD_BAYAR]: _G.handleBayar,
            [CMD_TUNGGAKAN]: _G.handleTunggakan,
            [CMD_REKAP]: _G.handleRekap,
            [CMD_DAFTAR]: _G.handleDaftar,
            [CMD_TUTUPBUKU]: _G.handleTutupBuku,
            [CMD_GABUNG]: _G.handleGabung,
            [CMD_SAYA]: _G.handleSaya,
            [CMD_UNTUKWARGA]: _G.handleUntukWarga,
            [CMD_UNTUKADMIN]: _G.handleUntukAdmin,
            [CMD_SYSTEM]: _G.handleSystem,
            [CMD_VERIFIKASI]: _G.handleVerifikasi,
            [CMD_TOLAK]: _G.handleTolak,
            [CMD_CABUT]: _G.handleCabut,
            [CMD_CABUTKK]: _G.handleCabutKK,
        };
    }
    return PREFIX_HANDLERS;
}

function doGet(e) {
  return HtmlService.createHtmlOutput("OK");
}

function doPost(e) {
  Logger.log("doPost invoked");
  const startTime = new Date().getTime();
  try {
    if (isAckOnly()) {
      Logger.log("ACK_ONLY mode: returning 200 ms=" + (new Date().getTime() - startTime));
      return HtmlService.createHtmlOutput("OK");
    }
    const data = JSON.parse(e.postData.contents);
    const updateId = data && data.update_id;
    Logger.log("doPost start update_id=" + updateId);
    if (isProcessed(updateId)) {
      Logger.log("Duplicate update ignored: " + updateId);
      return HtmlService.createHtmlOutput("OK");
    }
    markProcessed(updateId);
    if (data.message && data.message.text) {
      const chatId = data.message.chat.id;
      const userId = data.message.from.id;
      const text = str(data.message.text);
      const senderName = data.message.from.first_name || "Warga";
      const username = data.message.from.username || "";
      handleCommand(chatId, text, senderName, userId, username);
    }
    Logger.log("doPost end update_id=" + updateId + " ms=" + (new Date().getTime() - startTime));
    return HtmlService.createHtmlOutput("OK");
  } catch (error) {
    Logger.log("doPost error: " + error.toString());
    return HtmlService.createHtmlOutput("Error: " + error.toString());
  }
}

function handleCommand(chatId, text, senderName, userId, username) {
  if (!chatId) {
    Logger.log("Error: chatId is empty");
    return HtmlService.createHtmlOutput("Failed");
  }
  processItem(chatId, text, senderName, userId, username);
}

function processItem(chatId, text, senderName, userId, username) {
  _G.CURRENT_USER_ID = userId;
  const cleanText = str(text);
  const token = cleanText.split(/\s+/)[0].toLowerCase();
  const handler = getPrefixHandlers()[token];
  if (handler) {
    handler(chatId, cleanText, senderName, userId, username);
  } else {
    Logger.log("No matching action for: " + cleanText);
  }
}

// Node/Jest compatibility
if (typeof module !== "undefined" && module.exports) {
    const core = (typeof require !== "undefined") ? require("./core.gs") : null;
    const user = (typeof require !== "undefined") ? require("./userHandlers.gs") : null;
    const admin = (typeof require !== "undefined") ? require("./adminHandlers.gs") : null;
    if (core) Object.keys(core).forEach((k) => { if (typeof global !== "undefined") global[k] = core[k]; });
    if (user) Object.keys(user).forEach((k) => { if (typeof global !== "undefined") global[k] = user[k]; });
    if (admin) Object.keys(admin).forEach((k) => { if (typeof global !== "undefined") global[k] = admin[k]; });
    if (typeof global !== "undefined") {
        global.SPREADSHEET_ID = SPREADSHEET_ID;
        global.TELEGRAM_TOKEN = TELEGRAM_TOKEN;
        global.WEBHOOK_URL = WEBHOOK_URL;
        global.ADMIN_IDS = ADMIN_IDS;
        global.GROUP_CHAT_ID = GROUP_CHAT_ID;
        global.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
        global.DEFAULT_ALOKASI = DEFAULT_ALOKASI;
        global.TELEGRAM_MENUNGGU = TELEGRAM_MENUNGGU;
        global.TELEGRAM_AKTIF = TELEGRAM_AKTIF;
        global.TELEGRAM_DITOLAK = TELEGRAM_DITOLAK;
        global.TELEGRAM_DICABUT = TELEGRAM_DICABUT;
        global.ALOKASI_DEFAULT_KODE = ALOKASI_DEFAULT_KODE;
        global.SHEET_SETTING = SHEET_SETTING;
        global.SHEET_KELUARGA = SHEET_KELUARGA;
        global.SHEET_ANGGOTA = SHEET_ANGGOTA;
        global.SHEET_TARIF = SHEET_TARIF;
        global.SHEET_ALOKASI = SHEET_ALOKASI;
        global.SHEET_TAGIHAN = SHEET_TAGIHAN;
        global.SHEET_KAS = SHEET_KAS;
        global.SHEET_TUTUP_BUKU = SHEET_TUTUP_BUKU;
        global.SHEET_TUTUP_BUKU_ALOKASI = SHEET_TUTUP_BUKU_ALOKASI;
        global.SHEET_PENGUMUMAN = SHEET_PENGUMUMAN;
        global.SHEET_TELEGRAM_USER = SHEET_TELEGRAM_USER;
        global.SHEET_SCHEMA = SHEET_SCHEMA;
        global.SHEET_SKEMA = SHEET_SKEMA;
        global.SHEET_DATA = SHEET_DATA;
        global.TAGIHAN_BELUM = TAGIHAN_BELUM;
        global.TAGIHAN_LUNAS = TAGIHAN_LUNAS;
        global.TAGIHAN_BEBAS = TAGIHAN_BEBAS;
        global.TAGIHAN_BATAL = TAGIHAN_BATAL;
        global.JENIS_MASUK = JENIS_MASUK;
        global.JENIS_KELUAR = JENIS_KELUAR;
        global.JENIS_PINDAH_MASUK = JENIS_PINDAH_MASUK;
        global.JENIS_PINDAH_KELUAR = JENIS_PINDAH_KELUAR;
        global.CMD_START = CMD_START;
        global.CMD_KAS = CMD_KAS;
        global.CMD_TAMBAHKAS = CMD_TAMBAHKAS;
        global.CMD_PINDAHKAS = CMD_PINDAHKAS;
        global.CMD_WARGA = CMD_WARGA;
        global.CMD_TAMBAHWARGA = CMD_TAMBAHWARGA;
        global.CMD_TAMBAHKK = CMD_TAMBAHKK;
        global.CMD_TAMBAHANGGOTA = CMD_TAMBAHANGGOTA;
        global.CMD_EDITANGGOTA = CMD_EDITANGGOTA;
        global.CMD_ADMIN = CMD_ADMIN;
        global.CMD_PENGUMUMAN = CMD_PENGUMUMAN;
        global.CMD_BUATPENGUMUMAN = CMD_BUATPENGUMUMAN;
        global.CMD_SETTING = CMD_SETTING;
        global.CMD_SET = CMD_SET;
        global.CMD_TARIF = CMD_TARIF;
        global.CMD_ALOKASI = CMD_ALOKASI;
        global.CMD_TAGIHAN = CMD_TAGIHAN;
        global.CMD_BAYAR = CMD_BAYAR;
        global.CMD_TUNGGAKAN = CMD_TUNGGAKAN;
        global.CMD_REKAP = CMD_REKAP;
        global.CMD_DAFTAR = CMD_DAFTAR;
        global.CMD_TUTUPBUKU = CMD_TUTUPBUKU;
        global.CMD_GABUNG = CMD_GABUNG;
        global.CMD_SAYA = CMD_SAYA;
        global.CMD_UNTUKWARGA = CMD_UNTUKWARGA;
        global.CMD_UNTUKADMIN = CMD_UNTUKADMIN;
        global.CMD_SYSTEM = CMD_SYSTEM;
        global.CMD_VERIFIKASI = CMD_VERIFIKASI;
        global.CMD_TOLAK = CMD_TOLAK;
        global.CMD_CABUT = CMD_CABUT;
        global.CMD_CABUTKK = CMD_CABUTKK;
        global.PREFIX_HANDLERS = getPrefixHandlers();
        global.handleCommand = handleCommand;
        global.processItem = processItem;
    }
    const _exports = Object.assign({}, core || {}, user || {}, admin || {});
    Object.assign(_exports, {
        SPREADSHEET_ID, TELEGRAM_TOKEN, WEBHOOK_URL, GROUP_CHAT_ID,
        ADMIN_IDS,
        DEFAULT_SETTINGS, DEFAULT_ALOKASI,
        SHEET_SETTING, SHEET_KELUARGA, SHEET_ANGGOTA, SHEET_TARIF, SHEET_ALOKASI, SHEET_TAGIHAN, SHEET_KAS, SHEET_TUTUP_BUKU, SHEET_TUTUP_BUKU_ALOKASI, SHEET_PENGUMUMAN, SHEET_TELEGRAM_USER, SHEET_SCHEMA, SHEET_SKEMA, SHEET_DATA,
        CMD_START, CMD_KAS, CMD_TAMBAHKAS, CMD_PINDAHKAS, CMD_WARGA, CMD_TAMBAHWARGA, CMD_TAMBAHKK, CMD_TAMBAHANGGOTA, CMD_EDITANGGOTA, CMD_ADMIN, CMD_PENGUMUMAN, CMD_BUATPENGUMUMAN, CMD_SETTING, CMD_SET, CMD_TARIF, CMD_ALOKASI, CMD_TAGIHAN, CMD_BAYAR, CMD_TUNGGAKAN, CMD_REKAP, CMD_DAFTAR, CMD_TUTUPBUKU, CMD_GABUNG, CMD_SAYA, CMD_UNTUKWARGA, CMD_UNTUKADMIN, CMD_SYSTEM, CMD_VERIFIKASI, CMD_TOLAK, CMD_CABUT, CMD_CABUTKK,
        TAGIHAN_BELUM, TAGIHAN_LUNAS, TAGIHAN_BEBAS, TAGIHAN_BATAL,
        JENIS_MASUK, JENIS_KELUAR, JENIS_PINDAH_MASUK, JENIS_PINDAH_KELUAR,
        TELEGRAM_MENUNGGU, TELEGRAM_AKTIF, TELEGRAM_DITOLAK, TELEGRAM_DICABUT,
        ALOKASI_DEFAULT_KODE,
        PREFIX_HANDLERS: getPrefixHandlers(),
        handleCommand, processItem, doPost, doGet,
    });
    module.exports = _exports;
}

// ==========================================
// KONFIGURASI UTAMA
// ==========================================
const SPREADSHEET_ID = "";
const TELEGRAM_TOKEN = "";
const WEBHOOK_URL = ""; // Diisi setelah di-deploy

// Daftar ID Telegram pengurus inti (Admin) yang diizinkan input kas & pengumuman
// Cara cek ID Telegram bisa via bot @userinfobot
const ADMIN_IDS = [];

// ID Group Telegram warga RT untuk auto-broadcast pengumuman (opsional, jika tidak dipakai biarkan kosong "")
let GROUP_CHAT_ID = "";

const CMD_START = "/start";
const CMD_KAS = "/kas";
const CMD_TAMBAHKAS = "/tambahkas";
const CMD_WARGA = "/warga";
const CMD_ADMIN = "/admin";
const CMD_PENGUMUMAN = "/pengumuman";
const CMD_BUATPENGUMUMAN = "/buatpengumuman";

const PREFIX_HANDLERS = {
  [CMD_START]: handleStart,
  [CMD_ADMIN]: handleAdmin,
  [CMD_KAS]: handleKas,
  [CMD_TAMBAHKAS]: handleTambahKas,
  [CMD_WARGA]: handleWarga,
  [CMD_PENGUMUMAN]: handlePengumuman,
  [CMD_BUATPENGUMUMAN]: handleBuatPengumuman,
};

function isAdmin(userId) {
    return ADMIN_IDS.includes(String(userId));
}

// Helper untuk keperluan test/konfigurasi runtime
function setAdminIds(ids) {
    ADMIN_IDS.length = 0;
    if (Array.isArray(ids)) {
        ids.forEach((id) => ADMIN_IDS.push(String(id)));
    }
}

function setGroupChatId(id) {
    GROUP_CHAT_ID = id ? String(id) : "";
}

function getGroupChatId() {
    return GROUP_CHAT_ID;
}

// Idempotency sederhana berbasis update_id Telegram (cegah proses duplikat)
function getProcessedUpdateIds() {
    try {
        const raw = PropertiesService.getScriptProperties().getProperty("PROCESSED_UPDATE_IDS");
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveProcessedUpdateIds(ids) {
    try {
        PropertiesService.getScriptProperties().setProperty("PROCESSED_UPDATE_IDS", JSON.stringify(ids));
    } catch (e) {
        // ignore
    }
}

function isAckOnly() {
    try {
        return PropertiesService.getScriptProperties().getProperty("ACK_ONLY") === "true";
    } catch (e) {
        return false;
    }
}

function isProcessed(updateId) {
    if (updateId == null) return false;
    const ids = getProcessedUpdateIds();
    return ids.includes(String(updateId));
}

function markProcessed(updateId) {
    if (updateId == null) return;
    const ids = getProcessedUpdateIds();
    const key = String(updateId);
    if (!ids.includes(key)) {
        ids.push(key);
        if (ids.length > 200) {
            ids.splice(0, ids.length - 200);
        }
        saveProcessedUpdateIds(ids);
    }
}

function testLog() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName("warga");

    Logger.log(sheet.getName());
}

function testChat(e) {
    const data = JSON.parse(e.postData.contents);
    const chatId = data.message.chat.id;

    const url = "https://api.telegram.org/bot" + TELEGRAM_TOKEN + "/sendMessage";

    var text = data.message.text
    const nama = "testnama"
    if (data.message.text.startsWith("/start")) {
        text = "with */start* " + nama + "\nthis is new line";
    }

    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown"
    };

    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload)
    };

    const res = UrlFetchApp.fetch(url, options);
    Logger.log(res.getContentText());
}


function getWebhookInfo() {
    // https://api.telegram.org/bot${botToken}/getWebhookInfo
    // https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=true
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo`;
    const response = UrlFetchApp.fetch(url);
    Logger.log(response.getContentText());
    return response.getContentText();
}

function deleteWebhook(dropPending) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook?drop_pending_updates=${dropPending ? "true" : "false"}`;
    const response = UrlFetchApp.fetch(url);
    Logger.log(response.getContentText());
    return response.getContentText();
}

// 1. Fungsi untuk mendaftarkan Webhook Telegram secara otomatis
function setWebhook(dropPending) {
    let url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${WEBHOOK_URL}`;
    if (dropPending !== false) {
        url += `&drop_pending_updates=true`;
    }
    const response = UrlFetchApp.fetch(url);
    Logger.log(response.getContentText());
    return response.getContentText();
}

// 2. Fungsi utama yang menerima pesan masuk dari Telegram (Metode POST)
function doGet(e) {
    // Health check sederhana untuk uji URL webhook via browser
    return ContentService.createTextOutput("OK");
}

function doPost(e) {
    Logger.log("doPost invoked");
    const startTime = new Date().getTime();
    try {
        // Mode debug: hanya ACK 200 tanpa memproses (untuk uji webhook/pending)
        if (isAckOnly()) {
            Logger.log("ACK_ONLY mode: returning 200 ms=" + (new Date().getTime() - startTime));
            return ContentService.createTextOutput("OK");
        }

        const data = JSON.parse(e.postData.contents);

        const updateId = data && data.update_id;
        Logger.log("doPost start update_id=" + updateId);

        if (isProcessed(updateId)) {
            Logger.log("Duplicate update ignored: " + updateId + " ms=" + (new Date().getTime() - startTime));
            return ContentService.createTextOutput(JSON.stringify({ status: "success", duplicate: true }))
                .setMimeType(ContentService.MimeType.JSON);
        }
        markProcessed(updateId);

        if (data.message && data.message.text) {
            const chatId = data.message.chat.id;
            const userId = data.message.from.id;
            const text = data.message.text.trim();
            const senderName = data.message.from.first_name || "Warga";

            Logger.log('at here');
            handleCommand(chatId, text, senderName, userId);
        }

        Logger.log("doPost end update_id=" + updateId + " ms=" + (new Date().getTime() - startTime));
        return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        Logger.log("doPost error: " + error.toString() + " ms=" + (new Date().getTime() - startTime));
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function handleStart(chatId, text, senderName, userId) {
    const replyText = "Halo, *" + senderName + "*! Selamat datang di bot layanan warga **Pakrt** 🏠.\n\n" +
        "Silakan gunakan perintah berikut:\n" +
        "/kas - Cek posisi kas RT terakhir\n" +
        "/pengumuman - Lihat pengumuman warga terbaru\n" +
        "/warga - Cek jumlah warga terdaftar\n\n" +
        "_Perintah Pengurus:_\n" +
        "/tambahkas [masuk/keluar] [nominal] [keterangan]\n" +
        "/buatpengumuman [Kategori] [Isi pesan]";

    sendTelegramMessage(chatId, replyText);
}

function getSpreadsheet(name)
{
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(name);

    return sheet;
}

function handleKas(chatId, text, senderName, userId)
{
    let replyText = "";
    const sheet = getSpreadsheet("Kas");

    if (!sheet) {
        replyText = "⚠️ Tab 'Kas' belum dibuat di Google Sheets.";
    } else {
        const rows = sheet.getDataRange().getValues();
        if (rows.length <= 1) {
            replyText = "⚠️ Belum ada catatan transaksi kas yang dimasukkan.";
        } else {
            let totalMasuk = 0;
            let totalKeluar = 0;

            for (let i = 1; i < rows.length; i++) {
                let jenis = String(rows[i][2]).trim().toLowerCase();
                let nominal = Number(rows[i][3]) || 0;
                if (jenis === "masuk") totalMasuk += nominal;
                if (jenis === "keluar") totalKeluar += nominal;
            }

            let saldoAkhir = totalMasuk - totalKeluar;

            let transaksiTerakhirText = "\n\n📋 *3 Transaksi Terakhir:*\n";
            const startIdx = Math.max(1, rows.length - 3);
            for (let i = startIdx; i < rows.length; i++) {
                let tgl = new Date(rows[i][0]).toLocaleDateString('id-ID');
                let ket = rows[i][1];
                let jns = rows[i][2];
                let nom = Number(rows[i][3]) || 0;
                let tanda = jns.toLowerCase() === "masuk" ? "+" : "-";
                transaksiTerakhirText += `• ${tgl} | ${ket} (${tanda}Rp ${nom.toLocaleString('id-ID')})\n`;
            }

            replyText = `💰 *REKAPITULASI POSISI KAS RT*\n\n` +
                `📥 Total Pemasukan: *Rp ${totalMasuk.toLocaleString('id-ID')}*\n` +
                `📤 Total Pengeluaran: *Rp ${totalKeluar.toLocaleString('id-ID')}*\n` +
                `-----------------------------------\n` +
                `💎 *Saldo Kas Saat Ini: Rp ${saldoAkhir.toLocaleString('id-ID')}*` +
                transaksiTerakhirText;
        }
    }

    Logger.log('reply ' + replyText);

    sendTelegramMessage(chatId, replyText);
}

function handleWarga(chatId, text, senderName, userId)
{
    let replyText = "";
    const sheet = getSpreadsheet("Warga");
    const totalWarga = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
    replyText = `👥 Total warga terdaftar di sistem Pakrt: *${totalWarga} Kepala Keluarga*.`;

    sendTelegramMessage(chatId, replyText);
}

function handlePengumuman(chatId, text, senderName, userId)
{
    let replyText = "";
    const sheet = getSpreadsheet("Pengumuman");

    if (!sheet) {
        replyText = "⚠️ Tab 'Pengumuman' belum dibuat di Google Sheets.";
    } else {
        const rows = sheet.getDataRange().getValues();
        if (rows.length <= 1) {
            replyText = "📢 Belum ada pengumuman penting saat ini.";
        } else {
            replyText = `📢 *PENGUMUMAN WARGA TERBARU*\n\n`;
            const startIdx = Math.max(1, rows.length - 5);
            for (let i = rows.length - 1; i >= startIdx; i--) {
                let tgl = new Date(rows[i][0]).toLocaleDateString('id-ID');
                let kat = rows[i][1];
                let isi = rows[i][2];
                replyText += `▪️ *[${kat}]* (${tgl})\n${isi}\n\n`;
            }
        }
    }

    sendTelegramMessage(chatId, replyText);
}

function handleBuatPengumuman(chatId, text, senderName, userId)
{
    let replyText = "";

    if (!isAdmin(userId)) {
        sendTelegramMessage(chatId, "⛔ *Akses Ditolak!*\n\nPerintah ini khusus untuk Pengurus RT.");
        return;
    }

    const textClean = text.replace("/buatpengumuman", "").trim();
    const firstSpace = textClean.indexOf(" ");

    if (firstSpace === -1) {
        replyText = `⚠️ *Format Salah!*\nGunakan: \`/buatpengumuman [Kategori] [Isi Pesan]\``;
    } else {
        const kategori = textClean.substring(0, firstSpace).trim();
        const isiPesan = textClean.substring(firstSpace + 1).trim();

        const sheet = getSpreadsheet("Pengumuman");
        if (!sheet) {
            sendTelegramMessage(chatId, "⚠️ Tab 'Pengumuman' belum dibuat di Google Sheets.");
            return;
        }
        const timestamp = new Date();

        // Simpan ke Google Sheets
        sheet.appendRow([timestamp, kategori, isiPesan, senderName]);

        // Auto-broadcast ke grup warga jika ID grup diisi
        if (GROUP_CHAT_ID && GROUP_CHAT_ID !== "") {
            const broadcastText = `📢 *PENGUMUMAN RT*\n\n🏷️ Kategori: *${kategori}*\n📝 ${isiPesan}\n\n_Disampaikan oleh Pengurus_`;
            sendTelegramMessage(GROUP_CHAT_ID, broadcastText);
        }

        replyText = `✅ *Pengumuman Berhasil Disimpan & Disebar!*\n\n🏷️ Kategori: *${kategori}*\n📝 ${isiPesan}`;
    }

    sendTelegramMessage(chatId, replyText);
}

function handleTambahKas(chatId, text, senderName, userId)
{
    let replyText = "";

    if (!isAdmin(userId)) { 
        sendTelegramMessage(chatId, "⛔ *Akses Ditolak!*\n\nPerintah ini khusus untuk Bendahara atau Pengurus RT.");
        return;
    }

    const textClean = text.replace("/tambahkas", "").trim();
    const firstSpace = textClean.indexOf(" ");

    if (firstSpace === -1) {
        replyText = `⚠️ *Format Salah!*\nGunakan: \`/tambahkas [masuk/keluar] [nominal] [keterangan]\``;
    } else {
        const jenis = textClean.substring(0, firstSpace).toLowerCase();
        const sisaText = textClean.substring(firstSpace + 1).trim();
        const secondSpace = sisaText.indexOf(" ");

        let nominalStr = secondSpace === -1 ? sisaText : sisaText.substring(0, secondSpace);
        let keterangan = secondSpace === -1 ? "Tanpa Keterangan" : sisaText.substring(secondSpace + 1).trim();
        const nominal = Number(nominalStr);

        if (jenis !== "masuk" && jenis !== "keluar" || isNaN(nominal) || nominal <= 0) {
            replyText = `⚠️ Format salah atau nominal bukan angka.\nContoh: \`/tambahkas masuk 50000 Iuran Budi\``;
        } else {
            const sheet = getSpreadsheet("Kas");
            if (!sheet) {
                sendTelegramMessage(chatId, "⚠️ Tab 'Kas' belum dibuat di Google Sheets.");
                return;
            }
            const tanggalHariIni = new Date();

            sheet.appendRow([tanggalHariIni, keterangan, jenis.charAt(0).toUpperCase() + jenis.slice(1), nominal]);

            const emoji = jenis === "masuk" ? "📥" : "📤";
            replyText = `✅ *Kas Berhasil Dicatat!*\n\n${emoji} Jenis: *${jenis.toUpperCase()}*\n💰 Nominal: *Rp ${nominal.toLocaleString('id-ID')}*\n📝 Keterangan: *${keterangan}*`;
        }
    }

    sendTelegramMessage(chatId, replyText);
}

function handleAdmin(chatId, text, senderName, userId)
{
    sendTelegramMessage(chatId, 'Fungsi Admin Belum Berfungsi');
}

// 3. Logika Perintah Bot (Command Handling)
function handleCommand(chatId, text, senderName, userId) {
    if (!chatId) {
        Logger.log("Error: " + 'chatId is empty');
        return ContentService.createTextOutput(JSON.stringify({ status: "failed" }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    let replyText = "";

    processItem(chatId, text, senderName, userId);
}

function processItem(chatId, text, senderName, userId) {
  const cleanText = String(text).trim();
  
  // Find the matching prefix (case-insensitive)
  const matchedPrefix = Object.keys(PREFIX_HANDLERS).find(prefix => 
    cleanText.toUpperCase().startsWith(prefix.toUpperCase())
  );

  if (matchedPrefix) {
    // Execute the matched function and pass the text
    PREFIX_HANDLERS[matchedPrefix](chatId, cleanText, senderName, userId);
  } else {
    Logger.log(`No matching action for: ${cleanText}`);
  }
}

// 4. Fungsi pembantu untuk mengirim pesan ke Telegram
function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown"
    };

    const options = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload)
    };

    try {
        const res = UrlFetchApp.fetch(url, options);
        // delete pending
        setWebhook(true);
        Logger.log(res.getContentText());
    } catch (error) {
        Logger.log("Error: " + error.toString());
        Logger.log(payload);
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ==========================================
// POLLING (alternatif webhook)
// ==========================================
function pollTelegram() {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        Logger.log("pollTelegram: could not acquire lock");
        return;
    }
    try {
        const props = PropertiesService.getScriptProperties();
        const lastId = Number(props.getProperty("LAST_UPDATE_ID") || 0);
        const offset = lastId > 0 ? lastId + 1 : 0;

        const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${offset}&timeout=5`;
        const res = UrlFetchApp.fetch(url);
        const data = JSON.parse(res.getContentText());

        if (!data || !data.ok) {
            Logger.log("pollTelegram getUpdates error: " + res.getContentText());
            return;
        }

        const updates = data.result || [];
        let maxId = lastId;

        updates.forEach((u) => {
            if (u.update_id > maxId) maxId = u.update_id;

            if (u.message && u.message.text) {
                const chatId = u.message.chat.id;
                const userId = u.message.from.id;
                const text = String(u.message.text).trim();
                const senderName = (u.message.from && u.message.from.first_name) || "Warga";
                handleCommand(chatId, text, senderName, userId);
                markProcessed(u.update_id);
            }
        });

        if (maxId > lastId) {
            props.setProperty("LAST_UPDATE_ID", String(maxId));
        }

        Logger.log("pollTelegram processed " + updates.length + " updates");
    } catch (e) {
        Logger.log("pollTelegram error: " + e.toString());
    } finally {
        lock.releaseLock();
    }
}

function setupPollingTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach((t) => {
        if (t.getHandlerFunction && t.getHandlerFunction() === "pollTelegram") {
            ScriptApp.deleteTrigger(t);
        }
    });

    ScriptApp.newTrigger("pollTelegram").timeBased().everyMinutes(1).create();

    try {
        deleteWebhook(true);
    } catch (e) {
        Logger.log("setupPollingTrigger deleteWebhook error: " + e.toString());
    }

    Logger.log("Polling trigger created (every 1 minute)");
}

function stopPollingTrigger() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach((t) => {
        if (t.getHandlerFunction && t.getHandlerFunction() === "pollTelegram") {
            ScriptApp.deleteTrigger(t);
        }
    });
    Logger.log("Polling trigger removed");
}

// Ekspos fungsi ke lingkungan Node (Jest) tanpa memengaruhi Google Apps Script
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        SPREADSHEET_ID,
        TELEGRAM_TOKEN,
        WEBHOOK_URL,
        GROUP_CHAT_ID,
        CMD_START,
        CMD_KAS,
        CMD_TAMBAHKAS,
        CMD_WARGA,
        CMD_ADMIN,
        CMD_PENGUMUMAN,
        CMD_BUATPENGUMUMAN,
        ADMIN_IDS,
        isAdmin,
        setAdminIds,
        setGroupChatId,
        getGroupChatId,
        getProcessedUpdateIds,
        isAckOnly,
        isProcessed,
        markProcessed,
        deleteWebhook,
        setWebhook,
        pollTelegram,
        setupPollingTrigger,
        stopPollingTrigger,
        getSpreadsheet,
        handleStart,
        handleKas,
        handleWarga,
        handlePengumuman,
        handleBuatPengumuman,
        handleTambahKas,
        handleAdmin,
        handleCommand,
        doPost,
        processItem,
        sendTelegramMessage,
        PREFIX_HANDLERS,
    };
}

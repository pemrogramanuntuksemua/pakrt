// ==========================================
// KONFIGURASI UTAMA
// ==========================================
const SPREADSHEET_ID = "";
const TELEGRAM_TOKEN = "";
const WEBHOOK_URL = ""; // Diisi setelah di-deploy

const CMD_START = "/start";
const CMD_KAS = "/kas";
const CMD_TAMBAHKAS = "/tambahkas";
const CMD_WARGA = "/warga";
const CMD_TAMBAHWARGA = "/tambahwarga";
const CMD_ADMIN = "/admin";
const CMD_PENGUMUMAN = "/pengumuman";
const CMD_BUATPENGUMUMAN = "/buatpengumuman";

// Daftar ID Telegram pengurus inti (Admin)
const ADMIN_IDS = [];

// ID Group Telegram warga RT untuk auto-broadcast pengumuman (opsional)
let GROUP_CHAT_ID = "";

const _G = (typeof global !== "undefined") ? global : (typeof globalThis !== "undefined" ? globalThis : this);

let PREFIX_HANDLERS = null;

function getPrefixHandlers() {
    if (!PREFIX_HANDLERS) {
        PREFIX_HANDLERS = {
            [CMD_START]: _G.handleStart,
            [CMD_ADMIN]: _G.handleAdmin,
            [CMD_KAS]: _G.handleKas,
            [CMD_TAMBAHKAS]: _G.handleTambahKas,
            [CMD_WARGA]: _G.handleWarga,
            [CMD_TAMBAHWARGA]: _G.handleTambahWarga,
            [CMD_PENGUMUMAN]: _G.handlePengumuman,
            [CMD_BUATPENGUMUMAN]: _G.handleBuatPengumuman,
        };
    }
    return PREFIX_HANDLERS;
}

function isAdminSafe() { return (typeof isAdmin === "function") ? isAdmin : null; }

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

    const handlers = getPrefixHandlers();
    const matchedPrefix = Object.keys(handlers).find(prefix =>
        cleanText.toUpperCase().startsWith(prefix.toUpperCase())
    );

    if (matchedPrefix) {
        handlers[matchedPrefix](chatId, cleanText, senderName, userId);
    } else {
        Logger.log(`No matching action for: ${cleanText}`);
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

    var text = data.message.text;
    const nama = "testnama";
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
            Logger.log("Duplicate update ignored: " + updateId + " ms=" + (new Date().getTime() - startTime));
            return HtmlService.createHtmlOutput("OK");
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
        return HtmlService.createHtmlOutput("OK");

    } catch (error) {
        Logger.log("doPost error: " + error.toString() + " ms=" + (new Date().getTime() - startTime));
        return HtmlService.createHtmlOutput("Error: " + error.toString());
    }
}

function doGet(e) {
    return HtmlService.createHtmlOutput("OK");
}

// Node/Jest compatibility
if (typeof module !== "undefined" && module.exports) {
    const core = (typeof require !== "undefined") ? require("./core.gs") : null;
    const user = (typeof require !== "undefined") ? require("./userHandlers.gs") : null;
    const admin = (typeof require !== "undefined") ? require("./adminHandlers.gs") : null;
    if (core) Object.keys(core).forEach((k) => { if (typeof global !== "undefined") global[k] = core[k]; });
    if (user) Object.keys(user).forEach((k) => { if (typeof global !== "undefined") global[k] = user[k]; });
    if (admin) Object.keys(admin).forEach((k) => { if (typeof global !== "undefined") global[k] = admin[k]; });

    // expose constants/globals for dependent modules
    if (typeof global !== "undefined") {
        global.SPREADSHEET_ID = SPREADSHEET_ID;
        global.TELEGRAM_TOKEN = TELEGRAM_TOKEN;
        global.WEBHOOK_URL = WEBHOOK_URL;
        global.ADMIN_IDS = ADMIN_IDS;
        global.GROUP_CHAT_ID = GROUP_CHAT_ID;
        global.CMD_START = CMD_START;
        global.CMD_KAS = CMD_KAS;
        global.CMD_TAMBAHKAS = CMD_TAMBAHKAS;
        global.CMD_WARGA = CMD_WARGA;
        global.CMD_TAMBAHWARGA = CMD_TAMBAHWARGA;
        global.CMD_ADMIN = CMD_ADMIN;
        global.CMD_PENGUMUMAN = CMD_PENGUMUMAN;
        global.CMD_BUATPENGUMUMAN = CMD_BUATPENGUMUMAN;
        global.PREFIX_HANDLERS = getPrefixHandlers();
        global.handleCommand = handleCommand;
        global.processItem = processItem;
    }

    module.exports = {
        SPREADSHEET_ID, TELEGRAM_TOKEN, WEBHOOK_URL, GROUP_CHAT_ID,
        CMD_START, CMD_KAS, CMD_TAMBAHKAS, CMD_WARGA, CMD_TAMBAHWARGA, CMD_ADMIN, CMD_PENGUMUMAN, CMD_BUATPENGUMUMAN,
        ADMIN_IDS,
        isAdmin: (typeof global !== "undefined" && global.isAdmin) ? global.isAdmin : null,
        setAdminIds: (typeof global !== "undefined" && global.setAdminIds) ? global.setAdminIds : null,
        setGroupChatId: (typeof global !== "undefined" && global.setGroupChatId) ? global.setGroupChatId : null,
        getGroupChatId: (typeof global !== "undefined" && global.getGroupChatId) ? global.getGroupChatId : null,
        getSpreadsheet: (typeof global !== "undefined" && global.getSpreadsheet) ? global.getSpreadsheet : null,
        handleStart: (typeof global !== "undefined" && global.handleStart) ? global.handleStart : null,
        handleKas: (typeof global !== "undefined" && global.handleKas) ? global.handleKas : null,
        handleWarga: (typeof global !== "undefined" && global.handleWarga) ? global.handleWarga : null,
        handlePengumuman: (typeof global !== "undefined" && global.handlePengumuman) ? global.handlePengumuman : null,
        handleTambahKas: (typeof global !== "undefined" && global.handleTambahKas) ? global.handleTambahKas : null,
        handleTambahWarga: (typeof global !== "undefined" && global.handleTambahWarga) ? global.handleTambahWarga : null,
        handleBuatPengumuman: (typeof global !== "undefined" && global.handleBuatPengumuman) ? global.handleBuatPengumuman : null,
        handleAdmin: (typeof global !== "undefined" && global.handleAdmin) ? global.handleAdmin : null,
        handleCommand, processItem, doPost, doGet,
        testLog, testChat,
        isAckOnly: (typeof global !== "undefined" && global.isAckOnly) ? global.isAckOnly : null,
        isProcessed: (typeof global !== "undefined" && global.isProcessed) ? global.isProcessed : null,
        markProcessed: (typeof global !== "undefined" && global.markProcessed) ? global.markProcessed : null,
        pollTelegram: (typeof global !== "undefined" && global.pollTelegram) ? global.pollTelegram : null,
        setupPollingTrigger: (typeof global !== "undefined" && global.setupPollingTrigger) ? global.setupPollingTrigger : null,
        stopPollingTrigger: (typeof global !== "undefined" && global.stopPollingTrigger) ? global.stopPollingTrigger : null,
        PREFIX_HANDLERS,
    };
}

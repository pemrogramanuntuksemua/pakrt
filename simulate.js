const fs = require("fs");
const path = require("path");

// Mock GAS globals
const propsStore = {};
global.PropertiesService = {
  getScriptProperties: () => ({
    getProperty: (k) => (Object.prototype.hasOwnProperty.call(propsStore, k) ? propsStore[k] : null),
    setProperty: (k, v) => { propsStore[k] = v; },
  }),
};
global.LockService = {
  getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
};
global.ScriptApp = {
  getProjectTriggers: () => [],
  newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create: () => ({}) }) }) }),
  deleteTrigger: () => {},
};
global.Logger = { log: (x) => console.log("[LOG]", x) };

const __cacheStore = {};
global.CacheService = {
  getScriptCache: () => ({
    get: (k) => (Object.prototype.hasOwnProperty.call(__cacheStore, k) ? __cacheStore[k] : null),
    put: (k, v, ttl) => { __cacheStore[k] = v; },
    remove: (k) => { delete __cacheStore[k]; },
  }),
};

function ensureCell(data, rowIdx, colIdx) {
  while (data.length <= rowIdx) data.push([]);
  const row = data[rowIdx];
  while (row.length <= colIdx) row.push("");
}

function buatSheetMock(rows, nama) {
  const data = (rows || []).map((r) => r.slice());
  const appended = [];
  const sheet = {
    _name: nama,
    getName: () => sheet._name,
    setName: (namaBaru) => {
      sheet._name = namaBaru;
      return sheet;
    },
    getDataRange: () => ({ getValues: () => data.map((r) => r.slice()) }),
    getLastRow: () => data.length,
    getLastColumn: () => data.reduce((max, r) => Math.max(max, r.length), 0),
    appendRow: (row) => {
      const copy = row.slice();
      appended.push(copy);
      data.push(copy);
    },
    clear: () => {
      data.length = 0;
    },
    getRange: (row, col, numRows, numCols) => {
      const nRows = numRows || 1;
      const nCols = numCols || 1;
      const range = {
        getValues: () => {
          const out = [];
          for (let r = 0; r < nRows; r++) {
            const line = [];
            for (let c = 0; c < nCols; c++) {
              const src = data[row - 1 + r] || [];
              line.push(src[col - 1 + c]);
            }
            out.push(line);
          }
          return out;
        },
        setValue: (value) => {
          ensureCell(data, row - 1, col - 1);
          data[row - 1][col - 1] = value;
        },
        setValues: (values) => {
          (values || []).forEach((line, r) => {
            (line || []).forEach((value, c) => {
              ensureCell(data, row - 1 + r, col - 1 + c);
              data[row - 1 + r][col - 1 + c] = value;
            });
          });
        },
        setFontWeight: () => range,
        setBackground: () => range,
        setNumberFormat: () => range,
        setDataValidation: () => range,
        setHorizontalAlignment: () => range,
      };
      return range;
    },
    setFrozenRows: () => {},
    setColumnWidth: () => {},
    autoResizeColumns: () => {},
    protect: () => ({
      setDescription: () => ({}),
      setWarningOnly: () => ({}),
    }),
    _appended: appended,
    _data: data,
  };
  return sheet;
}

// Load sample data
const dataPath = path.join(__dirname, "simulate-data.json");
const sampleData = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, "utf8")) : {};
const kunciConfig = ["ADMIN_IDS", "BOT_USERNAME", "GROUP_CHAT_ID"];

const sheets = {};
Object.keys(sampleData).forEach((name) => {
  if (kunciConfig.indexOf(name) >= 0 || !Array.isArray(sampleData[name])) return;
  sheets[name] = buatSheetMock(sampleData[name], name);
});

const spreadsheet = {
  getId: () => "simulate-spreadsheet",
  getSheetByName: (name) => (Object.prototype.hasOwnProperty.call(sheets, name) ? sheets[name] : null),
  getSheets: () => Object.keys(sheets).map((name) => sheets[name]),
  insertSheet: (name) => {
    sheets[name] = buatSheetMock([], name);
    return sheets[name];
  },
  deleteSheet: (sheet) => {
    const name = typeof sheet === "string" ? sheet : sheet.getName();
    delete sheets[name];
  },
  setSpreadsheetTimeZone: () => {},
  setLocale: () => {},
};

global.SpreadsheetApp = {
  openById: () => spreadsheet,
  insertSheet: (name) => spreadsheet.insertSheet(name),
  newDataValidation: () => {
    const rule = {
      requireValueInList: () => rule,
      setAllowInvalid: () => rule,
      build: () => ({}),
    };
    return rule;
  },
  Protection: { WarningOnly: "WARNING_ONLY" },
};

// Capture Telegram sendMessage payloads
const sent = [];
const botUsername = process.env.BOT_USERNAME || (sampleData.BOT_USERNAME || "pakrt_bot");
global.UrlFetchApp = {
  fetch: (url, options) => {
    if (String(url).includes("/getMe")) {
      return { getContentText: () => JSON.stringify({ ok: true, result: { username: botUsername } }) };
    }
    if (options && options.payload) {
      try { sent.push(JSON.parse(options.payload)); } catch (e) { sent.push(options.payload); }
    } else {
      console.log("[FETCH]", url);
    }
    return { getContentText: () => JSON.stringify({ ok: true, result: [] }) };
  },
};
global.ContentService = {
  createTextOutput: (text) => ({ _text: text, setMimeType: () => ({ _text: text }) }),
  MimeType: { JSON: "application/json", HTML: "text/html" },
};
global.HtmlService = { createHtmlOutput: (text) => ({ _text: text }) };

// Load app
const pakrt = require("./main.gs");

// Apply admin config from simulate data / env
const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(",") : (sampleData.ADMIN_IDS || []);
pakrt.setAdminIds(adminIds);
if (sampleData.GROUP_CHAT_ID) pakrt.setGroupChatId(sampleData.GROUP_CHAT_ID);

// Parse CLI args. Flag --init menjalankan initSheets() sebelum perintah Telegram.
const args = process.argv.slice(2).filter((a) => a !== "--init");
const jalankanInit = process.argv.indexOf("--init") >= 0;
const text = args[0] || "/start";
const chatId = Number(args[1] || 12345);
const userId = Number(args[2] || 777777);
const name = args[3] || "Bre";

if (jalankanInit) {
  global.SPREADSHEET_ID = process.env.SPREADSHEET_ID || "simulate";
  console.log("=== INIT SHEETS ===");
  console.log(JSON.stringify(pakrt.initSheets(), null, 2));
}

const event = {
  postData: {
    contents: JSON.stringify({
      update_id: Date.now(),
      message: { chat: { id: chatId }, from: { id: userId, first_name: name }, text },
    }),
  },
};

console.log("=== SIMULATE ===");
console.log("Input:", text);
pakrt.doPost(event);

console.log("\n=== PESAN TERKIRIM ===");
sent.forEach((p, i) => {
  console.log(`--- ${i + 1} ---`);
  console.log("chat_id:", p.chat_id);
  console.log(p.text);
});

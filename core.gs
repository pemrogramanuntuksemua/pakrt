// ==========================================
// CORE / INFRASTRUKTUR BERSAMA
// ==========================================

function isAdmin(userId) {
    return ADMIN_IDS.includes(String(userId));
}

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

function getSpreadsheet(name) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(name);
    return sheet;
}

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
        Logger.log(res.getContentText());
    } catch (error) {
        Logger.log("Error: " + error.toString());
        Logger.log(payload);
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function isAckOnly() {
    try {
        return PropertiesService.getScriptProperties().getProperty("ACK_ONLY") === "true";
    } catch (e) {
        return false;
    }
}

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

function getWebhookInfo() {
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

function setWebhook(dropPending) {
    let url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${WEBHOOK_URL}`;
    if (dropPending !== false) {
        url += `&drop_pending_updates=true`;
    }
    const response = UrlFetchApp.fetch(url);
    Logger.log(response.getContentText());
    return response.getContentText();
}

function setWebhookUrl(customUrl, dropPending) {
    let url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${customUrl}`;
    if (dropPending) {
        url += `&drop_pending_updates=true`;
    }
    const response = UrlFetchApp.fetch(url);
    Logger.log(response.getContentText());
    return response.getContentText();
}

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

// Node/Jest compatibility
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        isAdmin, setAdminIds, setGroupChatId, getGroupChatId,
        getSpreadsheet, sendTelegramMessage,
        isAckOnly, getProcessedUpdateIds, saveProcessedUpdateIds, isProcessed, markProcessed,
        getWebhookInfo, deleteWebhook, setWebhook, setWebhookUrl,
        pollTelegram, setupPollingTrigger, stopPollingTrigger,
    };
}

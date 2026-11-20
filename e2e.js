// Script E2E sederhana: kirim update Telegram simulasi ke webhook bot.
// Jalankan: node e2e.js [chatId] [userId] [nama]
// Butuh env WEBHOOK_URL (URL Web App /exec).

const webhook = process.env.WEBHOOK_URL;
const chatId = Number(process.argv[2] || 1);
const userId = Number(process.argv[3] || 1);
const nama = process.argv[4] || "Tester";

if (!webhook) {
  console.log("Set env WEBHOOK_URL terlebih dahulu.");
  console.log("Contoh: WEBHOOK_URL=https://script.google.com/.../exec node e2e.js 123 123 Tester");
  process.exit(1);
}

const payload = {
  update_id: Date.now(),
  message: {
    chat: { id: chatId },
    from: { id: userId, first_name: nama },
    text: "/start",
  },
};

fetch(webhook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
})
  .then((r) => r.text())
  .then((t) => console.log("Response:", t))
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  });